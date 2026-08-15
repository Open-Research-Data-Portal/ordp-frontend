import { useState } from "react";
import * as datasetsApi from "./datasetsApi";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

// Backend only records the file_type values it can validate
// (see apps/datasets/services/file_validation.py).
const KNOWN_FILE_TYPES = new Set([
  "csv", "tsv",
  "json", "jsonl",
  "xlsx", "xls",
  "parquet",
  "jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "tif",
]);

// File types that represent tabular/structured data, where column_count,
// feature_names, and item_count are meaningful. For everything else
// (images, etc.) these fields should not be sent.
const STRUCTURED_FILE_TYPES = new Set(["csv", "tsv", "json", "jsonl", "xlsx", "xls", "parquet"]);

function deriveFileType(fileName) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  return KNOWN_FILE_TYPES.has(ext) ? ext : "csv";
}

// Parses a form field into a non-negative integer, or undefined if it's
// empty/invalid. Prevents stale/garbage values (e.g. "-20") from ever
// reaching the API.
function parseNonNegativeInt(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.trunc(n);
}

export default function useDatasetSubmission() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ details: {}, metadata: {}, upload: {}, policy: {} });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const goToPreviousStep = () => setStep((s) => Math.max(s - 1, 1));

  const goToNextStep = (stepKey, data) => {
    setFormData((prev) => ({ ...prev, [stepKey]: data }));
    setStep((s) => Math.min(s + 1, 4));
  };

  // Step 1 only stores the details locally.
  // The backend dataset shell is deliberately NOT created here — it is created
  // by upload/init/ inside submitDataset() when the user actually submits.
  const submitDetails = async (detailsData) => {
    setSubmitError(null);
    setFormData((prev) => ({ ...prev, details: detailsData }));
    setStep(2);
  };

  const uploadFileInChunks = async (file, sessionId) => {
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    for (let i = 0; i < totalChunks; i++) {
      const blob = file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size));
      await datasetsApi.uploadChunk(sessionId, i, blob);
    }
  };

  const submitDataset = async (policyData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Store policy data
      setFormData((prev) => ({ ...prev, policy: policyData }));

      const details = formData.details || {};
      const metadata = formData.metadata || {};
      const files = (formData.upload?.files || []).filter((entry) => entry.file);
      // Every dataset is visible to all users. "access" controls whether the
      // file itself can be downloaded directly (public) or requires the
      // author's consent (private). Defaults to public.
      const access = formData.upload?.access || "public";
      if (!details.title?.trim()) {
        throw new Error("Dataset title is required before submitting.");
      }

      // Backend architecture is one upload session per file (finalize_upload
      // consumes the whole session dir), so enforce a single file per submission.
      if (files.length > 1) {
        throw new Error("Only a single file can be uploaded per submission. Please remove extra files and try again.");
      }

      // 1. Create the draft Dataset shell + open the upload session NOW (not at step 1).
      const initResult = await datasetsApi.initUpload({
        title: details.title,
        access,
      });
      const datasetId = initResult.dataset_id;
      const uploadSessionId = initResult.upload_session_id;

      // 2. Attach metadata (backend contract needs category_id/other_category,
      // description, subject, keywords, sponsor_or_grant, language, author_id,
      // co_authors).
      const metadataPayload = {
        category_id: metadata.category_id || undefined,
        other_category: metadata.other_category || undefined,
        description: details.description || metadata.description || "",
        subject: metadata.subject_id || undefined,
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
        sponsor_or_grant: metadata.sponsorOrGrant || "",
        language: details.language || "",
        author_id: details.authorId || undefined,
        co_authors: Array.isArray(details.coAuthors) ? details.coAuthors : [],
      };
      await datasetsApi.attachMetadata(datasetId, metadataPayload);

      // 3. Upload file chunks + assemble them.
      const entry = files[0];
      if (entry) {
        const fileType = entry.fileType || deriveFileType(entry.file.name);
        const isStructuredFileType = STRUCTURED_FILE_TYPES.has(fileType);

        // Only send column/feature/item metadata for structured (tabular) file
        // types. Sending these for images, etc. either has no meaning or, if the
        // form still has stale/leftover values, can violate backend constraints
        // (e.g. a negative column_count).
        const featureNames = isStructuredFileType && Array.isArray(metadata.variables)
          ? metadata.variables.map((v) => (typeof v === "string" ? v : v?.name)).filter(Boolean)
          : undefined;
        const columnCount = isStructuredFileType ? parseNonNegativeInt(metadata.numFeatures) : undefined;
        const itemCount = isStructuredFileType ? parseNonNegativeInt(metadata.numInstances) : undefined;

        await uploadFileInChunks(entry.file, uploadSessionId);
        await datasetsApi.completeUpload(uploadSessionId, {
          datasetId,
          filename: entry.file.name,
          fileType,
          isStructured: isStructuredFileType && metadata.includesHeaderRow !== false,
          columnCount,
          featureNames,
          itemCount,
        });
      }

      // 4. Submit for review — unless this is a "Save as Draft" action.
      let result = null;
      let status = "draft";
      if (!policyData.isDraft) {
        const termsAccepted =
          Boolean(policyData.ownership) &&
          Boolean(policyData.piiRemoval) &&
          Boolean(policyData.licenseConsent);
        result = await datasetsApi.submitDataset(datasetId, termsAccepted);
        status = "pending";
      }

      // Build a friendly summary for the success page
      const totalSize = files.reduce((sum, f) => sum + (f.file.size || 0), 0);
      return {
        id: datasetId,
        title: details.title,
        fileCount: files.length,
        totalSize: formatBytes(totalSize),
        category: metadata.categoryName || "—",
        access,
        doi: result?.doi || "Pending",
        status,
        isDraft: status === "draft",
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 401) {
        setSubmitError(detail || "Your session has expired. Please sign in again.");
      } else if (status === 403) {
        setSubmitError(detail || "You do not have permission to submit this dataset.");
      } else if (detail) {
        setSubmitError(detail);
      } else if (err.message) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Couldn't submit the dataset. Please try again.");
      }
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step, formData,
    goToNextStep, goToPreviousStep, submitDetails, submitDataset,
    isSubmitting, submitError,
  };
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) { value /= 1024; unitIndex++; }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}