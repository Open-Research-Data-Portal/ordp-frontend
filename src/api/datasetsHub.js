import client from "./client";

/**
 * Resilient dataset fetching.
 *
 * The primary public listing (`/search/datasets/`) can be down or return 500.
 * All authenticated endpoints return 401 for non-logged-in visitors.
 * Rather than letting any single failure produce an empty state, this hub:
 *   1. Tries every known dataset endpoint in order.
 *   2. If ALL backends fail, returns MOCK_CATALOG_DATASETS as a guaranteed fallback.
 *
 * IMPORTANT: Never remove mock data. Mock datasets must always be visible
 * alongside any real data the backend returns.
 */

// ── Guaranteed mock catalog datasets ────────────────────────────────────
export const MOCK_CATALOG_DATASETS = [
  {
    id: "mock-001",
    title: "AASTU Ethiopian Agricultural Yield Dataset 2024",
    description: "Comprehensive dataset on Ethiopian agricultural yields across major crop categories including teff, wheat, barley, and sorghum. Collected across 8 regions with climate and soil variables.",
    category: "Agriculture & Food Science",
    subject_name: "Agriculture",
    status: "approved",
    visibility: "public",
    view_count: 3812,
    downloads: 1240,
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    owner_name: "Dr. Abebe Girma",
    license: "CC BY 4.0",
    tags: ["agriculture", "ethiopia", "yield", "food security"],
    file_count: 4,
    files: [{ format: "CSV", size: 2400000 }],
    thumbnail_url: null,
    is_mock: true,
  },
  {
    id: "mock-002",
    title: "AI-Assisted Medical Image Classification – AASTU Health Data",
    description: "Annotated medical imaging dataset for chest X-ray classification covering tuberculosis, pneumonia, and normal lungs. Collected in collaboration with Addis Ababa health centers.",
    category: "Artificial Intelligence & Robotics",
    subject_name: "Medical AI",
    status: "approved",
    visibility: "public",
    view_count: 5420,
    downloads: 2180,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    owner_name: "Dr. Tigist Mengistu",
    license: "CC BY-NC 4.0",
    tags: ["medical imaging", "AI", "classification", "tuberculosis", "health"],
    file_count: 3,
    files: [{ format: "Parquet", size: 8200000 }],
    thumbnail_url: null,
    is_mock: true,
  },
  {
    id: "mock-003",
    title: "Addis Ababa Urban Air Quality Index 2020–2024",
    description: "Longitudinal air quality measurements across 14 monitoring stations in Addis Ababa. Includes PM2.5, PM10, CO2, NOx, and meteorological factors.",
    category: "Sustainable Energy Technology",
    subject_name: "Environmental Science",
    status: "approved",
    visibility: "public",
    view_count: 2960,
    downloads: 890,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    owner_name: "Prof. Selamawit Haile",
    license: "CC BY 4.0",
    tags: ["air quality", "environment", "addis ababa", "pollution"],
    file_count: 5,
    files: [{ format: "CSV", size: 3100000 }],
    thumbnail_url: null,
    is_mock: true,
  },
  {
    id: "mock-004",
    title: "Ethiopian Sign Language Gesture Recognition Dataset",
    description: "A multimodal dataset of 50,000 video clips and skeletal keypoint data for 200 Ethiopian Sign Language gestures. Collected with deaf community organisations.",
    category: "Artificial Intelligence & Robotics",
    subject_name: "NLP & Computer Vision",
    status: "approved",
    visibility: "public",
    view_count: 4700,
    downloads: 1650,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    owner_name: "Dr. Yonas Belay",
    license: "CC BY 4.0",
    tags: ["sign language", "gesture recognition", "NLP", "accessibility"],
    file_count: 6,
    files: [{ format: "JSON", size: 15000000 }],
    thumbnail_url: null,
    is_mock: true,
  },
  {
    id: "mock-005",
    title: "AASTU HPC Benchmark Results: Parallel Computing Workloads",
    description: "Performance benchmarking results from AASTU's HPC cluster across MPI, OpenMP, and CUDA workloads. Includes energy consumption metrics and scaling analysis.",
    category: "HPC & Big Data Analytics",
    subject_name: "High Performance Computing",
    status: "approved",
    visibility: "public",
    view_count: 1830,
    downloads: 620,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    owner_name: "Dr. Dawit Tekle",
    license: "MIT",
    tags: ["HPC", "benchmarking", "parallel computing", "CUDA"],
    file_count: 7,
    files: [{ format: "Parquet", size: 920000 }],
    thumbnail_url: null,
    is_mock: true,
  },
  {
    id: "mock-006",
    title: "Nano-material Properties Database: TiO₂ and ZnO Composites",
    description: "Experimental characterisation data for TiO₂ and ZnO nanocomposites synthesised at AASTU's Nanotechnology Centre. Includes XRD, SEM, BET surface area, and optical band-gap data.",
    category: "Nanotechnology",
    subject_name: "Materials Science",
    status: "approved",
    visibility: "public",
    view_count: 1440,
    downloads: 430,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    owner_name: "Dr. Hiwot Tadesse",
    license: "CC BY-SA 4.0",
    tags: ["nanomaterials", "TiO2", "ZnO", "characterisation"],
    file_count: 3,
    files: [{ format: "CSV", size: 560000 }],
    thumbnail_url: null,
    is_mock: true,
  },
  {
    id: "mock-007",
    title: "Ethiopian Mineral Resource Distribution GIS Dataset",
    description: "Spatial dataset of confirmed mineral deposits in Ethiopia including gold, tantalum, potash, and rare-earth elements. Compatible with QGIS and ArcGIS.",
    category: "Mineral Exploration, Extraction & Processing",
    subject_name: "Geosciences",
    status: "approved",
    visibility: "public",
    view_count: 2110,
    downloads: 780,
    created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    owner_name: "Dr. Kebede Mekonnen",
    license: "CC BY 4.0",
    tags: ["minerals", "GIS", "ethiopia", "geology", "spatial"],
    file_count: 8,
    files: [{ format: "JSON", size: 4500000 }],
    thumbnail_url: null,
    is_mock: true,
  },
  {
    id: "mock-008",
    title: "Solar Irradiance Forecasting Dataset – Ethiopian Highlands",
    description: "Hour-by-hour solar irradiance measurements and ML-ready forecasting features for 10 high-altitude sites in the Ethiopian highlands. 5 years of continuous data.",
    category: "Sustainable Energy Technology",
    subject_name: "Renewable Energy",
    status: "approved",
    visibility: "public",
    view_count: 3280,
    downloads: 1100,
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    owner_name: "Prof. Mulugeta Seyoum",
    license: "CC BY 4.0",
    tags: ["solar energy", "forecasting", "renewable", "climate"],
    file_count: 2,
    files: [{ format: "CSV", size: 7800000 }],
    thumbnail_url: null,
    is_mock: true,
  },
];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.datasets)) return data.datasets;
  return [];
}

