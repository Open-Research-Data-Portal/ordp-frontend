const DATA_TYPES = ["Integer", "Float", "String", "Boolean", "Date"];
const ROLES = ["Feature", "Target", "Identifier"];
let nextId = 1;

export default function VariableSpecificationTable({ variables, onChange }) {
  const addRow = () => {
    onChange([...variables, { id: `var-${nextId++}`, name: "", dataType: "Integer", role: "Feature", description: "" }]);
  };
  const updateRow = (id, field, value) => {
    onChange(variables.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };
  const removeRow = (id) => onChange(variables.filter((v) => v.id !== id));

  const smallInput = "w-full px-3 py-2 border border-[#E3E1DA] rounded-md text-base bg-white focus:outline-none focus:border-navy";

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl text-navy m-0">Variable Specification (Tabular Only)</h2>
        <button type="button" className="bg-white border border-[#E3E1DA] rounded-md px-4 py-2 text-sm font-semibold" onClick={addRow}>
          + Add Row
        </button>
      </div>
      {variables.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Variable Name", "Data Type", "Role", "Description", ""].map((h) => (
                <th key={h} className="text-left text-sm text-gray-500 bg-[#F3F2EE] px-3 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variables.map((v) => (
              <tr key={v.id}>
                <td className="px-3 py-2.5 border-b border-[#E3E1DA]">
                  <input type="text" value={v.name} onChange={(e) => updateRow(v.id, "name", e.target.value)} className={smallInput} />
                </td>
                <td className="px-3 py-2.5 border-b border-[#E3E1DA]">
                  <select value={v.dataType} onChange={(e) => updateRow(v.id, "dataType", e.target.value)} className={smallInput}>
                    {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2.5 border-b border-[#E3E1DA]">
                  <select value={v.role} onChange={(e) => updateRow(v.id, "role", e.target.value)} className={smallInput}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2.5 border-b border-[#E3E1DA]">
                  <input type="text" value={v.description} onChange={(e) => updateRow(v.id, "description", e.target.value)}
                    placeholder="Explain the variable..." className={smallInput} />
                </td>
                <td className="px-3 py-2.5 border-b border-[#E3E1DA]">
                  <button type="button" className="text-danger text-lg" onClick={() => removeRow(v.id)} aria-label={`Remove ${v.name || "row"}`}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}