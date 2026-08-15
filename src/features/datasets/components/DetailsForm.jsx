import { useState } from "react";
import FormField from "../../../components/FormField";
import TagInput from "../../../components/TagInput";
// TODO: import your actual auth hook/context here, e.g.:
// import { useAuth } from "../../../hooks/useAuth";

export default function DetailsForm({ initialValues = {}, onNext, isSubmitting, submitError }) {
  // TODO: replace with your real auth hook, e.g. const { user } = useAuth();
  // const loggedInUser = user; // expects { id, name } or similar

  const [title, setTitle] = useState(initialValues.title || "");
  const [description, setDescription] = useState(initialValues.description || "");
  const [language, setLanguage] = useState(initialValues.language || "English");
  const [coAuthors, setCoAuthors] = useState(initialValues.coAuthors || []);
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
      // TODO: replace with the real logged-in user id once the auth hook is wired in,
      // e.g. authorId: loggedInUser.id
      authorId: initialValues.authorId,
      coAuthors,
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

      {/* Author is auto-filled from the logged-in user — no manual entry needed. */}
      <TagInput label="Co-Author(s)" tags={coAuthors} onChange={setCoAuthors} placeholder="+ Add Co-Author" />

      {localError && <p className="text-danger text-sm mt-2">{localError}</p>}
      {submitError && <p className="text-danger text-sm mt-2">{submitError}</p>}

      <div className="flex justify-end mt-10 pt-6 border-t border-[#E3E1DA]">
        <button type="submit" disabled={isSubmitting}
          className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-7 py-3.5 text-base font-semibold disabled:opacity-60">
          {isSubmitting ? "Saving…" : "Continue →"}
        </button>
      </div>
    </form>
  );
}