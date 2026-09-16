import { useEffect, useRef, useState } from "react";
import FileUploadItem from "./FileUploadItem";

export default function UploadForm({
  initialValues = {},
  onNext,
  onBack,
  isSubmitting = false,
  submitError = null,
  uploadStage = null,
}) {
  const [files, setFiles] = useState(initialValues.files || []);
  const [access, setAccess] = useState(
    initialValues.access === "institution" ? "private" : initialValues.access || "public"
  );
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnail, setThumbnail] = useState(initialValues.thumbnail || null);
  useEffect(() => {
    if (initialValues.files) setFiles(initialValues.files);
  }, [initialValues.files]);
  const [thumbnailPreview, setThumbnailPreview] = useState(
    initialValues.thumbnail ? URL.createObjectURL(initialValues.thumbnail) : null
  );
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const handleThumbnailChange = (file) => {
    if (!file) return;
    setThumbnail(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const clearThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const addFiles = (fileList) => {
    const newEntries = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}`,
      file, name: file.name, sizeLabel: formatBytes(file.size), status: "queued", progress: 0,
    }));
    setFiles((prev) => [...prev, ...newEntries]);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); };
  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const retryFile = (id) => setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "queued", progress: 0 } : f)));

  const handleContinue = (e) => {
    e.preventDefault();
    onNext({ files, access, thumbnail });
  };

  return (
    <form className="bg-white border border-[#E3E1DA] shadow-lg rounded-lg p-10" onSubmit={handleContinue}>
      <h2 className="text-xl font-serif font-bold text-[#0B1526] mb-2">Upload Research Data</h2>
      <p className="text-sm text-gray-500 mb-8">Finalize your submission by uploading files and setting access permissions.</p>

      <div
        className={`border-2 border-dashed rounded-lg py-14 px-6 text-center cursor-pointer
          ${isDragging ? "border-gold bg-[#FBF6E9]" : "border-[#E3E1DA] bg-[#FBFAF7]"}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#F2E7C4] flex items-center justify-center text-gold-dark text-xl">⬆</div>
        <p className="text-lg font-semibold m-0 mb-1.5">Drag and drop files here</p>
        <p className="text-sm text-gray-500 m-0 mb-5">
          Supported formats: CSV, TSV, JSON, JSONL, Excel, Parquet, HDF5, NetCDF, XML, SQLite, MATLAB, RData, GeoJSON, Images, Audio, Video, PDF, plain text, ZIP, and more. Max 2 GB per file.
        </p>
        <button type="button" className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-6 py-3 text-base font-semibold">Browse Files</button>
        <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className="my-8">
          <p className="text-sm text-gray-500 mb-4 tracking-wide">UPLOADED FILES ({files.length})</p>
          {files.map((f) => (
            <FileUploadItem key={f.id} file={f} onRemove={() => removeFile(f.id)} onRetry={() => retryFile(f.id)} />
          ))}
        </div>
      )}

      {/* ── Thumbnail ── */}
      <div className="mb-8 pt-6 border-t border-[#E3E1DA]">
        <label className="block text-base font-semibold mb-1">Dataset Thumbnail <span className="text-gray-400 font-normal text-sm">(Optional)</span></label>
        <p className="text-sm text-gray-500 mb-4">A cover image that helps users identify your dataset. Recommended: 16:9, at least 800×450 px. JPEG or PNG.</p>

        {thumbnailPreview ? (
          <div className="flex items-start gap-5">
            <img
              src={thumbnailPreview}
              alt="Thumbnail preview"
              className="w-48 h-28 object-cover rounded-lg border border-[#E3E1DA] shrink-0"
            />
            <div className="flex flex-col gap-2 justify-center">
              <p className="text-sm text-gray-700 font-medium">{thumbnail?.name}</p>
              <p className="text-sm text-gray-500">{thumbnail ? formatBytes(thumbnail.size) : ""}</p>
              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="text-sm text-[#A67A0D] font-semibold hover:underline"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={clearThumbnail}
                  className="text-sm text-danger font-semibold hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => thumbnailInputRef.current?.click()}
            className="flex items-center gap-3 px-5 py-3 border border-dashed border-[#E3E1DA] rounded-lg text-sm text-gray-500 hover:border-gold hover:text-[#A67A0D] transition-colors bg-[#FBFAF7]"
          >
            <span className="text-xl">🖼️</span>
            Click to upload a thumbnail image
          </button>
        )}
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleThumbnailChange(e.target.files?.[0])}
        />
      </div>

      {/* ── Dataset Access ── */}
      <div className="mb-6">
        <label className="block text-base font-semibold mb-2">
          Dataset Access <span className="text-danger">*</span>
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Controls who can view and interact with this dataset. This can be modified after publication.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setAccess("private")}
            className={`text-left p-5 border rounded-lg bg-white flex flex-col gap-1.5
              ${access === "private" || access === "institution" ? "border-gold bg-[#FBF6E9]" : "border-[#E3E1DA]"}`}
          >
            <span className="text-2xl">🔒</span>
            <span className="font-semibold text-base">Private</span>
            <span className="text-sm text-gray-500">Only accessible by you and authorized project collaborators.</span>
          </button>
          <button
            type="button"
            onClick={() => setAccess("restricted")}
            className={`text-left p-5 border rounded-lg bg-white flex flex-col gap-1.5
              ${access === "restricted" ? "border-gold bg-[#FBF6E9]" : "border-[#E3E1DA]"}`}
          >
            <span className="text-2xl">🛡️</span>
            <span className="font-semibold text-base">Restricted</span>
            <span className="text-sm text-gray-500">Only approved users. Requires access request or manual validation.</span>
          </button>
          <button
            type="button"
            onClick={() => setAccess("public")}
            className={`text-left p-5 border rounded-lg bg-white flex flex-col gap-1.5
              ${access === "public" ? "border-gold bg-[#FBF6E9]" : "border-[#E3E1DA]"}`}
          >
            <span className="text-2xl">🌐</span>
            <span className="font-semibold text-base">Public / Open</span>
            <span className="text-sm text-gray-500">Anyone can view and download (subject to the chosen license).</span>
          </button>
        </div>
      </div>

      {/* ── Multi-Stage Loading Progress Line ── */}
      {isSubmitting && (
        <div className="mt-8 p-5 bg-gradient-to-br from-[#FAF8F4] to-white border border-gold/40 rounded-xl shadow-sm animate-fade-in-up">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold"></span>
              </span>
              <span className="text-xs font-bold text-navy uppercase tracking-wider">
                {uploadStage?.stageName || "Processing Upload"}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-gold-dark">
              {uploadStage?.progress ?? 50}%
            </span>
          </div>

          {/* Smooth animated progress line */}
          <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5 relative">
            <div
              className="h-full bg-gradient-to-r from-gold via-amber-500 to-navy rounded-full transition-all duration-300 relative overflow-hidden"
              style={{ width: `${Math.max(6, uploadStage?.progress ?? 50)}%` }}
            >
              <div className="absolute inset-0 bg-white/25 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-slate-600 font-medium">
            <span>{uploadStage?.message || "Uploading dataset files..."}</span>
            {uploadStage?.chunkInfo && (
              <span className="text-[11px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                {uploadStage.chunkInfo}
              </span>
            )}
          </div>

          {/* Stepper indicators */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/60 text-[11px]">
            <div className={`flex items-center gap-1.5 ${(uploadStage?.stage || 1) >= 1 ? "text-navy font-semibold" : "text-slate-400"}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${(uploadStage?.stage || 1) >= 1 ? "bg-gold text-white" : "bg-slate-200 text-slate-500"}`}>1</span>
              <span>Session Setup</span>
            </div>
            <div className={`flex items-center gap-1.5 justify-center ${(uploadStage?.stage || 1) >= 2 ? "text-navy font-semibold" : "text-slate-400"}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${(uploadStage?.stage || 1) >= 2 ? "bg-gold text-white" : "bg-slate-200 text-slate-500"}`}>2</span>
              <span>Chunk Upload</span>
            </div>
            <div className={`flex items-center gap-1.5 justify-end ${(uploadStage?.stage || 1) >= 3 ? "text-navy font-semibold" : "text-slate-400"}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${(uploadStage?.stage || 1) >= 3 ? "bg-gold text-white" : "bg-slate-200 text-slate-500"}`}>3</span>
              <span>Verify & Assemble</span>
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700 mt-4">
          <span className="shrink-0 text-base">⚠️</span>
          <span>{submitError}</span>
        </div>
      )}

      <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#E3E1DA]">
        <button type="button" className="text-gray-500 text-base font-semibold" onClick={onBack}>← Back</button>
        <button type="submit" disabled={isSubmitting} className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-7 py-3.5 text-base font-semibold disabled:opacity-60">{isSubmitting ? "Uploading…" : "Continue →"}</button>
      </div>
    </form>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) { value /= 1024; unitIndex++; }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
