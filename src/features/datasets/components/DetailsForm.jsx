import { useState, useEffect } from "react";
import FormField from "../../../components/FormField";
import TagInput from "../../../components/TagInput";
import { useAuth } from "../../../context/useAuth";
import * as datasetsApi from "../hooks/datasetsApi";

const LANGUAGE_OPTIONS = [
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
  { value: "Arabic", label: "Arabic — العربية" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Chinese", label: "Chinese" },
  { value: "Not Applicable", label: "Not Applicable" },
];

export default function DetailsForm({ initialValues = {}, onNext, onInvite, isSubmitting, submitError }) {
  const { user } = useAuth();

  const [title, setTitle] = useState(initialValues.title || "");
  const [description, setDescription] = useState(initialValues.description || "");
  const [language, setLanguage] = useState(initialValues.language || "English");
  const [languageId, setLanguageId] = useState(initialValues.languageId || initialValues.language_id || "");
  const [languagesList, setLanguagesList] = useState([]);
  const [coAuthors, setCoAuthors] = useState(initialValues.coAuthors || []);
  const [coAuthorEmail, setCoAuthorEmail] = useState("");
  const [invitePermission, setInvitePermission] = useState("view");
  const [userMatches, setUserMatches] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedInviteUser, setSelectedInviteUser] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [relatedResources, setRelatedResources] = useState(initialValues.relatedResources || []);
  const [geographicCoverage, setGeographicCoverage] = useState(initialValues.geographicCoverage || "");
  const [temporalCoverage, setTemporalCoverage] = useState(initialValues.temporalCoverage || "");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadLanguages() {
      try {
        const data = await datasetsApi.listLanguages();
        if (!active) return;
        const list = (Array.isArray(data) ? data : data?.results || []).map((l) => ({
          id: l.id || l.uuid,
          name: l.name || l.label || l.language,
          code: l.code,
        }));
        if (list.length > 0) {
          setLanguagesList(list);
          const currentMatch =
            list.find((l) => String(l.id) === String(initialValues.languageId || initialValues.language_id)) ||
            list.find((l) => l.name?.toLowerCase() === (initialValues.language || "English").toLowerCase()) ||
            list[0];
          if (currentMatch) {
            setLanguage(currentMatch.name);
            setLanguageId(currentMatch.id);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch languages from /metadata/languages/:", err);
      }
    }
    loadLanguages();
    return () => {
      active = false;
    };
  }, [initialValues.language, initialValues.languageId, initialValues.language_id]);

  useEffect(() => {
    const query = coAuthorEmail.trim();
    if (query.length < 2) {
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      if (active) {
        setSearchingUsers(true);
      }
      try {
        const results = await datasetsApi.searchUsers(query);
        if (!active) return;
        setUserMatches(
          results.filter((result) => result?.email?.toLowerCase() !== user?.email?.toLowerCase())
        );
      } catch {
        if (active) {
          setUserMatches([]);
        }
      } finally {
        if (active) {
          setSearchingUsers(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [coAuthorEmail, user?.email]);

  const handleInviteEmailChange = (value) => {
    setCoAuthorEmail(value);
    setInviteMsg("");
    if (value.trim().length < 2) {
      setUserMatches([]);
      setSearchingUsers(false);
    }
    if (selectedInviteUser && selectedInviteUser.email !== value) {
      setSelectedInviteUser(null);
    }
  };

  const selectedInviteName = selectedInviteUser?.full_name || selectedInviteUser?.name || "";
  const selectedInviteEmail = selectedInviteUser?.email || coAuthorEmail.trim();
  const selectedPermissionLabel = invitePermission === "edit" ? "Edit" : "View";

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
      languageId,
      language_id: languageId,
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
        <select
          value={languageId || language}
          onChange={(e) => {
            const val = e.target.value;
            const match = languagesList.find(
              (l) => String(l.id) === val || l.name?.toLowerCase() === val.toLowerCase()
            );
            if (match) {
              setLanguage(match.name);
              setLanguageId(match.id);
            } else {
              setLanguage(val);
              setLanguageId("");
            }
          }}
          className={inputClass}
        >
          {languagesList.length > 0 ? (
            languagesList.map((lang) => (
              <option key={lang.id || lang.name} value={lang.id || lang.name}>
                {lang.name} {lang.code ? `(${lang.code.toUpperCase()})` : ""}
              </option>
            ))
          ) : (
            LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))
          )}
        </select>
      </FormField>

      {/* Co-Author Email & Invite Button */}
      <FormField label="Invite Co-Author by Email (Optional)">
        <div className="grid gap-3">
          <div className="relative">
            <input
              type="email"
              value={coAuthorEmail}
              onChange={(e) => handleInviteEmailChange(e.target.value)}
              placeholder="colleague@aastu.edu.et"
              className={inputClass}
              autoComplete="off"
            />
            {coAuthorEmail.trim().length >= 2 && (userMatches.length > 0 || searchingUsers) && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-md border border-[#D9D6CD] bg-white shadow-lg">
                {searchingUsers && (
                  <div className="px-4 py-3 text-sm text-gray-500">Searching users...</div>
                )}
                {!searchingUsers && userMatches.map((match) => (
                  <button
                    key={match.id || match.email}
                    type="button"
                    onClick={() => {
                      setSelectedInviteUser(match);
                      setCoAuthorEmail(match.email);
                      setUserMatches([]);
                      setSearchingUsers(false);
                    }}
                    className="block w-full px-4 py-3 text-left text-sm hover:bg-[#F7F6F2] focus:bg-[#F7F6F2] focus:outline-none"
                  >
                    <span className="block font-semibold text-[#0B1526]">
                      {match.full_name || match.name || match.email}
                    </span>
                    <span className="block text-xs text-gray-500">{match.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {coAuthorEmail.trim().length >= 2 && !searchingUsers && userMatches.length === 0 && !selectedInviteUser && (
            <p className="text-xs text-gray-500">
              No matching account selected. You can still invite this email address.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[#0B1526]">Access</span>
            {[
              { value: "view", label: "View" },
              { value: "edit", label: "Edit" },
            ].map((option) => (
              <label
                key={option.value}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  invitePermission === option.value
                    ? "border-[#A67A0D] bg-[#FFF7E0] text-[#0B1526]"
                    : "border-[#E3E1DA] bg-white text-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="coauthor-permission"
                  value={option.value}
                  checked={invitePermission === option.value}
                  onChange={(e) => setInvitePermission(e.target.value)}
                  className="h-4 w-4 accent-[#A67A0D]"
                />
                {option.label}
              </label>
            ))}
          </div>

          {selectedInviteEmail && (
            <div className="rounded-md border border-[#E3E1DA] bg-[#F7F6F2] px-4 py-3 text-sm">
              <div className="font-semibold text-[#0B1526]">
                {selectedInviteName || selectedInviteEmail}
              </div>
              <div className="text-gray-600">{selectedInviteEmail}</div>
              <div className="mt-1 text-xs font-semibold uppercase text-[#A67A0D]">
                {selectedPermissionLabel} access
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={inviting || !coAuthorEmail.trim()}
            onClick={async () => {
              if (!coAuthorEmail.trim()) return;
              setInviting(true);
              setInviteMsg("");
              try {
                await onInvite?.({
                  email: selectedInviteEmail,
                  title: title.trim() || "Untitled dataset",
                  permission: invitePermission,
                });
                setCoAuthors((prev) => [
                  ...prev,
                  `${selectedInviteName ? `${selectedInviteName} ` : ""}<${selectedInviteEmail}> (${selectedPermissionLabel} access)`,
                ]);
                setCoAuthorEmail("");
                setSelectedInviteUser(null);
                setUserMatches([]);
                setSearchingUsers(false);
                setInvitePermission("view");
                setInviteMsg("Co-author invitation sent successfully!");
              } catch (err) {
                setInviteMsg(err?.message || "Failed to invite co-author.");
              } finally {
                setInviting(false);
              }
            }}
            className="w-fit px-5 py-3 bg-[#A67A0D] hover:bg-[#8f690b] text-white text-sm font-semibold rounded-md disabled:opacity-50 shrink-0 transition-colors"
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
