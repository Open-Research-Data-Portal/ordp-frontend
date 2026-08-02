export default function FormField({ label, required, hint, children }) {
  return (
    <div className="mb-6">
      {label && (
        <label className="block text-base font-semibold mb-2">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="mt-1.5 text-sm text-gray-500 text-right">{hint}</p>}
    </div>
  );
}