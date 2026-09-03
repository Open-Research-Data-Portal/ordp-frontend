import { X } from "lucide-react";
import PreReviewSummary from "./PreReviewSummary";

export default function PreReviewModal({
  isOpen,
  onClose,
  formData,
  onEditStep,
  onSubmitForReview,
  onSaveDraft,
  isSubmitting,
  submitError,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl my-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-navy hover:bg-slate-100 transition z-10 cursor-pointer"
          aria-label="Close review popup"
        >
          <X className="w-5 h-5" />
        </button>

        <PreReviewSummary
          formData={formData}
          onEditStep={(step) => {
            onClose();
            onEditStep(step);
          }}
          onSubmitForReview={onSubmitForReview}
          onSaveDraft={onSaveDraft}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      </div>
    </div>
  );
}
