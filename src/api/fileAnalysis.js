import client from "./client";

/**
 * Fetch the AI file analysis result for a given file ID (or stored_object ID).
 * @param {string|number} fileId
 * @returns {Promise<Object>} FileAnalysis payload
 */
export async function getFileAnalysis(fileId) {
  if (!fileId) return null;
  const { data } = await client.get(`/files/${fileId}/analysis/`);
  return data;
}

/**
 * Metadata and display attributes for file classification levels (A, B1, B2, C).
 */
export const LEVEL_DEFINITIONS = {
  A: {
    level: "A",
    name: "Structured & Tabular Data",
    shortName: "Level A",
    types: ["CSV", "TSV", "XLSX", "XLS", "Parquet", "JSON Table"],
    color: "emerald",
    bgClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    badgeClass: "bg-emerald-600 text-white",
    description: "Highly structured, machine-actionable data suitable for automated analysis and tabular exploration.",
  },
  B1: {
    level: "B1",
    name: "Documents & Narrative Text",
    shortName: "Level B1",
    types: ["PDF", "DOCX", "TXT", "Markdown"],
    color: "blue",
    bgClass: "bg-blue-50 text-blue-800 border-blue-200",
    badgeClass: "bg-blue-600 text-white",
    description: "Human-readable narrative text, reports, codebooks, or research documentation.",
  },
  B2: {
    level: "B2",
    name: "Media & Scientific Data",
    shortName: "Level B2",
    types: ["Images", "Audio", "Video", "GeoTIFF", "NetCDF", "HDF5", "DICOM"],
    color: "purple",
    bgClass: "bg-purple-50 text-purple-800 border-purple-200",
    badgeClass: "bg-purple-600 text-white",
    description: "Multidimensional scientific arrays, imagery, audio/video streams, or spatial sensor data.",
  },
  C: {
    level: "C",
    name: "Unstructured / Other Formats",
    shortName: "Level C",
    types: ["Archives", "Binaries", "Unsupported Formats"],
    color: "slate",
    bgClass: "bg-slate-100 text-slate-800 border-slate-300",
    badgeClass: "bg-slate-700 text-white",
    description: "Binary data, non-standard archive packages, or file formats without native tabular parsers.",
  },
};

export function getLevelInfo(level) {
  if (!level) return null;
  const norm = String(level).toUpperCase();
  return LEVEL_DEFINITIONS[norm] || {
    level: norm,
    name: `Level ${norm}`,
    shortName: `Level ${norm}`,
    types: [],
    color: "slate",
    bgClass: "bg-slate-100 text-slate-800 border-slate-300",
    badgeClass: "bg-slate-700 text-white",
    description: "Custom format classification.",
  };
}

/**
 * Human-readable check titles and explanations.
 */
export const CHECK_METADATA = {
  type_from_contents: {
    title: "MIME Type & Magic Bytes",
    description: "Identifies the genuine file format from initial byte headers rather than file extension alone.",
  },
  extension_matches: {
    title: "Extension Consistency",
    description: "Verifies that the filename extension matches the detected internal binary format.",
  },
  checksum_verified: {
    title: "SHA-256 Checksum Verification",
    description: "Recomputes SHA-256 cryptographic hash against stored object metadata to ensure zero corruption.",
  },
  not_empty: {
    title: "Non-Empty File Content",
    description: "Confirms file payload is greater than 0 bytes and contains readable stream content.",
  },
  opens_correctly: {
    title: "Format Parsing & Structural Health",
    description: "Validates format structure with standard parsers (CSV delimiter analysis, Excel sheets, PDF headers).",
  },
  password_protected: {
    title: "Encryption & Password Lock",
    description: "Ensures files are open for scientific inquiry and not locked behind passwords or DRM.",
  },
  macros: {
    title: "Macro & Embedded Code Scan",
    description: "Checks for embedded VBA macros or executables that could pose execution security risks.",
  },
  archive_limits: {
    title: "Archive Limits & Zip Bomb Defense",
    description: "Inspects archive directory structure, nesting levels, and uncompressed expansion ratios.",
  },
  malware_scan: {
    title: "Antivirus & Malware Scan",
    description: "Scans payload signatures with ClamAV anti-malware engine to safeguard research consumers.",
  },
};

export function getCheckFriendlyName(name) {
  return CHECK_METADATA[name]?.title || name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getCheckDescription(name) {
  return CHECK_METADATA[name]?.description || "";
}

/**
 * Format bytes into human-friendly string.
 */
export function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let val = Number(bytes);
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
