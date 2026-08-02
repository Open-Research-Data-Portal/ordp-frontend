import { useState } from "react";
import FormField from "../../../components/FormField";
import TagInput from "../../../components/TagInput";
import VariableSpecificationTable from "./VariableSpecificationTable";

const CATEGORIES = ["Computer Science & AI", "Environmental Science", "Public Health", "Social Sciences"];
const LICENSES = ["CC BY 4.0", "CC BY-NC 4.0", "CC0 1.0", "Restricted"];
const DATA_FORMATS = ["CSV", "JSON", "HDF5", "Images", "Excel", "Other"];
const CHARACTERISTICS = ["Tabular", "Multivariate", "Time-Series", "Spatial / GIS", "Sequential", "Textual"];

export default function MetadataForm({ initialValues = {}, onNext, onBack }) {
  const [category, setCategory] = useState(initialValues.category || "");
  const [license, setLicense] = useState(initialValues.license || "CC BY 4.0");
  const [keywords, setKeywords] = useState(initialValues.keywords || []);
  const [dataFormats, setDataFormats] = useState(initialValues.dataFormats || []);
  const [numInstances, setNumInstances] = useState(initialValues.numInstances || "");
  const [numFeatures, setNumFeatures] = useState(initialValues.numFeatures || "");
  const [characteristics, setCharacteristics] = useState(initialValues.characteristics || []);
  const [includesHeaderRow, setIncludesHeaderRow] = useState(initialValues.includesHeaderRow || false);
  const [hasMissingValues, setHasMissingValues] = useState(initialValues.hasMissingValues || false);
  const [variables, setVariables] = useState(initialValues.variables || []);
  const [instancesRepresentation, setInstancesRepresentation] = useState(initialValues.instancesRepresentation || "");
  const [dataSplits, setDataSplits] = useState(initialValues.dataSplits || "");
  const [sensitiveData, setSensitiveData] = useState(initialValues.sensitiveData || "");
  const [preprocessingSteps, setPreprocessingSteps] = useState(initialValues.preprocessingSteps || "");
  const [citationNotes, setCitationNotes] = useState(initialValues.citationNotes || "");

  const toggleCheckbox = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleContinue = (e) => {
    e.preventDefault();
    onNext({
      category, license, keywords, dataFormats, numInstances, numFeatures, characteristics,
      includesHeaderRow, hasMissingValues, variables, instancesRepresentation, dataSplits,
      sensitiveData, preprocessingSteps, citationNotes,
    });
  };

  const inputClass = "w-full px-4 py-3 border border-[#E3E1DA] rounded-md text-base bg-white focus:outline-none focus:border-navy";
  const sectionClass = "my-9 pt-6 border-t border-[#E3E1DA]";
  const sectionTitleClass = "text-xl text-navy m-0 mb-5";
  const checkboxLabelClass = "flex items-center gap-2 text-base";

  return (
    <form className="bg-white border border-[#E3E1DA] shadow-lg rounded-lg p-10" onSubmit={handleContinue}>
      <h1 className="text-3xl text-navy m-0 mb-2">Metadata Entry</h1>
      <p className="text-base text-gray-500 mb-8">
        Provide technical details and characteristics to help other researchers find and use your dataset.
      </p>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Core Metadata</h2>
        <div className="grid grid-cols-2 gap-6">
          <FormField label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="License">
            <select value={license} onChange={(e) => setLicense(e.target.value)} className={inputClass}>
              {LICENSES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </FormField>
        </div>
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

      <section className={sectionClass}>
        <VariableSpecificationTable variables={variables} onChange={setVariables} />
      </section>

      <div className="grid grid-cols-2 gap-6">
        <FormField label="Instances Representation">
          <textarea value={instancesRepresentation} onChange={(e) => setInstancesRepresentation(e.target.value)}
            placeholder="Describe what each instance represents (e.g., 'A single student record')" className={`${inputClass} resize-y`} rows={3} />
        </FormField>
        <FormField label="Data Splits">
          <textarea value={dataSplits} onChange={(e) => setDataSplits(e.target.value)}
            placeholder="Explain train/test/validation split strategy" className={`${inputClass} resize-y`} rows={3} />
        </FormField>
      </div>

      <FormField label="Sensitive Data & Ethics">
        <textarea value={sensitiveData} onChange={(e) => setSensitiveData(e.target.value)}
          placeholder="List any PII, ethical considerations, or de-identification steps taken" className={`${inputClass} resize-y`} rows={3} />
      </FormField>

      <div className="grid grid-cols-2 gap-6">
        <FormField label="Preprocessing Steps">
          <textarea value={preprocessingSteps} onChange={(e) => setPreprocessingSteps(e.target.value)}
            placeholder="Outline cleaning, scaling, or transformation logic" className={`${inputClass} resize-y`} rows={3} />
        </FormField>
        <FormField label="Citation Notes">
          <textarea value={citationNotes} onChange={(e) => setCitationNotes(e.target.value)}
            placeholder="Special instructions for citing this specific dataset" className={`${inputClass} resize-y`} rows={3} />
        </FormField>
      </div>

      <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#E3E1DA]">
        <button type="button" className="text-gray-500 text-base font-semibold" onClick={onBack}>← Back</button>
        <button type="submit" className="bg-gold hover:bg-gold-dark text-white rounded-md px-7 py-3.5 text-base font-semibold">Continue →</button>
      </div>
    </form>
  );
}