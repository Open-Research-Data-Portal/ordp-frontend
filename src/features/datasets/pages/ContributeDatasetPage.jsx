import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import ContributeLayout from "../../../layouts/ContributeLayout";
import DetailsForm from "../components/DetailsForm";
import MetadataForm from "../../metadata/components/MetadataForm";
import UploadForm from "../components/UploadForm";
import PolicyForm from "../components/PolicyForm";
import PreReviewSummary from "../components/PreReviewSummary";
import { useAuth } from "../../../context/useAuth";
import { getDashboardPath } from "../../../utils/userRoles";
import useDatasetSubmission from "../hooks/useDatasetSubmission";


const STEPS = ["Details", "Metadata", "Upload", "Policy", "Preview"];

export default function ContributeDatasetPage() {
  const navigate = useNavigate();
const [searchParams] = useSearchParams();
  const { user, isAuthenticated, loading } = useAuth();
  const {
    step, formData,
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
  } = useDatasetSubmission(searchParams.get("new") ? "__new__" : searchParams.get("draft"));

  useEffect(() => {
    const draftId = searchParams.get("draft");
    if (draftId && draftId !== "__new__") {
      resumeDraftUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleFinalSubmit = async (policyData) => {
    const result = await submitFinal(policyData);
    if (result) navigate("/datasets/contribute/success", { state: { submission: result } });
  };

  return (
    <ContributeLayout currentStep={step} steps={STEPS} onStepClick={goToStep}>
      <button
        type="button"
        onClick={() => navigate(getDashboardPath(user))}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-navy transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>
      <div key={step} className="animate-[fadeSlideIn_0.35s_ease-out]">
        {step === 1 && (
          <DetailsForm
            initialValues={formData.details}
            onNext={submitDetails}
            onInvite={inviteCoauthor}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}
        {step === 2 && (
          <MetadataForm
            initialValues={formData.metadata}
            onNext={submitMetadata}
            onBack={goToPreviousStep}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}
        {step === 3 && (
          <UploadForm
            initialValues={formData.upload}
            onNext={submitUpload}
            onBack={goToPreviousStep}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}
        {step === 4 && (
          <PolicyForm
            initialValues={formData.policy}
            onSubmit={submitPolicy}
            onBack={goToPreviousStep}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}
        {step === 5 && (
          <PreReviewSummary
            formData={formData}
            onEditStep={goToStep}
            onSubmitForReview={() => handleFinalSubmit(formData.policy)}
            onSaveDraft={() => handleFinalSubmit({ ...formData.policy, isDraft: true })}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}
      </div>
    </ContributeLayout>
  );
}
