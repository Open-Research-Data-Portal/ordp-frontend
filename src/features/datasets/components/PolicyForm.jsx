import { useState } from "react";

export default function PolicyForm({ initialValues = {}, onSubmit, onBack, isSubmitting, submitError }) {
  const [ownership, setOwnership] = useState(initialValues.ownership || false);
  const [piiRemoval, setPiiRemoval] = useState(initialValues.piiRemoval || false);
  const [licenseConsent, setLicenseConsent] = useState(initialValues.licenseConsent || false);
  const [error, setError] = useState("");

  const allChecked = ownership && piiRemoval && licenseConsent;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!allChecked) { setError("All three confirmations are required before submitting."); return; }
    setError("");
    onSubmit({ ownership, piiRemoval, licenseConsent });
  };

  const handleSaveDraft = () => onSubmit({ ownership, piiRemoval, licenseConsent, isDraft: true });

  const checkRow = "flex gap-4 items-start p-5 border border-[#E3E1DA] rounded-lg mb-4 cursor-pointer";

  return (
    <form className="bg-white border border-[#E3E1DA] shadow-lg rounded-lg p-10" onSubmit={handleSubmit}>
      <h1 className="text-3xl text-navy m-0 mb-2">Finalize Your Submission</h1>
      <p className="text-base text-gray-500 mb-8">
        Please review the institutional policies regarding data donation and provide your final legal consent to publish this dataset on the AASTU repository.
      </p>

      <div className="bg-[#F7F5F0] rounded-lg p-6 text-base text-gray-500 mb-6">
        <p className="font-bold text-navy text-lg m-0 mb-3">🏛 Institutional Contribution Policy</p>
        <p>
          By contributing to the Addis Ababa Science and Technology University (AASTU) Research Portal,
          you are participating in a global knowledge-sharing initiative. All donated datasets are
          subject to the <strong>Open Access Research Framework (v2.1)</strong>.
        </p>
        <ul className="list-disc pl-6">
          <li>The repository serves as a permanent, immutable record for academic validation.</li>
          <li>Data will be indexed by global research crawlers and made discoverable via DOI.</li>
          <li>Contributors retain authorship credit while granting AASTU a non-exclusive, perpetual license to host and distribute the content.</li>
        </ul>
      </div>

      <label className={checkRow}>
        <input type="checkbox" className="mt-1 w-5 h-5" checked={ownership} onChange={(e) => setOwnership(e.target.checked)} />
        <span>
          <strong className="block text-base mb-1.5">Data Ownership Confirmation</strong>
          <p className="m-0 text-sm text-gray-500">I certify that I am the legal owner or authorized representative of this dataset and have the right to grant publishing permissions.</p>
        </span>
      </label>

      <label className={checkRow}>
        <input type="checkbox" className="mt-1 w-5 h-5" checked={piiRemoval} onChange={(e) => setPiiRemoval(e.target.checked)} />
        <span>
          <strong className="block text-base mb-1.5">PII Removal Confirmation</strong>
          <p className="m-0 text-sm text-gray-500">I confirm that all Personally Identifiable Information (PII) and sensitive human-subject data have been fully anonymized according to institutional IRB guidelines.</p>
        </span>
      </label>

      <label className={checkRow}>
        <input type="checkbox" className="mt-1 w-5 h-5" checked={licenseConsent} onChange={(e) => setLicenseConsent(e.target.checked)} />
        <span>
          <strong className="block text-base mb-1.5">License & DOI Consent</strong>
          <p className="m-0 text-sm text-gray-500">I agree to release this data under the selected license and understand that a permanent Digital Object Identifier (DOI) will be minted upon approval.</p>
        </span>
      </label>

      <div className="bg-[#EAF0FB] rounded-lg px-5 py-4 text-sm text-[#2C5AAE] my-5">
        ⓘ Static Review Notice: Your submission will enter a 48-hour administrative review queue.
        AASTU Librarians will verify metadata accuracy and file integrity before the dataset becomes
        public. You will be notified via email once the review is complete.
      </div>

      {error && <p className="text-danger text-sm mt-2">{error}</p>}
      {submitError && <p className="text-danger text-sm mt-2">{submitError}</p>}

      <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#E3E1DA]">
        <button type="button" className="text-gray-500 text-base font-semibold" onClick={onBack}>← Back</button>
        <div className="flex gap-4">
          <button type="button" className="bg-white border border-[#E3E1DA] rounded-md px-6 py-3.5 text-base font-semibold disabled:opacity-60"
            onClick={handleSaveDraft} disabled={isSubmitting}>
            Save as Draft
          </button>
          <button type="submit" className="bg-gold hover:bg-gold-dark text-white rounded-md px-7 py-3.5 text-base font-semibold disabled:opacity-60"
            disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit for Review"}
          </button>
        </div>
      </div>
    </form>
  );
}