import { useState } from "react";
import * as datasetsApi from "./datasetsApi";

export default function useDatasetSubmission() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ details: {}, metadata: {}, upload: {}, policy: {} });
  const [datasetId, setDatasetId] = useState(null);
  const [uploadSessionId, setUploadSessionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const goToPreviousStep = () => setStep((s) => Math.max(s - 1, 1));

  const submitDetails = async (detailsData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await datasetsApi.initUpload(detailsData);
      setDatasetId(result.dataset_id);
      setUploadSessionId(result.upload_session_id);
      setFormData((prev) => ({ ...prev, details: detailsData }));
      setStep(2);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 401) {
        setSubmitError(detail || "You need to sign in before starting a dataset submission.");
      } else if (status === 403) {
        setSubmitError(detail || "You do not have permission to start a dataset submission with this account.");
      } else {
        setSubmitError(detail || "Couldn't start the submission. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step, formData, datasetId, uploadSessionId,
    goToPreviousStep, submitDetails,
    isSubmitting, submitError,
  };
}