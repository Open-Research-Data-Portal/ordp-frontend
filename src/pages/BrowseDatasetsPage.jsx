import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, SlidersHorizontal, Plus,  Database,
  Download, ChevronRight, X,
} from "lucide-react";
import TopBar from "../layouts/TopBar";

const QUICK_CATEGORIES = [
  "All datasets", "Computer Science & AI", "Environmental Science", "Public Health",
  "Classification", "Computer Vision", "NLP", "Geography",
];

const FILE_TYPES = ["CSV", "JSON/JSONL", "Excel", "Images", "Parquet"];
const LICENSES = ["CC BY 4.0", "CC BY-NC 4.0", "CC0 1.0", "Restricted"];
const ACCESS_OPTIONS = ["Public", "Private"];

// TODO(backend): replace with real GET /api/datasets/trending/


// TODO(backend): replace with real GET /api/datasets/search/?q=&file_type=&license=&access=&subject=
const PLACEHOLDER_DATASETS = [
  {
    id: "iris",
    title: "Iris",
    author: "R.A. Fisher",
    updated: "7 days ago",
    fileType: "CSV",
    fileCount: 1,
    size: "5 kB",
    downloads: 4731,
    access: "Public",
  },
  {
    id: "heart-disease",
    title: "Heart Disease",
    author: "Cleveland Clinic Foundation",
    updated: "a month ago",
    fileType: "CSV",
    fileCount: 4,
    size: "62 kB",
    downloads: 2891,
    access: "Public",
  },
  {
    id: "wine-quality",
    title: "Wine Quality",
    author: "P. Cortez et al.",
    updated: "2 months ago",
    fileType: "CSV",
    fileCount: 2,
    size: "103 kB",
    downloads: 1970,
    access: "Public",
  },
  {
    id: "teff-yield",
    title: "Teff Yield Prediction Variables",
    author: "S. Gossaye",
    updated: "7 days ago",
    fileType: "Excel",
    fileCount: 1,
    size: "1.2 MB",
    downloads: 142,
    access: "Private",
  },
];

function PillCheckbox({ label, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "px-4 py-2 rounded-full text-sm border transition",
        checked
          ? "bg-navy text-white border-navy"
          : "bg-white text-navy border-[#E3E1DA] hover:border-navy",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function BrowseDatasetsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All datasets");
  const [tagQuery, setTagQuery] = useState("");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [selectedFileTypes, setSelectedFileTypes] = useState([]);
  const [selectedLicenses, setSelectedLicenses] = useState([]);
  const [selectedAccess, setSelectedAccess] = useState([]);

  const toggleInSet = (value, list, setList) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const clearFilters = () => {
    setTagQuery("");
    setSizeMin("");
    setSizeMax("");
    setSelectedFileTypes([]);
    setSelectedLicenses([]);
    setSelectedAccess([]);
  };

  const activeFilterCount =
    selectedFileTypes.length + selectedLicenses.length + selectedAccess.length + (tagQuery ? 1 : 0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLACEHOLDER_DATASETS.filter((d) => {
      if (q && !d.title.toLowerCase().includes(q) && !d.author.toLowerCase().includes(q)) return false;
      if (selectedFileTypes.length && !selectedFileTypes.includes(d.fileType)) return false;
      if (selectedAccess.length && !selectedAccess.includes(d.access)) return false;
      return true;
    });
  }, [query, selectedFileTypes, selectedAccess]);

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <TopBar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-navy">Datasets</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-lg">
            Explore, analyze, and donate quality research data.{" "}
            <button onClick={() => navigate("/about")} className="underline hover:text-navy">
              Learn more
            </button>{" "}
            about accessioning, citing, and collaborating.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={() => navigate("/datasets/contribute")}
              className="flex items-center gap-2 bg-navy hover:bg-[#132038] text-white rounded-full px-5 py-2.5 text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4" /> New Dataset
            </button>
            
          </div>
        </div>

        {/* Search + Filters trigger */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search datasets"
              className="w-full bg-white border border-[#E3E1DA] rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-navy"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-2 bg-white border border-[#E3E1DA] hover:border-navy rounded-full px-5 py-3 text-sm font-semibold text-navy shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-gold text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <div className="bg-white border border-[#E3E1DA] rounded-xl p-6 mb-6 relative">
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-navy"
              aria-label="Close filters"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2">TAGS</p>
            <div className="relative mb-6">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder="Search tags"
                className="w-full bg-[#F7F6F2] border border-[#E3E1DA] rounded-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-navy"
              />
            </div>

            <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2">FILE SIZE</p>
            <div className="flex items-center gap-3 mb-6">
              <input
                type="number"
                value={sizeMin}
                onChange={(e) => setSizeMin(e.target.value)}
                placeholder="Min MB"
                className="w-28 bg-[#F7F6F2] border border-[#E3E1DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
              <span className="text-sm text-gray-400">to</span>
              <input
                type="number"
                value={sizeMax}
                onChange={(e) => setSizeMax(e.target.value)}
                placeholder="Max MB"
                className="w-28 bg-[#F7F6F2] border border-[#E3E1DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>

            <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2">FILE TYPES</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {FILE_TYPES.map((type) => (
                <PillCheckbox
                  key={type}
                  label={type}
                  checked={selectedFileTypes.includes(type)}
                  onToggle={() => toggleInSet(type, selectedFileTypes, setSelectedFileTypes)}
                />
              ))}
            </div>

            <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2">LICENSES</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {LICENSES.map((license) => (
                <PillCheckbox
                  key={license}
                  label={license}
                  checked={selectedLicenses.includes(license)}
                  onToggle={() => toggleInSet(license, selectedLicenses, setSelectedLicenses)}
                />
              ))}
            </div>

            <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2">ACCESS</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {ACCESS_OPTIONS.map((access) => (
                <PillCheckbox
                  key={access}
                  label={access}
                  checked={selectedAccess.includes(access)}
                  onToggle={() => toggleInSet(access, selectedAccess, setSelectedAccess)}
                />
              ))}
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-[#E3E1DA]">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-gray-500 hover:text-navy"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* Quick category pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          {QUICK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                "px-4 py-2 rounded-full text-sm border transition",
                activeCategory === cat
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-navy border-[#E3E1DA] hover:border-navy",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
        </div>

      

        {/* Dataset list */}
        <section>
          {results.length === 0 && (
            <p className="text-gray-500 text-sm">No datasets match your search or filters.</p>
          )}
          <div className="bg-white border border-[#E3E1DA] rounded-xl overflow-hidden">
            {results.map((dataset, i) => (
              <div
                key={dataset.id}
                onClick={() => navigate(`/datasets/${dataset.id}`)}
                role="button"
                tabIndex={0}
                className={[
                  "flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#F7F6F2] transition",
                  i !== results.length - 1 ? "border-b border-[#E3E1DA]" : "",
                ].join(" ")}
              >
                <div className="w-14 h-14 rounded-md bg-navy flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-serif font-bold text-[#2C5AAE] truncate">{dataset.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {dataset.author} · Updated {dataset.updated}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dataset.fileCount} File{dataset.fileCount === 1 ? "" : "s"} ({dataset.fileType}) · {dataset.size} · {dataset.access}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-navy text-sm font-semibold shrink-0">
                  <Download className="w-4 h-4 text-gray-400" />
                  {dataset.downloads.toLocaleString()}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}