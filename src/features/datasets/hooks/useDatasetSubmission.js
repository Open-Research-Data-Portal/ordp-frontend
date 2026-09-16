import { useEffect, useState } from "react";
import * as datasetsApi from "./datasetsApi";
import * as authApi from "../../accounts/api/authApi";
import { inviteCoauthor as sendCoauthorInvitation } from "../../../api/sharing";
import {
  extractSelectedInterests,
  parseInterestCatalog,
  pickerCategories,
  buildProfileCompletionPatch,
  saveProfileCompletion,
} from "../../accounts/onboarding";

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

function normalizeInitResponse(data) {
  if (!data || typeof data !== "object") return data;
  return {
    ...data,
    dataset_id: data.dataset_id || data.id || data.dataset?.id,
    upload_session_id:
      data.upload_session_id ||
      data.session_id ||
      data.upload_session?.id ||
      data.uploadSessionId,
  };
}

function extractError(err) {
  const status = err.response?.status;
  const data = err.response?.data;
  const detail = data?.detail || data?.message;
  if (status === 401) return detail || "Your session has expired. Please sign in again.";
  if (status === 403) {
    return typeof detail === "string"
      ? detail
      : "You do not have permission to start this upload. Try Continue again.";
  }
  if (status === 404) {
    return typeof detail === "string"
      ? detail
      : "Could not start the upload session. Please try again.";
  }
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  if (data && typeof data === "object" && !data.toString?.().includes("[object")) {
    try {
      const text = JSON.stringify(data);
      if (text && text !== "{}") return text;
    } catch {
      /* ignore */
    }
  }
  if (err.message && !/status code 404/i.test(err.message)) return err.message;
  return "Something went wrong. Please try again.";
}

function isCompleteProfileError(err) {
  const blob = JSON.stringify(err?.response?.data || err?.message || "").toLowerCase();
  return /complete.{0,40}profile|profile.{0,40}incomplete|profile.{0,20}not.{0,20}complete/.test(
    blob
  );
}

async function markProfileReadyForUpload() {
  try {
    const [completionResult, optionsResult, profileResult] = await Promise.allSettled([
      authApi.getProfileCompletion(),
      authApi.getProfileOptions(),
      authApi.getProfile(),
    ]);
    const completionResponse = completionResult.status === "fulfilled" ? completionResult.value : {};
    const profileResponse = profileResult.status === "fulfilled" ? profileResult.value : {};
    const completion = {
      ...(profileResponse || {}),
      ...(profileResponse?.profile || {}),
      ...(completionResponse || {}),
      ...(completionResponse?.profile || {}),
    };
    const options = optionsResult.status === "fulfilled" ? optionsResult.value : {};
    const catalog = parseInterestCatalog(options);
    const patch = buildProfileCompletionPatch({
      labels: extractSelectedInterests(completion, pickerCategories(catalog)),
      catalog,
      completion,
      options,
    });
    try {
      await saveProfileCompletion(patch);
    } catch (completionError) {
      try {
        await authApi.updateProfile(patch);
      } catch {
        throw completionError;
      }
    }
  } catch {
    // Best-effort: retry the upload even if this patch is rejected.
  }
}