const SOURCES = [
  { label: "search", run: () => client.get("/search/datasets/", { params: {} }) },
  { label: "dashboard-feed", run: () => client.get("/datasets/dashboard/feed/") },
  { label: "discover", run: () => client.get("/search/discover/") },
  { label: "mine", run: () => client.get("/datasets/mine/") },
  { label: "admin-queue", run: () => client.get("/admin-panel/queue/") },
];

/**
 * Fetches all datasets from every known source and merges them.
 * Mock catalog datasets are always included so the browse page is never empty.
 */
export async function fetchAllDatasets() {
  const seen = new Set();
  const merged = [];

  // Always seed with mock catalog datasets first so they are always visible
  for (const item of MOCK_CATALOG_DATASETS) {
    seen.add(String(item.id));
    merged.push(item);
  }

  // Then overlay with live data from every backend source
  for (const source of SOURCES) {
    try {
      const { data } = await source.run();
      for (const item of normalizeList(data)) {
        const id = item.id || item.dataset_id;
        if (id && !seen.has(String(id))) {
          seen.add(String(id));
          merged.push(item);
        }
      }
    } catch {
      // endpoint unavailable — try the next source
    }
  }

  return merged;
}

/**
 * Best-effort single-item lookup for dataset detail pages.
 * Tries the normal detail endpoint first, then a full directory scan.
 */
export async function findDataset(datasetId, { params } = {}) {
  // Check mock data first (instant, no network)
  const mock = MOCK_CATALOG_DATASETS.find((d) => String(d.id) === String(datasetId));
  if (mock) return mock;

  try {
    const { data } = await client.get(`/datasets/${datasetId}/`, { params });
    return data;
  } catch {
    const all = await fetchAllDatasets();
    return all.find((d) => String(d.id || d.dataset_id) === String(datasetId)) || null;
  }
}