import { useNavigate } from "react-router-dom";
import {
  Bot,
  Eye,
  Languages,
  Landmark,
  ShieldPlus,
  Leaf,
  Building2,
  Globe,
  UploadCloud,
} from "lucide-react";
import TopBar from "../layouts/TopBar";

const CATEGORIES = [
  { label: "Machine Learning", icon: Bot, slug: "machine-learning" },
  { label: "Computer Vision", icon: Eye, slug: "computer-vision" },
  { label: "NLP", icon: Languages, slug: "nlp" },
  { label: "Finance", icon: Landmark, slug: "finance" },
  { label: "Healthcare", icon: ShieldPlus, slug: "healthcare" },
  { label: "Climate & Env", icon: Leaf, slug: "climate-env" },
  { label: "Business", icon: Building2, slug: "business" },
  { label: "Geography", icon: Globe, slug: "geography" },
];

// TODO(backend): replace with real GET /api/datasets/popular/
const POPULAR_DATASETS = [
  {
    id: "p1",
    category: "COMPUTER VISION",
    title: "Ethiopian Coffee Leaf Disease Detection",
    description: "A comprehensive dataset of high-resolution images detailing various...",
    views: "12.4K",
    size: "2.4 GB",
    files: 18,
    gradient: "from-[#7B8BC7] to-[#4C5A96]",
  },
  {
    id: "p2",
    category: "NLP",
    title: "Amharic News Text Corpus for NLP",
    description: "Over 100,000 annotated news articles in Amharic collected from major...",
    views: "8.2K",
    size: "450 MB",
    files: 3,
    gradient: "from-[#E0A93B] to-[#B8860B]",
  },
  {
    id: "p3",
    category: "HEALTHCARE",
    title: "Addis Ababa Urban Health Indicators",
    description: "Time-series data on respiratory health issues correlated with urban traffic...",
    views: "5.1K",
    size: "1.2 GB",
    files: 12,
    gradient: "from-gray-300 to-gray-500",
  },
  {
    id: "p4",
    category: "GEOGRAPHY",
    title: "GERD Water Level Satellite Imagery",
    description: "Multi-spectral satellite imagery tracking the filling phases of the...",
    views: "15.3K",
    size: "8.5 GB",
    files: 24,
    gradient: "from-[#0B1526] to-[#1B2A47]",
  },
];

// TODO(backend): replace with real GET /api/datasets/recent/
const NEWLY_ADDED_DATASETS = [
  {
    id: "n1",
    category: "AGRICULTURE",
    title: "Teff Yield Prediction Variables",
    description: "Soil composition, rainfall, and temperature data mapped to Teff crop",
    views: "142",
    size: "120 MB",
    files: 2,
    gradient: "from-gray-300 to-gray-500",
  },
  {
    id: "n2",
    category: "FINANCE",
    title: "Mobile Money Transaction Patterns",
    description: "Anonymized dataset of digital financial transactions to study...",
    views: "89",
    size: "3.1 GB",
    files: 5,
    gradient: "from-gray-300 to-gray-500",
  },
  {
    id: "n3",
    category: "ENGINEERING",
    title: "Addis Ababa Light Rail Transit Usage",
    description: "Daily passenger volume, peak hours, and route efficiency metrics for the...",
    views: "312",
    size: "56 MB",
    files: 1,
    gradient: "from-gray-300 to-gray-500",
  },
  {
    id: "n4",
    category: "CLIMATE",
    title: "Historical Drought Indices - Horn of Africa",
    description: "Standardized Precipitation Evapotranspiration Index (SPEI) data...",
    views: "45",
    size: "210 MB",
    files: 4,
    gradient: "from-gray-300 to-gray-500",
  },
];

function DatasetCard({ dataset, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-md hover:border-gray-300 cursor-pointer transition"
    >
      <div className={`relative h-28 bg-gradient-to-br ${dataset.gradient}`}>
        <span className="absolute top-3 left-3 text-[10px] font-semibold tracking-wide text-white bg-black/25 px-2 py-1 rounded">
          {dataset.category}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-[#0B1526] leading-snug">{dataset.title}</h3>
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{dataset.description}</p>
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
          <span>{dataset.views} views</span>
          <span>·</span>
          <span>{dataset.size}</span>
          <span>·</span>
          <span>{dataset.files} file{dataset.files === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <TopBar />

      {/* Hero */}
      <section className="bg-[#0B1526] px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Discover datasets for your next project
          </h1>
          <p className="text-slate-300 mt-4 text-sm sm:text-base">
            Explore, analyze, and share high-quality datasets for research and machine learning.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Explore by Category */}
        <section className="mb-14">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-[#0B1526]">Explore by Category</h2>
            <button
              onClick={() => navigate("/datasets/categories")}
              className="text-sm font-medium text-amber-600 hover:underline"
            >
              View All Categories →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map(({ label, icon: Icon, slug }) => (
              <button
                key={slug}
                onClick={() => navigate(`/datasets?category=${slug}`)}
                className="flex flex-col items-center justify-center gap-2 bg-white rounded-xl py-6 border border-gray-200 hover:border-amber-300 hover:shadow-sm transition"
              >
                <Icon className="w-5 h-5 text-[#0B1526]" />
                <span className="text-sm font-medium text-[#0B1526]">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Popular Datasets */}
        <section className="mb-14">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-[#0B1526]">Popular Datasets</h2>
            <button
              onClick={() => navigate("/datasets?sort=popular")}
              className="text-sm font-medium text-amber-600 hover:underline"
            >
              Explore More →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {POPULAR_DATASETS.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset}
                onClick={() => navigate(`/datasets/${dataset.id}`)}
              />
            ))}
          </div>
        </section>

        {/* Newly Added */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-[#0B1526]">Newly Added</h2>
            <button
              onClick={() => navigate("/datasets?sort=newest")}
              className="text-sm font-medium text-amber-600 hover:underline"
            >
              View All →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {NEWLY_ADDED_DATASETS.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset}
                onClick={() => navigate(`/datasets/${dataset.id}`)}
              />
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section className="relative bg-[#0B1526] rounded-2xl px-8 py-14 text-center overflow-hidden">
          <div className="relative z-10 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Share knowledge through data
            </h2>
            <p className="text-slate-300 mt-3 text-sm sm:text-base">
              Publish datasets, discover useful data, and help researchers and developers build
              better machine-learning solutions.
            </p>
            <button
              onClick={() => navigate("/datasets/contribute")}
              className="mt-6 inline-flex items-center gap-2 bg-[#8B6F1F] text-white font-medium rounded-lg px-5 py-3 hover:bg-[#75601a] transition"
            >
              <UploadCloud className="w-4 h-4" />
              Submit a Dataset
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}