import { useMemo } from "react";

/**
 * TabularPreview — a spreadsheet-style preview for CSV/tabular file data.
 *
 * Accepts either:
 *   - rows as arrays: [["P0005", "synthetic_ai", 1, 18], ...]
 *   - rows as objects: [{id: "P0005", source: "synthetic_ai", ...}, ...]
 * and normalizes both into the same rendered table.
 *
 * `columns` is optional if rows are objects (keys are used instead), but
 * required for array-shaped rows to know what to label each column.
 *
 * Caps the DOM to `maxRows` (default 20, matching the backend's preview
 * cap) even if more are passed in.
 */
export default function TabularPreview({
  columns = [],
  rows = [],
  maxRows = 20,
  maxHeight = 420,
}) {
  const resolvedColumns = useMemo(() => {
    if (columns.length > 0) return columns;
    if (rows.length > 0 && !Array.isArray(rows[0])) return Object.keys(rows[0]);
    return [];
  }, [columns, rows]);

  const visibleRows = rows.slice(0, maxRows);
  const truncated = rows.length > maxRows;

  if (resolvedColumns.length === 0 || rows.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-gray-400">
        No preview data available for this file yet.
      </div>
    );
  }

  return (
    <div>
      <div
        className="overflow-auto border-t border-gray-100"
        style={{ maxHeight }}
      >
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-20 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-right font-semibold text-gray-400 w-12">
                #
              </th>
              {resolvedColumns.map((col, i) => (
                <th
                  key={i}
                  className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-amber-700 uppercase tracking-wide whitespace-nowrap"
                >
                  {String(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rIdx) => {
              const cells = Array.isArray(row)
                ? row
                : resolvedColumns.map((col) => row[col]);
              return (
                <tr
                  key={rIdx}
                  className={rIdx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}
                >
                  <td className="sticky left-0 z-10 bg-inherit border-r border-gray-100 px-3 py-1.5 text-right text-gray-400 font-mono">
                    {rIdx + 1}
                  </td>
                  {cells.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3 py-1.5 text-gray-700 font-mono whitespace-nowrap border-b border-gray-50"
                    >
                      {cell === null || cell === undefined || cell === ""
                        ? <span className="text-gray-300">—</span>
                        : String(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-400 border-t border-gray-100">
        <span>
          {resolvedColumns.length} column{resolvedColumns.length === 1 ? "" : "s"}
        </span>
        <span>
          {truncated
            ? `Showing first ${maxRows} of ${rows.length.toLocaleString()} rows`
            : `${rows.length.toLocaleString()} row${rows.length === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}
