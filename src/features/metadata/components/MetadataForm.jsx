import { useEffect, useState } from "react";
import FormField from "../../../components/FormField";
import TagInput from "../../../components/TagInput";
import * as datasetsApi from "../../datasets/hooks/datasetsApi";

const DATA_FORMATS = [
  "CSV",
  "TSV / Tab-separated values",
  "JSON",
  "JSONL / Newline-delimited JSON",
  "Excel (.xlsx, .xls)",
  "HDF5",
  "NetCDF",
  "Parquet",
  "XML",
  "SQLite / Database files",
  "MATLAB (.mat)",
  "RData / RDS",
  "GeoJSON / Shapefile",
  "Images (JPEG, PNG, TIFF, etc.)",
  "Audio (WAV, MP3, FLAC, etc.)",
  "Video (MP4, AVI, etc.)",
  "PDF / Document files",
  "Plain text / Markdown",
  "ZIP / Compressed archives",
  "Other",
];

const CHARACTERISTICS = [
  "Tabular",
  "Multivariate",
  "Time-Series",
  "Spatial / GIS",
  "Sequential",
  "Textual",
  "Image",
  "Spatiotemporal",
  "Other",
];

export default function MetadataForm({ initialValues = {}, onNext, onBack, isSubmitting = false, submitError = null }) {
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [categoryId, setCategoryId] = useState(initialValues.category_id || "");
  const [otherCategory, setOtherCategory] = useState(initialValues.other_category || "");
  const [subjectId, setSubjectId] = useState(initialValues.subject_id || "");
  const [keywords, setKeywords] = useState(initialValues.keywords || []);
  const [dataFormats, setDataFormats] = useState(initialValues.dataFormats || []);
  const [characteristics, setCharacteristics] = useState(initialValues.characteristics || []);

  // Tabular-specific — only shown when "Tabular" is selected
  const [numInstances, setNumInstances] = useState(initialValues.numInstances || "");
  const [numFeatures, setNumFeatures] = useState(initialValues.numFeatures || "");
  const [includesHeaderRow, setIncludesHeaderRow] = useState(initialValues.includesHeaderRow || false);
  const [hasMissingValues, setHasMissingValues] = useState(initialValues.hasMissingValues || false);

  // Always-visible additional fields
  const [instancesRepresent, setInstancesRepresent] = useState(initialValues.instancesRepresent || "");
  const [collectionMethod, setCollectionMethod] = useState(initialValues.collectionMethod || "");
  const [recommendedSplits, setRecommendedSplits] = useState(initialValues.recommendedSplits || "");
  const [sensitiveData, setSensitiveData] = useState(initialValues.sensitiveData || "");
  const [preprocessingSteps, setPreprocessingSteps] = useState(initialValues.preprocessingSteps || "");
  const [citationNotes, setCitationNotes] = useState(initialValues.citationNotes || "");

  const [localError, setLocalError] = useState("");

  const isTabular = characteristics.includes("Tabular");

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      datasetsApi.listCategories(),
      datasetsApi.listSubjects(),
    ]).then(([catsRes, subsRes]) => {
      if (!isMounted) return;
      if (catsRes.status === "fulfilled") {
        setCategories(Array.isArray(catsRes.value) ? catsRes.value : []);
      }
      if (subsRes.status === "fulfilled") {
        setSubjects(Array.isArray(subsRes.value) ? subsRes.value : []);
      }
      if (subsRes.status !== "fulfilled" || !Array.isArray(subsRes.value) || subsRes.value.length === 0) {
        setSubjects(catsRes.status === "fulfilled" && Array.isArray(catsRes.value) ? catsRes.value : []);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const toggleCheckbox = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  const handleContinue = async (e) => {
    e.preventDefault();
    const useOtherCategory = categoryId === "__other__";
    const resolvedCategoryId = useOtherCategory ? "" : categoryId;
    const resolvedOtherCategory = useOtherCategory ? otherCategory.trim() : "";

    if (!resolvedCategoryId && !resolvedOtherCategory) {
      setLocalError("Please select a category or describe a new one.");
      return;
    }
    if (!subjectId) {
      setLocalError("Please select a subject.");
      return;
    }
    if (keywords.length < 1) {
      setLocalError("Please add at least one keyword.");
      return;
    }
    setLocalError("");
    await onNext({
      category_id: resolvedCategoryId,
      other_category: resolvedOtherCategory,
      categoryName: useOtherCategory ? resolvedOtherCategory : selectedCategory?.name || "",
      subject_id: subjectId,
      subjectName: selectedSubject?.name || "",
      keywords,
      dataFormats,
      characteristics,
      // Tabular-specific (cleared when Tabular is not selected)
      numInstances: isTabular ? numInstances : "",
      numFeatures: isTabular ? numFeatures : "",
      includesHeaderRow: isTabular ? includesHeaderRow : false,
      hasMissingValues: isTabular ? hasMissingValues : false,
      // Always-visible additional fields
      instancesRepresent,
      collectionMethod,
      recommendedSplits,
      sensitiveData,
      preprocessingSteps,
      citationNotes,
    });
  };

  const inputClass = "w-full px-4 py-3 border border-[#E3E1DA] rounded-md text-sm bg-[#F7F6F2] focus:outline-none focus:border-navy";
  const sectionClass = "my-9 pt-6 border-t border-[#E3E1DA]";
  const sectionTitleClass = "text-xl font-serif font-bold text-[#0B1526] mb-2";
  const checkboxLabelClass = "flex items-center gap-2 text-sm";

  return (
    <form className="bg-white border border-[#E3E1DA] shadow-lg rounded-lg p-10" onSubmit={handleContinue}>
      <h2 className="text-xl font-serif font-bold text-[#0B1526] mb-2">Metadata Entry</h2>
      <p className="text-sm text-gray-500 mb-8">
        Provide technical details and characteristics to help other researchers find and use your dataset.
      </p>

      {/* ── Core Metadata ── */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Core Metadata</h2>
        <div className="grid grid-cols-2 gap-6">
          <FormField label="Category" required>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__other__">Other (suggest a new category)</option>
            </select>
          </FormField>
          <FormField label="Subject">
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputClass}>
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
        </div>

        {categoryId === "__other__" && (
          <FormField label="New Category Name" required>
            <input
              type="text"
              value={otherCategory}
              onChange={(e) => setOtherCategory(e.target.value)}
              placeholder="e.g., Computational Linguistics"
              className={inputClass}
            />
          </FormField>
        )}

        <TagInput label="Keywords / Tags" required tags={keywords} onChange={setKeywords} placeholder="+ Add keyword" />
        <p className="-mt-4 mb-6 text-sm text-gray-500">At least 3 keywords recommended. Press Enter to add a tag.</p>

        <FormField label="Data Format (Select all that apply)" required>
          <div className="grid grid-cols-3 gap-3">
            {DATA_FORMATS.map((f) => (
              <label key={f} className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="w-4 h-4 shrink-0"
                  checked={dataFormats.includes(f)}
                  onChange={() => toggleCheckbox(dataFormats, setDataFormats, f)}
                />
                {f}
              </label>
            ))}
          </div>
        </FormField>
      </section>

      {/* ── Dataset Characteristics ── */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Dataset Characteristics</h2>

        <FormField label="Dataset Characteristics (Optional)">
          <div className="grid grid-cols-3 gap-3">
            {CHARACTERISTICS.map((c) => (
              <label key={c} className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="w-4 h-4 shrink-0"
                  checked={characteristics.includes(c)}
                  onChange={() => toggleCheckbox(characteristics, setCharacteristics, c)}
                />
                {c}
              </label>
            ))}
          </div>
        </FormField>

        {/* Tabular-specific — only visible when "Tabular" is checked */}
        {isTabular && (
          <div className="mt-6 p-5 border border-[#E3E1DA] rounded-lg bg-[#FBFAF7]">
            <p className="text-sm font-semibold text-[#0B1526] mb-4">Tabular Dataset Details</p>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <FormField label="Number of Instances (Rows)">
                <input
                  type="number"
                  value={numInstances}
                  onChange={(e) => setNumInstances(e.target.value)}
                  placeholder="e.g., 50000"
                  className={inputClass}
                  min="0"
                />
              </FormField>
              <FormField label="Number of Features / Variables">
                <input
                  type="number"
                  value={numFeatures}
                  onChange={(e) => setNumFeatures(e.target.value)}
                  placeholder="e.g., 25"
                  className={inputClass}
                  min="0"
                />
              </FormField>
            </div>

            <div className="flex gap-8">
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={includesHeaderRow}
                  onChange={(e) => setIncludesHeaderRow(e.target.checked)}
                />
                Data has a header row
              </label>
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={hasMissingValues}
                  onChange={(e) => setHasMissingValues(e.target.checked)}
                />
                Data has missing values
              </label>
            </div>
          </div>
        )}
      </section>

      {/* ── Additional Metadata ── */}
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Additional Metadata</h2>

        <FormField label="What do the instances represent? (Optional)">
          <textarea
            value={instancesRepresent}
            onChange={(e) => setInstancesRepresent(e.target.value)}
            placeholder="e.g., documents, photos, people, countries, sensor readings…"
            className={`${inputClass} resize-y`}
            rows={2}
          />
        </FormField>

        <FormField label="How the data were collected / generated (Optional)">
          <textarea
            value={collectionMethod}
            onChange={(e) => setCollectionMethod(e.target.value)}
            placeholder="1–3 sentences describing the collection or generation method…"
            className={`${inputClass} resize-y`}
            rows={3}
          />
        </FormField>

        <FormField label="Recommended Data Splits (Optional)">
          <textarea
            value={recommendedSplits}
            onChange={(e) => setRecommendedSplits(e.target.value)}
            placeholder="e.g., training (70%), validation (15%), testing (15%)…"
            className={`${inputClass} resize-y`}
            rows={2}
          />
        </FormField>

        <FormField label="Sensitive Data Disclosure (Optional)">
          <textarea
            value={sensitiveData}
            onChange={(e) => setSensitiveData(e.target.value)}
            placeholder="e.g., racial or ethnic origin, sexual orientation, religious beliefs, political opinions, or union memberships…"
            className={`${inputClass} resize-y`}
            rows={3}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-6">
          <FormField label="Data Preprocessing Performed (Optional)">
            <textarea
              value={preprocessingSteps}
              onChange={(e) => setPreprocessingSteps(e.target.value)}
              placeholder="e.g., tokenization, discretization, removal of instances, processing of missing values…"
              className={`${inputClass} resize-y`}
              rows={3}
            />
          </FormField>
          <FormField label="Additional Information / Citation Notes (Optional)">
            <textarea
              value={citationNotes}
              onChange={(e) => setCitationNotes(e.target.value)}
              placeholder="Any further context, plus preferred citation format if the dataset is made public…"
              className={`${inputClass} resize-y`}
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4 rounded-lg bg-[#EAF0FB] px-5 py-3 text-sm text-[#2C5AAE]">
          ⓘ A persistent identifier (DOI or equivalent) will be assigned automatically when the dataset is published.
        </div>
      </section>

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

      <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#E3E1DA]">
        <button type="button" className="text-gray-500 text-base font-semibold" onClick={onBack}>← Back</button>
        <button type="submit" disabled={isSubmitting} className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-7 py-3.5 text-base font-semibold disabled:opacity-60">{isSubmitting ? "Saving…" : "Continue →"}</button>
      </div>
    </form>
  );
}
