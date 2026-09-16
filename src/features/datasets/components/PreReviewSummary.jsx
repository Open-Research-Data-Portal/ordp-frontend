import {
  FileText,
  Tag,
  UploadCloud,
  ShieldCheck,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function PreReviewSummary({
  formData = {},
  onEditStep,
  onSubmitForReview,
  onSaveDraft,
  isSubmitting = false,
  submitError = null,
}) {
  const details = formData.details || {};
  const metadata = formData.metadata || {};
  const upload = formData.upload || {};

  const files = (upload.files || []).filter((e) => e.file || e.name);
  const totalSizeBytes = files.reduce((acc, f) => acc + (f.file?.size || 0), 0);
  const totalSizeLabel = totalSizeBytes > 0 ? (totalSizeBytes / (1024 * 1024)).toFixed(2) + " MB" : "—";

  return (
    <div className="bg-white border border-[#E3E1DA] shadow-xl rounded-2xl p-6 sm:p-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 text-gold-dark text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Step 5: Pre-Submission Review
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-navy">
            Review Your Dataset Submission
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Please carefully verify the information below before sending your dataset to the peer review committee.
          </p>
        </div>
      </div>

      {submitError && (
        <div className="my-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="font-semibold">Submission Error</p>
            <p className="text-xs mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {/* Summary Content Grid */}
      <div className="space-y-6 my-8">
        {/* Section 1: Core Details */}
        <section className="bg-[#FAF9F5] border border-slate-200/80 rounded-xl p-5 relative group hover:border-gold/40 transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-navy font-bold text-sm sm:text-base">
              <FileText className="w-4 h-4 text-gold" />
              <span>1. Dataset Details</span>
            </div>
            <button
              type="button"
              onClick={() => onEditStep?.(1)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:text-navy bg-white border border-slate-200 hover:border-gold rounded-lg px-2.5 py-1 transition cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Edit Details
            </button>
          </div>
          <div className="space-y-2.5 text-xs sm:text-sm">
            <div>
              <span className="text-gray-400 block text-[11px] uppercase font-semibold">Title</span>
              <span className="font-semibold text-navy text-sm sm:text-base">{details.title || "Untitled Dataset"}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px] uppercase font-semibold">Short Description</span>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {details.description || "No description provided."}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <span className="text-gray-400 block text-[11px] uppercase font-semibold">Language</span>
                <span className="font-medium text-slate-800">{details.language || "Not Applicable"}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px] uppercase font-semibold">Geographic Coverage</span>
                <span className="font-medium text-slate-800">{details.geographicCoverage || "—"}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px] uppercase font-semibold">Temporal Coverage</span>
                <span className="font-medium text-slate-800">{details.temporalCoverage || "—"}</span>
              </div>
            </div>
            {Array.isArray(details.coAuthors) && details.coAuthors.length > 0 && (
              <div className="pt-2">
                <span className="text-gray-400 block text-[11px] uppercase font-semibold mb-1">Co-Author(s)</span>
                <div className="flex flex-wrap gap-1.5">
                  {details.coAuthors.map((author) => (
                    <span key={author} className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-xs text-navy font-medium">
                      {author}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(details.relatedResources) && details.relatedResources.length > 0 && (
              <div className="pt-2">
                <span className="text-gray-400 block text-[11px] uppercase font-semibold mb-1">Related Resources</span>
                <div className="flex flex-wrap gap-1.5">
                  {details.relatedResources.map((res) => (
                    <span key={res} className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-xs text-slate-700 font-mono">
                      {res}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Metadata & Subject Classification */}
        <section className="bg-[#FAF9F5] border border-slate-200/80 rounded-xl p-5 relative group hover:border-gold/40 transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-navy font-bold text-sm sm:text-base">
              <Tag className="w-4 h-4 text-gold" />
              <span>2. Metadata & Classification</span>
            </div>
            <button
              type="button"
              onClick={() => onEditStep?.(2)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:text-navy bg-white border border-slate-200 hover:border-gold rounded-lg px-2.5 py-1 transition cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Edit Metadata
            </button>
          </div>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-gray-400 block text-[11px] uppercase font-semibold">Primary Category</span>
                <span className="font-semibold text-navy">{metadata.other_category || metadata.category_name || metadata.category_id || "General Research"}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px] uppercase font-semibold">Academic Subject</span>
                <span className="font-medium text-slate-800">{metadata.subject_name || metadata.subject_id || "—"}</span>
              </div>
            </div>
            {Array.isArray(metadata.keywords) && metadata.keywords.length > 0 && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase font-semibold mb-1">Keywords</span>
                <div className="flex flex-wrap gap-1.5">
                  {metadata.keywords.map((kw) => (
                    <span key={kw} className="px-2.5 py-0.5 rounded-md bg-gold/15 text-gold-dark text-xs font-semibold">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(metadata.characteristics) && metadata.characteristics.length > 0 && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase font-semibold mb-1">Dataset Characteristics</span>
                <div className="flex flex-wrap gap-1.5">
                  {metadata.characteristics.map((c) => (
                    <span key={c} className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-xs text-slate-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(metadata.collectionMethod || metadata.instancesRepresent || metadata.recommendedSplits) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200/60">
                {metadata.collectionMethod && (
                  <div>
                    <span className="text-gray-400 block text-[11px] uppercase font-semibold">Collection Method</span>
                    <span className="text-slate-700">{metadata.collectionMethod}</span>
                  </div>
                )}
                {metadata.instancesRepresent && (
                  <div>
                    <span className="text-gray-400 block text-[11px] uppercase font-semibold">Instances Represent</span>
                    <span className="text-slate-700">{metadata.instancesRepresent}</span>
                  </div>
                )}
                {metadata.recommendedSplits && (
                  <div>
                    <span className="text-gray-400 block text-[11px] uppercase font-semibold">Recommended Splits</span>
                    <span className="text-slate-700">{metadata.recommendedSplits}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Uploaded Files & Visibility */}
        <section className="bg-[#FAF9F5] border border-slate-200/80 rounded-xl p-5 relative group hover:border-gold/40 transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-navy font-bold text-sm sm:text-base">
              <UploadCloud className="w-4 h-4 text-gold" />
              <span>3. Files & Visibility</span>
            </div>
            <button
              type="button"
              onClick={() => onEditStep?.(3)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:text-navy bg-white border border-slate-200 hover:border-gold rounded-lg px-2.5 py-1 transition cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Edit Files
            </button>
          </div>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-400 block text-[11px] uppercase font-semibold">Access Permission</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-emerald-100 text-emerald-800 mt-0.5">
                  {upload.access === "private" || upload.access === "institution"
                    ? "Private Access"
                    : upload.access === "restricted"
                    ? "Restricted Access"
                    : "Public / Open Access"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[11px] uppercase font-semibold">Total Size</span>
                <span className="font-semibold text-navy">{totalSizeLabel}</span>
              </div>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px] uppercase font-semibold mb-1">Attached Files</span>
              {files.length === 0 ? (
                <p className="text-slate-400 italic">No files attached yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-navy shrink-0" />
                        <span className="font-mono font-medium text-slate-800 truncate">{f.name || f.file?.name}</span>
                      </div>
                      <span className="text-gray-400 font-mono text-[11px] ml-2 shrink-0">
                        {f.sizeLabel || (f.file?.size ? (f.file.size / 1024).toFixed(1) + " KB" : "")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Institutional Policy & Verification */}
        <section className="bg-[#FAF9F5] border border-slate-200/80 rounded-xl p-5 relative group hover:border-gold/40 transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-navy font-bold text-sm sm:text-base">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>4. Policy & Legal Consent</span>
            </div>
            <button
              type="button"
              onClick={() => onEditStep?.(4)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:text-navy bg-white border border-slate-200 hover:border-gold rounded-lg px-2.5 py-1 transition cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Edit Consent
            </button>
          </div>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Data Ownership and Publishing Rights Certified</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PII Removal and Sensitive Data Anonymization Confirmed</span>
            </div>
          </div>
        </section>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E3E1DA]">
        <button
          type="button"
          onClick={() => onEditStep?.(4)}
          className="text-gray-500 hover:text-navy text-sm sm:text-base font-semibold transition cursor-pointer"
        >
          ← Back to Policy
        </button>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? "Saving…" : "Save as Draft"}
          </button>
          <button
            type="button"
            onClick={onSubmitForReview}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none bg-navy hover:bg-navy-light text-white rounded-xl px-7 py-3 text-sm sm:text-base font-bold transition shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? "Submitting for Review…" : "Send for Review →"}
          </button>
        </div>
      </div>
    </div>
  );
}
