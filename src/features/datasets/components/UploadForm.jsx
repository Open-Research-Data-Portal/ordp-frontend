import { useRef, useState } from "react";
import FileUploadItem from "./FileUploadItem";

export default function UploadForm({ initialValues = {}, onNext, onBack }) {
  const [files, setFiles] = useState(initialValues.files || []);
  const [visibility, setVisibility] = useState(initialValues.visibility || "institution");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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
    onNext({ files, visibility });
  };

  return (
    <form className="bg-white border border-[#E3E1DA] shadow-lg rounded-lg p-10" onSubmit={handleContinue}>
      <h1 className="text-3xl text-navy m-0 mb-2">Upload Research Data</h1>
      <p className="text-base text-gray-500 mb-8">Finalize your submission by uploading files and setting visibility permissions.</p>

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
        <p className="text-sm text-gray-500 m-0 mb-5">Supported formats: CSV, JSON, HDF5, XLSX, PDF (Max 2GB per file)</p>
        <button type="button" className="bg-navy text-white rounded-md px-6 py-3 text-base font-semibold">Browse Files</button>
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

      <div className="mb-6">
        <label className="block text-base font-semibold mb-2">Visibility & Access</label>
        <div className="grid grid-cols-2 gap-5">
          <button
            type="button"
            onClick={() => setVisibility("institution")}
            className={`text-left p-5 border rounded-lg bg-white flex flex-col gap-1.5
              ${visibility === "institution" ? "border-gold bg-[#FBF6E9]" : "border-[#E3E1DA]"}`}
          >
            <span className="text-2xl">🏛</span>
            <span className="font-semibold text-base">Institution</span>
            <span className="text-sm text-gray-500">Only verified AASTU faculty and students can access.</span>
          </button>
          <button
            type="button"
            onClick={() => setVisibility("restricted")}
            className={`text-left p-5 border rounded-lg bg-white flex flex-col gap-1.5
              ${visibility === "restricted" ? "border-gold bg-[#FBF6E9]" : "border-[#E3E1DA]"}`}
          >
            <span className="text-2xl">🔒</span>
            <span className="font-semibold text-base">Restricted</span>
            <span className="text-sm text-gray-500">Access granted via request and author approval only.</span>
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#E3E1DA]">
        <button type="button" className="text-gray-500 text-base font-semibold" onClick={onBack}>← Back</button>
        <button type="submit" className="bg-gold hover:bg-gold-dark text-white rounded-md px-7 py-3.5 text-base font-semibold">Continue →</button>
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