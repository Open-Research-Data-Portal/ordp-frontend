import { useState } from "react";
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
  Search,
  ArrowRight,
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

// TODO(backend): replace with real GET /api/datasets/stats/
const STATS = [
  { label: "Datasets archived", value: "1,240+" },
  { label: "Contributing researchers", value: "310+" },
  { label: "Departments represented", value: "12" },
];

// TODO(backend): replace with real GET /api/datasets/popular/
const POPULAR_DATASETS = [
  {
    id: "p1",
    accession: "ORDP · CV · 014",
    category: "COMPUTER VISION",
    title: "Ethiopian Coffee Leaf Disease Detection",
    description: "A comprehensive dataset of high-resolution images detailing various...",
    views: "12.4K",
    size: "2.4 GB",
    files: 18,
  },
  {
    id: "p2",
    accession: "ORDP · NLP · 007",
    category: "NLP",
    title: "Amharic News Text Corpus for NLP",
    description: "Over 100,000 annotated news articles in Amharic collected from major...",
    views: "8.2K",
    size: "450 MB",
    files: 3,
  },
  {
    id: "p3",
    accession: "ORDP · HLT · 022",
    category: "HEALTHCARE",
    title: "Addis Ababa Urban Health Indicators",
    description: "Time-series data on respiratory health issues correlated with urban traffic...",
    views: "5.1K",
    size: "1.2 GB",
    files: 12,
  },
  {
    id: "p4",
    accession: "ORDP · GEO · 031",
    category: "GEOGRAPHY",
    title: "GERD Water Level Satellite Imagery",
    description: "Multi-spectral satellite imagery tracking the filling phases of the...",
    views: "15.3K",
    size: "8.5 GB",
    files: 24,
  },
];

// TODO(backend): replace with real GET /api/datasets/recent/
const NEWLY_ADDED_DATASETS = [
  {
    id: "n1",
    accession: "ORDP · AGR · 058",
    category: "AGRICULTURE",
    title: "Teff Yield Prediction Variables",
    description: "Soil composition, rainfall, and temperature data mapped to Teff crop",
    views: "142",
    size: "120 MB",
    files: 2,
  },
  {
    id: "n2",
    accession: "ORDP · FIN · 059",
    category: "FINANCE",
    title: "Mobile Money Transaction Patterns",
    description: "Anonymized dataset of digital financial transactions to study...",
    views: "89",
    size: "3.1 GB",
    files: 5,
  },
  {
    id: "n3",
    accession: "ORDP · ENG · 060",
    category: "ENGINEERING",
    title: "Addis Ababa Light Rail Transit Usage",
    description: "Daily passenger volume, peak hours, and route efficiency metrics for the...",
    views: "312",
    size: "56 MB",
    files: 1,
  },
  {
    id: "n4",
    accession: "ORDP · CLM · 061",
    category: "CLIMATE",
    title: "Historical Drought Indices - Horn of Africa",
    description: "Standardized Precipitation Evapotranspiration Index (SPEI) data...",
    views: "45",
    size: "210 MB",
    files: 4,
  },
];

function SectionEyebrow({ children }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="h-px w-8 bg-gold" />
      <span className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">{children}</span>
    </div>
  );
}