async function startUploadSession(detailsData) {
  const payloads = [
    {
      title: detailsData.title,
      description: detailsData.description || detailsData.title,
      visibility: "restricted",
    },
    { title: detailsData.title, visibility: "restricted" },
    { name: detailsData.title, title: detailsData.title, visibility: "public" },
  ];
  let lastErr;
  for (const payload of payloads) {
    try {
      return normalizeInitResponse(await datasetsApi.initUpload(payload));
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if (isCompleteProfileError(err) || status === 403) {
        await markProfileReadyForUpload();
        try {
          return normalizeInitResponse(await datasetsApi.initUpload(payload));
        } catch (retryErr) {
          lastErr = retryErr;
          const retryStatus = retryErr.response?.status;
          if (retryStatus !== 400) throw retryErr;
        }
      } else if (status === 400) {
        continue;
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function uploadFileInChunks(file, sessionId, onProgress) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const fileChecksum = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  let chunkSize = CHUNK_SIZE;
  let totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  try {
    const prep = await datasetsApi.prepareUpload(sessionId, {
      filename: file.name,
      file_size: file.size,
      file_checksum: fileChecksum,
    });
    if (prep?.chunk_size) chunkSize = prep.chunk_size;
    if (prep?.total_chunks) totalChunks = prep.total_chunks;
  } catch (e) {
    if (e?.response?.status !== 404) throw e;
  }
  for (let i = 0; i < totalChunks; i++) {
    const blob = file.slice(i * chunkSize, Math.min((i + 1) * chunkSize, file.size));
    const chunkDigest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    const checksum = Array.from(new Uint8Array(chunkDigest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    await datasetsApi.uploadChunk(sessionId, i, blob, checksum, {
      filename: file.name,
      fileSize: file.size,
      fileChecksum,
    });
    onProgress?.(Math.round(((i + 1) / totalChunks) * 100), i, totalChunks);
  }
}

export default function useDatasetSubmission(draftId = null) {
  const draftKey = "ordp-contribute-draft";
  const storedDraft = JSON.parse(localStorage.getItem(draftKey) || "null");
  const [step, setStep] = useState(() => Number(storedDraft?.step) || 1);
  const [formData, setFormData] = useState(() => storedDraft?.formData || { details: {}, metadata: {}, upload: {}, policy: {} });
  const [datasetId, setDatasetId] = useState(() => JSON.parse(localStorage.getItem(draftKey) || "null")?.datasetId || null);
  const [uploadSessionId, setUploadSessionId] = useState(() => JSON.parse(localStorage.getItem(draftKey) || "null")?.uploadSessionId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [uploadStage, setUploadStage] = useState({
    stage: 1,
    stageName: "Session Setup",
    progress: 0,
    message: "Initializing secure session...",
    chunkInfo: "",
  });
  useEffect(() => {
    if (draftId === "__new__") {
      localStorage.removeItem(draftKey);
      queueMicrotask(() => {
        setStep(1);
        setFormData({ details: {}, metadata: {}, upload: {}, policy: {} });
        setDatasetId(null);
        setUploadSessionId(null);
      });
      return;
    }
  }, [draftId]);

  useEffect(() => {
    if (!draftId || draftId === "__new__") return;
    datasetsApi.getDatasetDetail(draftId).then((raw) => {
      const metadata = raw?.metadata || {};
      setDatasetId(draftId);
      setFormData((prev) => ({
        ...prev,
        details: { ...prev.details, title: raw?.title || "", description: metadata.description || raw?.description || "" },
        metadata: { ...prev.metadata, category_id: metadata.category || metadata.category_id || "", subject_id: metadata.subject || metadata.subject_id || "", keywords: metadata.keywords || [] },
      }));
      setStep(raw?.status === "draft" ? 1 : 1);
    }).catch(() => {});
  }, [draftId, datasetId]);

  useEffect(() => {
    if (draftId === "__new__") return;
    localStorage.setItem(draftKey, JSON.stringify({ step, formData, datasetId, uploadSessionId }));
  }, [draftId, step, formData, datasetId, uploadSessionId]);

  const goToPreviousStep = () => {
    setSubmitError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const goToStep = (targetStep) => {
    setSubmitError(null);
    setStep(Math.max(1, Math.min(targetStep, 5)));
  };

  const resumeDraftUpload = async () => {
    if (!draftId || draftId === "__new__" || !datasetId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const r = await datasetsApi.initExistingDraftUpload(datasetId);
      setUploadSessionId(r.upload_session_id);
    } catch (err) {
      setSubmitError(extractError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: save details and advance to Step 2.
  const submitDetails = async (detailsData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      setFormData((prev) => ({ ...prev, details: detailsData }));
      let did = datasetId;
      let sid = uploadSessionId;
      if (!did) {
        try {
          await markProfileReadyForUpload();
          const r = await startUploadSession(detailsData);
          if (r?.dataset_id) {
            did = r.dataset_id;
            sid = r.upload_session_id;
            setDatasetId(did);
            setUploadSessionId(sid);
          }
        } catch (sessionErr) {
          console.warn("Upload session deferred to Step 3:", sessionErr);
        }
      } else {
        try {
          await datasetsApi.updateDataset(did, { title: detailsData.title });
        } catch (e) {
          console.warn("Dataset title update deferred:", e);
        }
      }
      setStep(2);
    } catch (err) {
      setFormData((prev) => ({ ...prev, details: detailsData }));
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inviteCoauthor = async ({ email, title }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let did = datasetId;
      if (!did) {
        const datasetTitle = (title || formData.details?.title || "Untitled dataset").trim();
        const result = await datasetsApi.initUpload({ title: datasetTitle, visibility: "restricted" });
        did = result.dataset_id;
        setDatasetId(did);
        setUploadSessionId(result.upload_session_id);
      }
      await sendCoauthorInvitation(did, email);
    } catch (err) {
      const message = extractError(err);
      setSubmitError(message);
      throw new Error(message, { cause: err });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: attach metadata + set languages and advance to Step 3.
  const submitMetadata = async (metadataData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      setFormData((prev) => ({ ...prev, metadata: metadataData }));
      const details = formData.details || {};
      let did = datasetId;
      let sid = uploadSessionId;
      if (!did) {
        try {
          const r = await datasetsApi.initUpload({ title: details.title || "Untitled dataset", visibility: "restricted" });
          if (r?.dataset_id) {
            did = r.dataset_id; sid = r.upload_session_id;
            setDatasetId(did); setUploadSessionId(sid);
          }
        } catch (e) {
          console.warn("Upload session deferred to Step 3:", e);
        }
      }
      if (did) {
        const metadataPayload = {
          category_id: metadataData.category_id || undefined,
          other_category: metadataData.other_category || undefined,
          subject_id: metadataData.subject_id || undefined,
          description: details.description || "",
          keywords: Array.isArray(metadataData.keywords) ? metadataData.keywords : [],
          geographic_coverage: details.geographicCoverage || "",
          temporal_coverage: details.temporalCoverage || "",
          instances_represent: metadataData.instancesRepresent || "",
          collection_method: metadataData.collectionMethod || "",
          recommended_splits: metadataData.recommendedSplits || "",
        };
        try {
          await datasetsApi.attachMetadata(did, metadataPayload);
        } catch (e) {
          console.warn("Metadata attach deferred:", e);
        }

        const languageId = details.languageId || details.language_id;
        try {
          if (languageId) {
            await datasetsApi.setDatasetLanguages(did, {
              language_ids: [languageId],
            });
          } else if (details.language) {
            await datasetsApi.setDatasetLanguages(did, {
              other_languages: [details.language],
            });
          }
        } catch (e) {
          console.warn("Languages deferred:", e);
        }

        // Persist named co-authors entered in the form.
        const coAuthors = details.coAuthors || [];
        for (const name of coAuthors) {
          if (name.trim()) {
            try {
              await datasetsApi.addContributor(did, { name: name.trim(), contributor_type: "co_author" });
            } catch (e) {
              console.warn("Failed to add co-author", e);
            }
          }
        }
      }
      setStep(3);
    } catch (err) {
      setFormData((prev) => ({ ...prev, metadata: metadataData }));
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: set visibility, upload thumbnail + file.
  const submitUpload = async (uploadData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setUploadStage({
      stage: 1,
      stageName: "Session Setup",
      progress: 10,
      message: "Configuring dataset session and access permissions...",
      chunkInfo: "Step 1 of 3",
    });
    try {
      const details = formData.details || {};
      let activeDatasetId = datasetId;
      let activeSessionId = uploadSessionId;
      if (!activeDatasetId || !activeSessionId) {
        await markProfileReadyForUpload();
        const fresh = await startUploadSession(details);
        activeDatasetId = fresh.dataset_id; activeSessionId = fresh.upload_session_id;
        setDatasetId(activeDatasetId); setUploadSessionId(activeSessionId);
      }
      const rawAccess = uploadData.access || "restricted";
      const visibility = rawAccess === "institution" ? "private" : rawAccess;
      try {
        await datasetsApi.updateDataset(activeDatasetId, { visibility });
      } catch (e) {
        console.warn("Visibility update deferred:", e);
      }

      if (uploadData.thumbnail) {
        try {
          await datasetsApi.uploadThumbnail(activeDatasetId, uploadData.thumbnail);
        } catch (e) {
          console.warn("Thumbnail upload failed (non-fatal):", e);
        }
      }

      const files = (uploadData.files || []).filter((e) => e.file);
      for (const [index, entry] of files.entries()) {
        if (index > 0) {
          const nextSession = await datasetsApi.initExistingDraftUpload(activeDatasetId);
          activeSessionId = nextSession.upload_session_id;
        }

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

        setUploadStage({
          stage: 2,
          stageName: "Transferring Data",
          progress: 20,
          message: `Preparing upload for ${entry.file.name}...`,
          chunkInfo: `File ${index + 1} of ${files.length}`,
        });

        const handleChunkProgress = (progress, chunkIndex, totalChunks) => {
          setFormData((prev) => ({
            ...prev,
            upload: {
              ...uploadData,
              files: files.map((f) =>
                f.id === entry.id
                  ? { ...f, status: progress === 100 ? "complete" : "uploading", progress }
                  : f
              ),
            },
          }));
          const stagePct = Math.min(88, Math.round(20 + progress * 0.68));
          setUploadStage({
            stage: 2,
            stageName: "Transferring Data",
            progress: stagePct,
            message: `Uploading ${entry.file.name} (${progress}% complete)...`,
            chunkInfo: `Chunk ${chunkIndex + 1} of ${totalChunks}`,
          });
        };

        try {
          await uploadFileInChunks(entry.file, activeSessionId, handleChunkProgress);
        } catch (uploadError) {
          const detail = uploadError?.response?.data?.detail || uploadError?.message || "";
          if (!/unknown upload session/i.test(detail)) throw uploadError;
          const fresh = await datasetsApi.initExistingDraftUpload(activeDatasetId);
          activeSessionId = fresh.upload_session_id;
          setUploadSessionId(activeSessionId);
          await uploadFileInChunks(entry.file, activeSessionId, handleChunkProgress);
        }

        setUploadStage({
          stage: 3,
          stageName: "Checksum Verification & Assembly",
          progress: 92,
          message: `Validating SHA-256 integrity & assembling ${entry.file.name}...`,
          chunkInfo: "Finalizing",
        });

        await datasetsApi.completeUpload(activeSessionId, {
          datasetId: activeDatasetId,
          filename: entry.file.name,
          fileType,
          isStructured: isStructuredFileType && metadata.includesHeaderRow !== false,
          columnCount,
          featureNames,
          itemCount,
          fileSize: entry.file.size,
          fileChecksum: Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await entry.file.arrayBuffer()))).map((b) => b.toString(16).padStart(2, "0")).join(""),
        });
      }

      setUploadStage({
        stage: 4,
        stageName: "Upload Complete",
        progress: 100,
        message: "File assembled and verified successfully!",
        chunkInfo: "Done",
      });

      setFormData((prev) => ({ ...prev, upload: uploadData }));
      setStep(4);
    } catch (err) {
      setSubmitError(extractError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4: submit for review (or save as draft).
  const submitPolicy = (policyData) => {
    setFormData((prev) => ({ ...prev, policy: policyData }));
    setStep(5);
  };

  const submitFinal = async (policyData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const details = formData.details || {};
      const metadata = formData.metadata || {};
      const upload = formData.upload || {};
      const files = (upload.files || []).filter((e) => e.file);

      if (!policyData.isDraft) {
        const missing = [];
        if (!files.length) missing.push("at least one file");
        if (!metadata.category_id && !metadata.other_category) missing.push("a category");
        const hasLanguage = details.languageId || details.language_id || details.language;
        if (!hasLanguage) missing.push("a language");
        if (missing.length > 0) {
          throw new Error(`Please add ${missing.join(", ")} before submitting.`);
        }
        if (!policyData.termsAccepted) {
          throw new Error("You must accept the Terms & Conditions to submit a dataset.");
        }
        await datasetsApi.submitDataset(datasetId, true);
      }

      const status = policyData.isDraft ? "draft" : "pending";
      const totalSize = files.reduce((sum, f) => sum + (f.file?.size || 0), 0);

      localStorage.removeItem(draftKey);

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
    goToStep,
    goToPreviousStep,
    submitDetails,
    inviteCoauthor,
    submitMetadata,
    submitUpload,
    submitPolicy,
    submitFinal,
    resumeDraftUpload,
    isSubmitting, submitError,
    uploadStage,
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
