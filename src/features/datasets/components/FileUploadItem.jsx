export default function FileUploadItem({ file, onRemove, onRetry }) {
  const { name, sizeLabel, status, progress } = file;
  return (
    <div className={`flex items-center gap-4 p-4 border rounded-md mb-3
      ${status === "failed" ? "border-[#F3C7C0] bg-[#FDF4F2]" : "border-[#E3E1DA]"}`}>
      <div className="text-2xl">{status === "failed" ? "⚠" : "📄"}</div>
      <div className="flex-1">
        <p className="text-base font-semibold m-0">{name}</p>
        <p className="text-sm text-gray-500 m-0 mt-0.5">{sizeLabel}</p>
        {status === "uploading" && (
          <div className="h-1.5 bg-[#E3E1DA] rounded-full mt-2">
            <div className="h-full bg-navy rounded-full" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {status === "complete" && (
          <span className="text-sm px-3 py-1 rounded-full font-semibold bg-[#E4F0DF] text-success">✓ Complete</span>
        )}
        {status === "queued" && (
          <span className="text-sm px-3 py-1 rounded-full font-semibold bg-[#E3E1DA] text-gray-500">Queued…</span>
        )}
        {status === "uploading" && (
          <span className="text-sm px-3 py-1 rounded-full font-semibold bg-[#EAF0FB] text-[#2C5AAE]">{progress}% Uploading</span>
        )}
        {status === "failed" && (
          <>
            <span className="text-sm px-3 py-1 rounded-full font-semibold bg-[#FBE2DE] text-danger">Failed</span>
            <button type="button" className="bg-danger text-white rounded-md px-4 py-2 text-sm font-semibold" onClick={onRetry}>Retry</button>
          </>
        )}
        <button type="button" className="text-lg" onClick={onRemove} aria-label={`Remove ${name}`}>🗑</button>
      </div>
    </div>
  );
}