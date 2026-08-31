import { useState } from "react";
import FormField from "../../../components/FormField";
import TagInput from "../../../components/TagInput";
import { useAuth } from "../../../context/useAuth";

export default function DetailsForm({ initialValues = {}, onNext, isSubmitting, submitError }) {
  const { user } = useAuth();

  const [title, setTitle] = useState(initialValues.title || "");
  const [description, setDescription] = useState(initialValues.description || "");
  const [language, setLanguage] = useState(initialValues.language || "English");
  const [coAuthors, setCoAuthors] = useState(initialValues.coAuthors || []);
  const [contributors, setContributors] = useState(initialValues.contributors || []);
  const [relatedResources, setRelatedResources] = useState(initialValues.relatedResources || []);
  const [geographicCoverage, setGeographicCoverage] = useState(initialValues.geographicCoverage || "");
  const [temporalCoverage, setTemporalCoverage] = useState(initialValues.temporalCoverage || "");
  const [localError, setLocalError] = useState("");

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setLocalError("Dataset title is required.");
      return;
    }
    if (!language) {
      setLocalError("Language is required.");
      return;
    }
    setLocalError("");
    await onNext({
      title,
      description,
      language,
      authorId: user?.id,
      coAuthors,
      contributors,
      relatedResources,
      geographicCoverage,
      temporalCoverage,
    });
  };

  const inputClass = "w-full px-4 py-3 border border-[#E3E1DA] rounded-md text-sm bg-[#F7F6F2] focus:outline-none focus:border-navy";

  return (
    <form className="bg-white border border-[#E3E1DA] shadow-lg rounded-lg p-10" onSubmit={handleContinue}>
      <h2 className="text-xl font-serif font-bold text-[#0B1526] mb-2">Details Entry</h2>
      <p className="text-sm text-gray-500 mb-8">
        Provide core information about your research dataset to help others discover and cite your work.
      </p>

      <FormField label="Dataset Title" required>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Seismic Activity Patterns in Northern Ethiopia 2020-2023" className={inputClass} />
      </FormField>

      <FormField label="Short Description" required hint={`${description.length} / 500`}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          placeholder="Briefly describe the dataset's scope, methodology, and key characteristics..."
          className={`${inputClass} resize-y`} rows={5} />
      </FormField>

      <FormField label="Language" required>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
          <option>English</option>
          <option>Amharic</option>
        </select>
      </FormField>

      {/* Primary author is auto-filled from the logged-in user */}
      <TagInput label="Co-Author(s)" tags={coAuthors} onChange={setCoAuthors} placeholder="+ Add Co-Author" />
      <p className="-mt-4 mb-6 text-sm text-gray-500">
        Researchers who contributed significantly to the intellectual work and co-author credit.
      </p>

      <TagInput label="Contributor(s)" tags={contributors} onChange={setContributors} placeholder="+ Add Contributor" />
      <p className="-mt-4 mb-6 text-sm text-gray-500">
        Individuals who assisted with data collection, preparation, or technical support.
      </p>

      <TagInput
        label="Related Resources (Optional)"
        tags={relatedResources}
        onChange={setRelatedResources}
        placeholder="+ Add DOI, URL, or title"
      />
      <p className="-mt-4 mb-6 text-sm text-gray-500">
        DOI, URL, or title of a related paper, dataset, or code repository.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <FormField label="Geographic Coverage (Optional)">
          <input
            type="text"
            value={geographicCoverage}
            onChange={(e) => setGeographicCoverage(e.target.value)}
            placeholder="e.g., Ethiopia / Addis Ababa / International / Not applicable"
            className={inputClass}
          />
        </FormField>
        <FormField label="Temporal Coverage (Optional)">
          <input
            type="text"
            value={temporalCoverage}
            onChange={(e) => setTemporalCoverage(e.target.value)}
            placeholder="e.g., 2010–2023 or Not time-bound"
            className={inputClass}
          />
        </FormField>
      </div>

      {localError && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-700 mt-4">
          <span className="shrink-0 text-base">⚠</span>
          <span>{localError}</span>
        </div>
      )}
      {submitError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700 mt-4">
          <span className="shrink-0 text-base">⚠️</span>
          <span>{submitError}</span>
        </div>
      )}

      <div className="flex justify-end mt-10 pt-6 border-t border-[#E3E1DA]">
        <button type="submit" disabled={isSubmitting}
          className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-7 py-3.5 text-base font-semibold disabled:opacity-60">
          {isSubmitting ? "Saving…" : "Continue →"}
        </button>
      </div>
    </form>
  );
}
