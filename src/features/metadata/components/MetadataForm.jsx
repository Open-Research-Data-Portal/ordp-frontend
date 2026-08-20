import { useEffect, useState } from "react";
import FormField from "../../../components/FormField";
import TagInput from "../../../components/TagInput";
import * as datasetsApi from "../../datasets/hooks/datasetsApi";

const DATA_FORMATS = ["CSV", "JSON/JSONL", "Excel", "Images", "Parquet"];
const CHARACTERISTICS = ["Tabular", "Multivariate", "Time-Series", "Spatial / GIS", "Sequential", "Textual"];

export default function MetadataForm({ initialValues = {}, onNext, onBack }) {
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [categoryId, setCategoryId] = useState(initialValues.category_id || "");
  const [otherCategory, setOtherCategory] = useState(initialValues.other_category || "");
  const [subjectId, setSubjectId] = useState(initialValues.subject_id || "");
  const [sponsorOrGrant, setSponsorOrGrant] = useState(initialValues.sponsorOrGrant || "");
  const [keywords, setKeywords] = useState(initialValues.keywords || []);
  const [dataFormats, setDataFormats] = useState(initialValues.dataFormats || []);
  const [numInstances, setNumInstances] = useState(initialValues.numInstances || "");
  const [numFeatures, setNumFeatures] = useState(initialValues.numFeatures || "");
  const [characteristics, setCharacteristics] = useState(initialValues.characteristics || []);
  const [includesHeaderRow, setIncludesHeaderRow] = useState(initialValues.includesHeaderRow || false);
  const [hasMissingValues, setHasMissingValues] = useState(initialValues.hasMissingValues || false);
  const [sensitiveData, setSensitiveData] = useState(initialValues.sensitiveData || "");
  const [preprocessingSteps, setPreprocessingSteps] = useState(initialValues.preprocessingSteps || "");
  const [citationNotes, setCitationNotes] = useState(initialValues.citationNotes || "");
  const [localError, setLocalError] = useState("");

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
    });
    return () => { isMounted = false; };
  }, []);

  const toggleCheckbox = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  const handleContinue = (e) => {
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
    setLocalError("");
    onNext({
      category_id: resolvedCategoryId,
      other_category: resolvedOtherCategory,
      categoryName: useOtherCategory ? resolvedOtherCategory : selectedCategory?.name || "",
      subject_id: subjectId,
      subjectName: selectedSubject?.name || "",
      sponsorOrGrant,
      keywords, dataFormats, numInstances, numFeatures, characteristics,
      includesHeaderRow, hasMissingValues,
      sensitiveData, preprocessingSteps, citationNotes,
    });
  };

  const inputClass = "w-full px-4 py-3 border border-[#E3E1DA] rounded-md text-sm bg-[#F7F6F2] focus:outline-none focus:border-navy";
  const sectionClass = "my-9 pt-6 border-t border-[#E3E1DA]";
  const sectionTitleClass = "text-xl font-serif font-bold text-[#0B1526] mb-2"
  const checkboxLabelClass = "flex items-center gap-2 text-base";

  return (
    <form className="bg-white border border-[#E3E1DA] shadow-lg rounded-lg p-10" onSubmit={handleContinue}>
      <h2 className="text-xl font-serif font-bold text-[#0B1526] mb-2">Metadata Entry</h2>
      <p className="text-sm text-gray-500 mb-8">
        Provide technical details and characteristics to help other researchers find and use your dataset.
      </p>

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

        <FormField label="Sponsor / Grant">
          <input
            type="text"
            value={sponsorOrGrant}
            onChange={(e) => setSponsorOrGrant(e.target.value)}
            placeholder="e.g., AASTU Research Grant 2025 / NSF Award #…"
            className={inputClass}
          />
        </FormField>

        <TagInput label="Keywords / Tags" tags={keywords} onChange={setKeywords} placeholder="+ Add keyword" />
        <FormField label="Data Format (Select all that apply)">
          <div className="grid grid-cols-3 gap-3">
            {DATA_FORMATS.map((f) => (
              <label key={f} className={checkboxLabelClass}>
                <input type="checkbox" className="w-4 h-4" checked={dataFormats.includes(f)} onChange={() => toggleCheckbox(dataFormats, setDataFormats, f)} />
                {f}
              </label>
            ))}
          </div>
        </FormField>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Technical Details & Statistics</h2>
        <div className="grid grid-cols-2 gap-6">
          <FormField label="Number of Instances">
            <input type="number" value={numInstances} onChange={(e) => setNumInstances(e.target.value)} placeholder="e.g., 50000" className={inputClass} />
          </FormField>
          <FormField label="Number of Features">
            <input type="number" value={numFeatures} onChange={(e) => setNumFeatures(e.target.value)} placeholder="e.g., 25" className={inputClass} />
          </FormField>
        </div>
        <FormField label="Dataset Characteristics">
          <div className="grid grid-cols-3 gap-3">
            {CHARACTERISTICS.map((c) => (
              <label key={c} className={checkboxLabelClass}>
                <input type="checkbox" className="w-4 h-4" checked={characteristics.includes(c)} onChange={() => toggleCheckbox(characteristics, setCharacteristics, c)} />
                {c}
              </label>
            ))}
          </div>
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <label className={checkboxLabelClass}>
            <input type="checkbox" className="w-4 h-4" checked={includesHeaderRow} onChange={(e) => setIncludesHeaderRow(e.target.checked)} />
            Includes Header Row
          </label>
          <label className={checkboxLabelClass}>
            <input type="checkbox" className="w-4 h-4" checked={hasMissingValues} onChange={(e) => setHasMissingValues(e.target.checked)} />
            Has Missing Values
          </label>
        </div>
      </section>

      {/* NOTE: "Sensitive Data Disclosure" was marked ambiguous (??) in the advisor's
          feedback — left in place for now. Confirm with your advisor whether to keep
          or remove, then update here accordingly. */}
      <FormField label="Sensitive Data & Ethics (Optional)">
        <textarea value={sensitiveData} onChange={(e) => setSensitiveData(e.target.value)}
          placeholder="List any PII, ethical considerations, or de-identification steps taken" className={`${inputClass} resize-y`} rows={3} />
      </FormField>

      <div className="grid grid-cols-2 gap-6">
        <FormField label="Data Preprocessing Performed (Optional)">
          <textarea value={preprocessingSteps} onChange={(e) => setPreprocessingSteps(e.target.value)}
            placeholder="Outline cleaning, scaling, or transformation logic" className={`${inputClass} resize-y`} rows={3} />
        </FormField>
        <FormField label="Additional Information / Citation Notes">
          <textarea value={citationNotes} onChange={(e) => setCitationNotes(e.target.value)}
            placeholder="Special instructions for citing this specific dataset" className={`${inputClass} resize-y`} rows={3} />
        </FormField>
      </div>

      {localError && <p className="text-danger text-sm mt-2">{localError}</p>}

      <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#E3E1DA]">
        <button type="button" className="text-gray-500 text-base font-semibold" onClick={onBack}>← Back</button>
        <button type="submit" className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-7 py-3.5 text-base font-semibold">Continue →</button>
      </div>
    </form>
  );
}