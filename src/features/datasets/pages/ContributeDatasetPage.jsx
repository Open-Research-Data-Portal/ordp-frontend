import { useNavigate } from "react-router-dom";
import ContributeLayout from "../../../layouts/ContributeLayout";
import DetailsForm from "../components/DetailsForm";
import MetadataForm from "../../metadata/components/MetadataForm";
import UploadForm from "../components/UploadForm";
import PolicyForm from "../components/PolicyForm";
import useDatasetSubmission from "../hooks/useDatasetSubmission";

const STEPS = ["Details", "Metadata", "Upload", "Policy"];

export default function ContributeDatasetPage() {
  const navigate = useNavigate();
  const { step, formData, goToNextStep, goToPreviousStep, submitDataset, isSubmitting, submitError } = useDatasetSubmission();

  const handleFinalSubmit = async (policyData) => {
    const result = await submitDataset(policyData);
    if (result) navigate("/datasets/contribute/success", { state: { submission: result } });
  };

  return (
    <ContributeLayout currentStep={step} steps={STEPS}>
      <div key={step} className="animate-[fadeSlideIn_0.35s_ease-out]">
        {step === 1 && <DetailsForm initialValues={formData.details} onNext={(data) => goToNextStep("details", data)} />}
        {step === 2 && <MetadataForm initialValues={formData.metadata} onNext={(data) => goToNextStep("metadata", data)} onBack={goToPreviousStep} />}
        {step === 3 && <UploadForm initialValues={formData.upload} onNext={(data) => goToNextStep("upload", data)} onBack={goToPreviousStep} />}
        {step === 4 && <PolicyForm initialValues={formData.policy} onSubmit={handleFinalSubmit} onBack={goToPreviousStep} isSubmitting={isSubmitting} submitError={submitError} />}
      </div>
    </ContributeLayout>
  );
}