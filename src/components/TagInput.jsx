import { useState } from "react";

export default function TagInput({ label, tags, onChange, placeholder }) {
  const [value, setValue] = useState("");

  const addTag = () => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setValue("");
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="mb-6">
      {label && <label className="block text-base font-semibold mb-2">{label}</label>}
      <div className="flex flex-wrap gap-2 p-3 border border-[#E3E1DA] rounded-md bg-white transition-colors duration-150 focus-within:border-navy">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1.5 bg-gold text-white rounded-full px-3 py-1.5 text-sm animate-[chipIn_0.2s_ease-out]">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}
              className="text-white transition-transform duration-150 hover:scale-125">×</button>
          </span>
        ))}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={placeholder}
          className="border-none outline-none flex-1 min-w-[140px] text-base"
        />
      </div>
    </div>
  );
}