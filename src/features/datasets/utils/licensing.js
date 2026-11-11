export const DEFAULT_LICENSE_KEY = "CC-BY-4.0";

export const SUPPORTED_LICENSES = [
  {
    key: "CC0-1.0",
    short_name: "CC0 1.0",
    name: "CC0 1.0 Universal",
    full_name: "Creative Commons Zero v1.0 Universal (CC0 1.0)",
    description: "Free to share, adapt, and build upon for any purpose with no copyright restrictions worldwide.",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    is_restricted: false,
    badge_color: "green",
    badge_classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "CC-BY-4.0",
    short_name: "CC BY 4.0",
    name: "Creative Commons Attribution 4.0",
    full_name: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    description: "Allows redistribution and adaptation in any format or medium, provided credit is appropriately given to the creators.",
    url: "https://creativecommons.org/licenses/by/4.0/",
    is_restricted: false,
    badge_color: "blue",
    badge_classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "CC-BY-SA-4.0",
    short_name: "CC BY-SA 4.0",
    name: "Creative Commons Attribution-ShareAlike 4.0",
    full_name: "Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)",
    description: "Allows remixing and adaptation even commercially, provided attribution is given and derivative works are licensed under identical terms.",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    is_restricted: false,
    badge_color: "indigo",
    badge_classes: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    key: "AASTU-RESTRICTED",
    short_name: "AASTU Restricted",
    name: "AASTU Restricted Research License",
    full_name: "AASTU-Approved Restricted Research Data License",
    description: "Data access is subject to institutional approval, non-commercial academic research only, strict confidentiality, and institutional data-governance rules.",
    url: "https://www.aastu.edu.et",
    is_restricted: true,
    badge_color: "amber",
    badge_classes: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "CC-BY-NC-4.0",
    short_name: "CC BY-NC 4.0",
    name: "Creative Commons Attribution-NonCommercial 4.0",
    full_name: "Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)",
    description: "Allows non-commercial reuse and remixing with proper attribution. Commercial exploitation is prohibited without prior consent.",
    url: "https://creativecommons.org/licenses/by-nc/4.0/",
    is_restricted: false,
    badge_color: "purple",
    badge_classes: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

export function getLicenseInfo(licenseKey) {
  if (!licenseKey) return SUPPORTED_LICENSES.find((l) => l.key === DEFAULT_LICENSE_KEY);
  return (
    SUPPORTED_LICENSES.find((l) => l.key === licenseKey) ||
    SUPPORTED_LICENSES.find((l) => l.short_name.toLowerCase() === licenseKey.toLowerCase()) ||
    SUPPORTED_LICENSES.find((l) => l.name.toLowerCase() === licenseKey.toLowerCase()) ||
    SUPPORTED_LICENSES.find((l) => l.key === DEFAULT_LICENSE_KEY)
  );
}