function DatasetCard({ dataset, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="group bg-white rounded-lg overflow-hidden border border-[#E3E1DA] hover:border-gold hover:shadow-md cursor-pointer transition"
    >
      <div className="px-4 pt-4 flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-wide text-gray-400">{dataset.accession}</span>
        <span className="text-[10px] font-semibold tracking-wide text-navy bg-[#F2E7C4] px-2 py-1 rounded">
          {dataset.category}
        </span>
      </div>
      <div className="p-4 pt-3">
        <h3 className="text-sm font-serif font-bold text-navy leading-snug">{dataset.title}</h3>
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{dataset.description}</p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E3E1DA]">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span>{dataset.views} views</span>
            <span>·</span>
            <span>{dataset.size}</span>
            <span>·</span>
            <span>{dataset.files} file{dataset.files === 1 ? "" : "s"}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gold group-hover:translate-x-0.5 transition" />
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [heroQuery, setHeroQuery] = useState("");

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroQuery.trim()) {
      navigate(`/datasets?q=${encodeURIComponent(heroQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <TopBar />

      {/* Hero */}
      <section className="relative bg-navy px-6 py-20 overflow-hidden">
        {/* subtle contour-line texture, evokes topographic survey maps rather than a generic gradient blob */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 800 400"
        >
          <path d="M0,320 Q200,260 400,300 T800,280" stroke="#A67A0D" strokeWidth="1.5" fill="none" />
          <path d="M0,350 Q200,300 400,335 T800,320" stroke="#A67A0D" strokeWidth="1.5" fill="none" />
          <path d="M0,60 Q200,110 400,75 T800,95" stroke="#A67A0D" strokeWidth="1.5" fill="none" />
          <path d="M0,30 Q200,80 400,45 T800,65" stroke="#A67A0D" strokeWidth="1.5" fill="none" />
        </svg>

        <div className="relative max-w-2xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase mb-4">
            AASTU Open Research Data Portal
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-serif font-bold text-white leading-tight">
            A living archive of research,<br className="hidden sm:block" /> donated by its authors
          </h1>
          <p className="text-slate-300 mt-5 text-sm sm:text-base max-w-lg mx-auto">
            Every dataset here was accessioned by the researcher who created it — searchable,
            citable, and open to the next person who needs it.
          </p>

        </div>

        {/* Stat strip */}
        <div className="relative max-w-2xl mx-auto mt-14 grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-serif font-bold text-white">{stat.value}</p>
              <p className="text-[11px] text-slate-400 mt-1 tracking-wide uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Explore by Category */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-5">
            <div>
              <SectionEyebrow>Browse the collection</SectionEyebrow>
              <h2 className="text-xl font-serif font-bold text-navy">Explore by Category</h2>
            </div>
            <button
              onClick={() => navigate("/datasets/categories")}
              className="text-sm font-semibold text-gold hover:underline shrink-0"
            >
              View All Categories →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map(({ label, icon: Icon, slug }) => (
              <button
                key={slug}
                onClick={() => navigate(`/datasets?category=${slug}`)}
                className="flex flex-col items-center justify-center gap-2.5 bg-white rounded-xl py-7 border border-[#E3E1DA] hover:border-gold hover:shadow-sm transition"
              >
                <Icon className="w-5 h-5 text-navy" />
                <span className="text-sm font-medium text-navy">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Popular Datasets */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-5">
            <div>
              <SectionEyebrow>Most consulted</SectionEyebrow>
              <h2 className="text-xl font-serif font-bold text-navy">Popular Datasets</h2>
            </div>
            <button
              onClick={() => navigate("/datasets?sort=popular")}
              className="text-sm font-semibold text-gold hover:underline shrink-0"
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
          <div className="flex justify-between items-end mb-5">
            <div>
              <SectionEyebrow>Latest accessions</SectionEyebrow>
              <h2 className="text-xl font-serif font-bold text-navy">Newly Added</h2>
            </div>
            <button
              onClick={() => navigate("/datasets?sort=newest")}
              className="text-sm font-semibold text-gold hover:underline shrink-0"
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
        <section className="relative bg-navy rounded-2xl px-8 py-16 text-center overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 800 300"
          >
            <path d="M0,240 Q200,190 400,220 T800,200" stroke="#A67A0D" strokeWidth="1.5" fill="none" />
            <path d="M0,60 Q200,100 400,70 T800,90" stroke="#A67A0D" strokeWidth="1.5" fill="none" />
          </svg>
          <div className="relative max-w-xl mx-auto">
            <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase mb-4">
              Add to the record
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Share knowledge through data
            </h2>
            <p className="text-slate-300 mt-3 text-sm sm:text-base">
              Publish datasets, discover useful data, and help researchers and developers build
              better machine-learning solutions.
            </p>
            <button
              onClick={() => navigate("/datasets/contribute")}
              className="mt-7 inline-flex items-center gap-2 bg-gold text-white font-semibold rounded-lg px-6 py-3.5 hover:bg-[#8f690b] transition"
            >
              <UploadCloud className="w-4 h-4" />
              Submit a Dataset
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E3E1DA] bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm font-serif font-bold text-navy">AASTU Open Research Data Portal</p>
            <p className="text-xs text-gray-500 mt-1">
              Addis Ababa Science and Technology University
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <button onClick={() => navigate("/datasets")} className="hover:text-navy">Browse Datasets</button>
            <button onClick={() => navigate("/datasets/contribute")} className="hover:text-navy">Contribute</button>
            <button onClick={() => navigate("/support")} className="hover:text-navy">Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}