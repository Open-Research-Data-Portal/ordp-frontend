import { useState } from "react";
import * as datasetsApi from "./datasetsApi";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

// File types the backend can validate
// (see apps/datasets/services/file_validation.py).
const KNOWN_FILE_TYPES = new Set([
  "csv", "tsv",
  "json", "jsonl",
  "xlsx", "xls",
  "parquet",
  "jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "tif",
  "heic", "heif", "avif",  // modern image formats
]);

// Browser MIME type -> backend file_type string.
// Used as the primary signal when the extension alone is ambiguous.
const MIME_TO_FILE_TYPE = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/gif":  "gif",
  "image/bmp":  "bmp",
  "image/webp": "webp",
  "image/tiff": "tiff",
  "image/heic": "heic",
  "image/heif": "heic",
  "image/avif": "avif",
  "text/csv":   "csv",
  "text/tab-separated-values": "tsv",
  "application/json": "json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/x-parquet": "parquet",
};

// File types that represent tabular/structured data, where column_count,
// feature_names, and item_count are meaningful. For everything else
// (images, etc.) these fields should not be sent.
const STRUCTURED_FILE_TYPES = new Set(["csv", "tsv", "json", "jsonl", "xlsx", "xls", "parquet"]);

/**
 * Derives the backend file_type string from a File object.
 * Priority: MIME type > file extension > raw extension as-is.
 * Never falls back to "csv" -- that caused binary files to be
 * validated as UTF-8 text and produced a confusing error.
 */
function deriveFileType(file) {
  // 1. MIME type is the most reliable signal (set by the browser/OS).
  const mimeType = file.type || "";
  if (mimeType && MIME_TO_FILE_TYPE[mimeType]) {
    return MIME_TO_FILE_TYPE[mimeType];
  }
  // 2. Fall back to the file extension.
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (KNOWN_FILE_TYPES.has(ext)) return ext;
  // 3. Return the raw extension so the backend gives a clear
  //    "unsupported type" error instead of a misleading CSV error.
  return ext || "unknown";
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

function extractError(err) {
  const status = err.response?.status;
  const detail = err.response?.data?.detail;
  if (status === 401) return detail || "Your session has expired. Please sign in again.";
  if (status === 403) return detail || "You do not have permission to perform this action.";
  if (detail) return detail;
  if (err.message) return err.message;
  return "Something went wrong. Please try again.";
}

async function uploadFileInChunks(file, sessionId) {
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  for (let i = 0; i < totalChunks; i++) {
    const blob = file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size));
    await datasetsApi.uploadChunk(sessionId, i, blob);
  }
}

export default function useDatasetSubmission() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ details: {}, metadata: {}, upload: {}, policy: {} });
  const [datasetId, setDatasetId] = useState(null);
  const [uploadSessionId, setUploadSessionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const goToPreviousStep = () => {
    setSubmitError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  // Step 1: create dataset shell (or update title if revisiting).
  const submitDetails = async (detailsData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let did = datasetId;
      let sid = uploadSessionId;
      if (!did) {
        const r = await datasetsApi.initUpload({ title: detailsData.title, visibility: "restricted" });
        did = r.dataset_id;
        sid = r.upload_session_id;
        setDatasetId(did);
        setUploadSessionId(sid);
      } else {
        await datasetsApi.updateDataset(did, { title: detailsData.title });
      }
      setFormData((prev) => ({ ...prev, details: detailsData }));
      setStep(2);
    } catch (err) {
      setSubmitError(extractError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: attach metadata + set languages.
  const submitMetadata = async (metadataData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const details = formData.details;
      const metadataPayload = {
        category_id: metadataData.category_id || undefined,
        other_category: metadataData.other_category || undefined,
        description: details.description || "",
        subject: metadataData.subject_id || undefined,
        keywords: Array.isArray(metadataData.keywords) ? metadataData.keywords : [],
        related_resources: Array.isArray(details.relatedResources) ? details.relatedResources : [],
        geographic_coverage: details.geographicCoverage || "",
        temporal_coverage: details.temporalCoverage || "",
        instances_represent: metadataData.instancesRepresent || "",
        collection_method: metadataData.collectionMethod || "",
        recommended_splits: metadataData.recommendedSplits || "",
      };
      await datasetsApi.attachMetadata(datasetId, metadataPayload);
      await datasetsApi.setDatasetLanguages(datasetId, {
        other_languages: [details.language || "English"],
      });
      setFormData((prev) => ({ ...prev, metadata: metadataData }));
      setStep(3);
    } catch (err) {
      setSubmitError(extractError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: set visibility, upload thumbnail + file.
  const submitUpload = async (uploadData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await datasetsApi.updateDataset(datasetId, { visibility: uploadData.access || "restricted" });

      if (uploadData.thumbnail) {
        try {
          await datasetsApi.uploadThumbnail(datasetId, uploadData.thumbnail);
        } catch (e) {
          console.warn("Thumbnail upload failed (non-fatal):", e);
        }
      }

      const files = (uploadData.files || []).filter((e) => e.file);
      if (files.length > 1) {
        throw new Error("Only a single file can be uploaded per submission. Please remove extra files.");
      }

      if (files.length === 1) {
        const entry = files[0];
        const fileType = entry.fileType || deriveFileType(entry.file);
        const isStructuredFileType = STRUCTURED_FILE_TYPES.has(fileType);
        const metadata = formData.metadata || {};
        const isTabular =
          Array.isArray(metadata.characteristics) &&
          metadata.characteristics.includes("Tabular");
        const featureNames =
          isStructuredFileType && isTabular && Array.isArray(metadata.variables)
            ? metadata.variables
                .map((v) => (typeof v === "string" ? v : v?.name))
                .filter(Boolean)
            : undefined;
        const columnCount =
          isStructuredFileType && isTabular
            ? parseNonNegativeInt(metadata.numFeatures)
            : undefined;
        const itemCount =
          isStructuredFileType && isTabular
            ? parseNonNegativeInt(metadata.numInstances)
            : undefined;

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

      setFormData((prev) => ({ ...prev, upload: uploadData }));
      setStep(4);
    } catch (err) {
      setSubmitError(extractError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4: submit for review (or save as draft).
  const submitFinal = async (policyData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const details = formData.details || {};
      const metadata = formData.metadata || {};
      const upload = formData.upload || {};
      const files = (upload.files || []).filter((e) => e.file);
      const totalSize = files.reduce((sum, f) => sum + (f.file?.size || 0), 0);

      let status = "draft";
      if (!policyData.isDraft) {
        await datasetsApi.submitDataset(datasetId, true);
        status = "pending";
      }

      return {
        id: datasetId,
        title: details.title,
        fileCount: files.length,
        totalSize: formatBytes(totalSize),
        category: metadata.categoryName || "—",
        access: upload.access || "restricted",
        status,
        isDraft: status === "draft",
      };
    } catch (err) {
      setSubmitError(extractError(err));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step, formData, datasetId,
    goToPreviousStep,
    submitDetails,
    submitMetadata,
    submitUpload,
    submitFinal,
    isSubmitting, submitError,
  };
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
