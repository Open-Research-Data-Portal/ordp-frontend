import { useRef, useState } from "react";
import FileUploadItem from "./FileUploadItem";

export default function UploadForm({ initialValues = {}, onNext, onBack }) {
  const [files, setFiles] = useState(initialValues.files || []);
  const [access, setAccess] = useState(initialValues.access || "public");
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
    onNext({ files, access });
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
        <p className="text-sm text-gray-500 m-0 mb-5">Supported formats: CSV, JSON/JSONL, Excel, Images, Parquet (Max 2GB per file)</p>
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

      <div className="mb-6">
        <label className="block text-base font-semibold mb-2">Access</label>
        <p className="text-sm text-gray-500 mb-3">Every dataset is visible to all users. Access controls whether the file itself can be downloaded directly.</p>
        <div className="grid grid-cols-2 gap-5">
          <button
            type="button"
            onClick={() => setAccess("public")}
            className={`text-left p-5 border rounded-lg bg-white flex flex-col gap-1.5
              ${access === "public" ? "border-gold bg-[#FBF6E9]" : "border-[#E3E1DA]"}`}
          >
            <span className="text-2xl">🌐</span>
            <span className="font-semibold text-base">Public</span>
            <span className="text-sm text-gray-500">Anyone can view and download the dataset directly.</span>
          </button>
          <button
            type="button"
            onClick={() => setAccess("private")}
            className={`text-left p-5 border rounded-lg bg-white flex flex-col gap-1.5
              ${access === "private" ? "border-gold bg-[#FBF6E9]" : "border-[#E3E1DA]"}`}
          >
            <span className="text-2xl">🔒</span>
            <span className="font-semibold text-base">Private</span>
            <span className="text-sm text-gray-500">Visible to everyone, but downloading requires the author's consent.</span>
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#E3E1DA]">
        <button type="button" className="text-gray-500 text-base font-semibold" onClick={onBack}>← Back</button>
        <button type="submit" className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-7 py-3.5 text-base font-semibold">Continue →</button>
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