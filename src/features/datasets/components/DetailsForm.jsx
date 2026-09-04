import { useState } from "react";
import FormField from "../../../components/FormField";
import TagInput from "../../../components/TagInput";
import { useAuth } from "../../../context/useAuth";

const LANGUAGE_OPTIONS = [
  // Language is OPTIONAL — a dataset with no textual/linguistic content
  // can select Not Applicable. Covers English, all major Ethiopian
  // languages, and common international research languages.
  { value: "English", label: "English" },
  { value: "Amharic", label: "Amharic — አማርኛ" },
  { value: "Afaan Oromo", label: "Afaan Oromo — Afaan Oromoo" },
  { value: "Tigrinya", label: "Tigrinya — ትግርኛ" },
  { value: "Somali", label: "Somali — Soomaali" },
  { value: "Afar", label: "Afar — Qafár af" },
  { value: "Sidama", label: "Sidama — Sidaamu Afoo" },
  { value: "Wolaytta", label: "Wolaytta" },
  { value: "Gurage", label: "Gurage — ጉራጌ" },
  { value: "Hadiyya", label: "Hadiyya" },
  { value: "Kembata", label: "Kembata" },
  { value: "Gamo", label: "Gamo" },
  { value: "Gofa", label: "Gofa" },
  { value: "Silte", label: "Silte" },
  { value: "Arsi Oromo", label: "Arsi Oromo" },
  { value: "Boorana Oromo", label: "Boorana Oromo" },
  { value: "Guragigna", label: "Guragigna" },
  { value: "Harari", label: "Harari — ሐረሪ" },
  { value: "Kafa", label: "Kafa" },
  { value: "Shinasha", label: "Shinasha" },
  { value: "Bench", label: "Bench — Bench Non" },
  { value: "Sheko", label: "Sheko" },
  { value: "Dawuro", label: "Dawuro" },
  { value: "Konso", label: "Konso" },
  { value: "Maji", label: "Maji" },
  { value: "Surma", label: "Surma" },
  { value: "Me'en", label: "Me'en" },
  { value: "Not Applicable", label: "Not Applicable" },
  { value: "Arabic", label: "Arabic — العربية" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Chinese", label: "Chinese" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Italian", label: "Italian" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "Swahili", label: "Swahili — Kiswahili" },
];

export default function DetailsForm({ initialValues = {}, onNext, onInvite, isSubmitting, submitError }) {
  const { user } = useAuth();

  const [title, setTitle] = useState(initialValues.title || "");
  const [description, setDescription] = useState(initialValues.description || "");
  const [language, setLanguage] = useState(initialValues.language || "English");
  const [coAuthors, setCoAuthors] = useState(initialValues.coAuthors || []);
  const [coAuthorEmail, setCoAuthorEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
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
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
      </FormField>

      {/* Co-Author Email & Invite Button */}
      <FormField label="Invite Co-Author by Email (Optional)">
        <div className="flex gap-2">
          <input
            type="email"
            value={coAuthorEmail}
            onChange={(e) => setCoAuthorEmail(e.target.value)}
            placeholder="colleague@aastu.edu.et"
            className={inputClass}
          />
          <button
            type="button"
            disabled={inviting || !coAuthorEmail.trim()}
            onClick={async () => {
              if (!coAuthorEmail.trim()) return;
              setInviting(true);
              setInviteMsg("");
              try {
                await onInvite?.({ email: coAuthorEmail.trim(), title: title.trim() || "Untitled dataset" });
                setCoAuthors((prev) => [...prev, coAuthorEmail.trim()]);
                setCoAuthorEmail("");
                setInviteMsg("Co-author invitation sent successfully!");
              } catch (err) {
                setInviteMsg(err?.message || "Failed to invite co-author.");
              } finally {
                setInviting(false);
              }
            }}
            className="px-5 py-3 bg-[#A67A0D] hover:bg-[#8f690b] text-white text-sm font-semibold rounded-md disabled:opacity-50 shrink-0 transition-colors"
          >
            {inviting ? "Inviting…" : "Invite"}
          </button>
        </div>
      </FormField>
      {inviteMsg && (
        <p className={`text-xs mt-1 mb-4 ${inviteMsg.includes("success") ? "text-green-600 font-medium" : "text-red-600 font-medium"}`}>
          {inviteMsg}
        </p>
      )}

      {/* Primary author is auto-filled from the logged-in user */}
      <TagInput label="Co-Author(s)" tags={coAuthors} onChange={setCoAuthors} placeholder="+ Add Co-Author" />
      <p className="-mt-4 mb-6 text-sm text-gray-500">
        Researchers who contributed significantly to the intellectual work and co-author credit.
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
