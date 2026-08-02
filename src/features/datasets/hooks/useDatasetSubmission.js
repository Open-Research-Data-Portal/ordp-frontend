import { useState } from "react";
import { createDataset } from "../../../api/datasets";

const initialFormData = { details: {}, metadata: {}, upload: {}, policy: {} };

export default function useDatasetSubmission() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const goToNextStep = (key, data) => {
    setFormData((prev) => ({ ...prev, [key]: data }));
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const goToPreviousStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const submitDataset = async (policyData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    const finalPayload = { ...formData, policy: policyData };
    try {
      return await createDataset(finalPayload);
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Submission failed. Please try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { step, formData, goToNextStep, goToPreviousStep, submitDataset, isSubmitting, submitError };
}