import { useState } from "react";
import FormField from "../../../components/FormField";
import TagInput from "../../../components/TagInput";

const DEPARTMENTS = [
  "Software Engineering",
  "HPC and Big Data Analytics CoE",
  "Electrical & Computer Engineering",
  "Civil Engineering",
];

export default function DetailsForm({ initialValues = {}, onNext }) {
  const [title, setTitle] = useState(initialValues.title || "");
  const [description, setDescription] = useState(initialValues.description || "");
  const [department, setDepartment] = useState(initialValues.department || "");
  const [language, setLanguage] = useState(initialValues.language || "English");
  const [authors, setAuthors] = useState(initialValues.authors || []);
  const [relatedPublication, setRelatedPublication] = useState(initialValues.relatedPublication || "");
  const [error, setError] = useState("");

  const handleContinue = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Dataset title is required.");
      return;
    }
    onNext({ title, description, department, language, authors, relatedPublication });
  };

  const inputClass = "w-full px-4 py-3 border border-[#E3E1DA] rounded-md text-base bg-white focus:outline-none focus:border-navy";

  return (
    <form className="bg-white border border-[#E3E1DA] shadow-lg rounded-lg p-10" onSubmit={handleContinue}>
      <h1 className="text-3xl text-navy m-0 mb-2">Details Entry</h1>
      <p className="text-base text-gray-500 mb-8">
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

      <div className="grid grid-cols-2 gap-6">
        <FormField label="Department / Research Group">
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
            <option value="">Select Department</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </FormField>
        <FormField label="Language">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
            <option>English</option>
            <option>Amharic</option>
          </select>
        </FormField>
      </div>

      <TagInput label="Authors / Contributors" tags={authors} onChange={setAuthors} placeholder="+ Add Author" />

      <FormField label="Related Publication">
        <input type="text" value={relatedPublication} onChange={(e) => setRelatedPublication(e.target.value)}
          placeholder="DOI, URL, or Citation string of the primary paper" className={inputClass} />
      </FormField>

      {error && <p className="text-danger text-sm mt-2">{error}</p>}

      <div className="flex justify-end mt-10 pt-6 border-t border-[#E3E1DA]">
        <button type="submit" className="bg-gold hover:bg-gold-dark text-white rounded-md px-7 py-3.5 text-base font-semibold">
          Continue →
        </button>
      </div>
    </form>
  );
}