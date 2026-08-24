import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Database,
  Download,
  ChevronDown,
  X,
  MoreHorizontal,
  Star,
  TrendingUp,
  History,
  Bookmark,
} from "lucide-react";
import TopBar from "../layouts/TopBar";
import { searchDatasets } from "../api/search";
import * as bookmarksApi from "../api/bookmarks";

const QUICK_CATEGORIES = [
  "All datasets", "Computer Science", "Education", "Classification",
  "Computer Vision", "NLP", "Data Visualization", "Pre-Trained Model",
];

const FILE_TYPES = ["CSV", "JSON", "SQLite", "Parquet", "BigQuery"];
const LICENSES = ["Creative Commons", "GPL", "Open Database", "Other"];
const USABILITY_OPTIONS = ["8.00 or higher", "9.00 or higher", "10.00"];
const HIGHLY_VOTED_FOR = [
  "Learning", "Research", "Application", "Well-documented",
  "Well-maintained", "Clean data", "Original", "High-quality notebooks", "LLM Fine-Tuning",
];
const SIZE_UNITS = ["KB", "MB", "GB"];

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Updated today";
  if (days === 1) return "Updated 1 day ago";
  if (days < 30) return `Updated ${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `Updated ${months} mo ago` : `Updated ${Math.floor(months / 12)}y ago`;
}

// ---------------------------------------------------------------------
// Local bookmark-state hook — kept inline in this file (no separate
// src/hooks/ directory exists in this project) rather than split out.
// Tracks which dataset ids the current user has bookmarked, plus an
// optimistic toggle. If a second page ever needs this same state, it's
// a straightforward copy/paste or a later extraction into its own file.
// ---------------------------------------------------------------------
function useBookmarkedIds() {
  const [bookmarkedIds, setBookmarkedIds] = useState(() => new Set());

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await bookmarksApi.getBookmarks();
        const list = bookmarksApi.extractBookmarkList(data);
        if (isMounted) setBookmarkedIds(new Set(list.map((d) => d.id)));
      } catch (err) {
        console.error("Failed to load bookmarks", err);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleBookmark = useCallback(async (datasetId) => {
    let wasBookmarked;
    // Optimistic flip — the endpoint is inherently add/remove-on-toggle,
    // so we don't need to parse its response to know the new state.
    setBookmarkedIds((prev) => {
      wasBookmarked = prev.has(datasetId);
      const next = new Set(prev);
      if (wasBookmarked) {
        next.delete(datasetId);
      } else {
        next.add(datasetId);
      }
      return next;
    });

    try {
      await bookmarksApi.toggleBookmark(datasetId);
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) {
          next.add(datasetId);
        } else {
          next.delete(datasetId);
        }
        return next;
      });
    }
  }, []);

  return { bookmarkedIds, toggleBookmark };
}

function PillCheckbox({ label, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "px-4 py-2 rounded-full text-sm border transition-all duration-150 active:scale-95",
        checked
          ? "bg-[#A67A0D] text-white border-[#A67A0D] scale-[1.02]"
          : "bg-white text-navy border-[#E3E1DA] hover:border-[#A67A0D] hover:scale-[1.02]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// Small standalone bookmark toggle button, shared by the card grid and the
// search-results list. Always calls e.stopPropagation() since it sits
// inside a clickable card/row that navigates on click.
function BookmarkButton({ bookmarked, onToggle, className = "" }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      aria-pressed={bookmarked}
      className={`shrink-0 transition-transform hover:scale-110 ${
        bookmarked ? "text-amber-700" : "text-gray-400 hover:text-amber-700"
      } ${className}`}
    >
      <Bookmark className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} />
    </button>
  );
}

function DatasetCard({ dataset, navigate, bookmarked, onToggleBookmark }) {
  const Icon = dataset.icon || Database;
  const image = dataset.image ?? dataset.thumbnail_key ?? null;
  const author = dataset.author ?? dataset.owner_name ?? "Unknown";
  const fileCount = dataset.fileCount ?? dataset.files?.length ?? 0;
  const sizeBytes = dataset.files?.reduce((acc, f) => acc + (f.file_size || 0), 0) ?? 0;
  const sizeStr = dataset.size ?? formatBytes(sizeBytes);
  const fileTypes = (dataset.fileType
    ?? [...new Set((dataset.files ?? []).map((f) => f.file_type?.toUpperCase()).filter(Boolean))].join(", "))
    || "N/A";
  const downloads = dataset.downloads ?? dataset.download_count ?? null;
  const updatedStr = dataset.viewedAgo
    ?? (dataset.updated ? `Updated ${dataset.updated}` : formatRelativeDate(dataset.updated_at));

  return (
    <div
      onClick={() => navigate(`/datasets/${dataset.id}`)}
      className="group bg-white rounded-xl border border-[#E3E1DA] overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-gold/40"
    >
      <div className="h-48 bg-[#F0EFEA] overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={dataset.title}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-10 h-10 text-gray-300 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:text-gold" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-semibold text-navy line-clamp-2 transition-colors group-hover:text-[#2C5AAE]">{dataset.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            <BookmarkButton bookmarked={bookmarked} onToggle={() => onToggleBookmark(dataset.id)} />
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-0.5 text-gray-400 hover:text-navy transition-transform hover:scale-110"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-[#2C5AAE] underline mt-1.5">{author}</p>
        <p className="text-sm text-gray-500 mt-3">{updatedStr}</p>
        <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1">
          <Download className="w-3.5 h-3.5" />
          {fileCount} File{fileCount === 1 ? "" : "s"} ({fileTypes}) · {sizeStr}
          {downloads != null ? ` · ${downloads.toLocaleString()} downloads` : ""}
        </p>
      </div>
    </div>
  );
}

function CuratedSection({ icon: Icon, title, datasets, navigate, onSeeAll, bookmarkedIds, onToggleBookmark }) {
  return (
    <section className="mb-14 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-navy" />
          <h2 className="text-base font-serif font-bold text-navy">{title}</h2>
        </div>
        <button type="button" onClick={onSeeAll} className="text-sm font-semibold text-[#2C5AAE] hover:underline transition-colors">
          See All
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {datasets.map((d, i) => (
          <div key={d.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <DatasetCard
              dataset={d}
              navigate={navigate}
              bookmarked={bookmarkedIds.has(d.id)}
              onToggleBookmark={onToggleBookmark}
            />
          </div>
        ))}
      </div>
    </section>
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
  const [sizeMinUnit, setSizeMinUnit] = useState("MB");
  const [sizeMaxUnit, setSizeMaxUnit] = useState("MB");
  const [selectedFileTypes, setSelectedFileTypes] = useState([]);
  const [selectedLicenses, setSelectedLicenses] = useState([]);
  const [selectedUsability, setSelectedUsability] = useState([]);
  const [selectedVotedFor, setSelectedVotedFor] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  // API-backed state
  const [trendingDatasets, setTrendingDatasets] = useState([]);
  const [popularDatasets, setPopularDatasets] = useState([]);
  const [discoverDatasets, setDiscoverDatasets] = useState([]);
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const { bookmarkedIds, toggleBookmark } = useBookmarkedIds();

  const filterPanelRef = useRef(null);
  const filterButtonRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

  // Fetch curated sections on mount
  useEffect(() => {
    async function fetchCurated() {
      try {
        const [newest, popular] = await Promise.all([
          searchDatasets({ order_by: "newest" }),
          searchDatasets({ order_by: "popular" }),
        ]);
        setTrendingDatasets(newest.slice(0, 3));
        setPopularDatasets(popular.slice(0, 3));
        setDiscoverDatasets(popular.slice(3, 6));
      } catch (e) {
        console.error("Failed to load curated datasets", e);
      }
    }
    fetchCurated();
  }, []);

  const openFilters = () => {
    const rect = filterButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setPanelPos({
        top: rect.bottom + 8,
        right: Math.max(window.innerWidth - rect.right, 16),
      });
    }
    setFiltersOpen((v) => !v);
  };

  // Prevent the page (and everything on it) from scrolling while the filter
  // popup is open, so neither the cards nor the popup appear to drift.
  useEffect(() => {
    if (filtersOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [filtersOpen]);

  // Keep the popup anchored to the button if the window resizes while open
  useEffect(() => {
    if (!filtersOpen) return;
    function reposition() {
      const rect = filterButtonRef.current?.getBoundingClientRect();
      if (rect) {
        setPanelPos({
          top: rect.bottom + 8,
          right: Math.max(window.innerWidth - rect.right, 16),
        });
      }
    }
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [filtersOpen]);

  // Close the filter popup when clicking outside of it
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        filtersOpen &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(e.target) &&
        !filterButtonRef.current.contains(e.target)
      ) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filtersOpen]);

  const toggleInSet = (value, list, setList) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const clearFilters = () => {
    setTagQuery("");
    setSizeMin("");
    setSizeMax("");
    setSizeMinUnit("MB");
    setSizeMaxUnit("MB");
    setSelectedFileTypes([]);
    setSelectedLicenses([]);
    setSelectedUsability([]);
    setSelectedVotedFor([]);
  };

  const applyFilters = () => {
    setFiltersOpen(false);
    // filters are already live via state; this just closes the popup
  };

  const activeFilterCount =
    selectedFileTypes.length +
    selectedLicenses.length +
    selectedUsability.length +
    selectedVotedFor.length +
    (tagQuery ? 1 : 0) +
    (sizeMin || sizeMax ? 1 : 0);

  const isSearching = query.trim().length > 0 || activeFilterCount > 0 || activeCategory !== "All datasets";

  // Debounced search — fires 400 ms after the user stops typing
  useEffect(() => {
    if (!isSearching) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const params = {};
        if (query.trim()) params.q = query.trim();
        const data = await searchDatasets(params);
        let filtered = data;
        if (selectedFileTypes.length > 0) {
          filtered = data.filter((d) =>
            d.files?.some((f) => selectedFileTypes.includes(f.file_type?.toUpperCase()))
          );
        }
        setResults(filtered);
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, activeCategory, selectedFileTypes, activeFilterCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      <TopBar />

      <div className="w-full px-6 lg:px-10 py-10 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-4xl font-serif font-bold text-navy">Datasets</h1>
            <p className="text-gray-500 mt-2 text-sm max-w-2xl">
              Explore, analyze, and donate quality research data.{" "}
              <button onClick={() => navigate("/about")} className="underline hover:text-navy transition-colors">
                Learn more
              </button>{" "}
              about accessioning, citing, and collaborating.
            </p>
          </div>
          <button
            onClick={() => navigate("/datasets/contribute")}
            className="flex items-center gap-2 bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:shadow-md hover:scale-[1.03] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" /> New Dataset
          </button>
        </div>

        {/* Search + Filters trigger */}
        <div className="relative flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search datasets"
              className="w-full bg-white border border-[#E3E1DA] rounded-full pl-11 pr-4 py-3 text-sm transition-colors focus:outline-none focus:border-[#A67A0D] focus:shadow-sm"
            />
          </div>
          <button
            ref={filterButtonRef}
            type="button"
            onClick={openFilters}
            className="flex items-center gap-2 bg-white border border-[#E3E1DA] hover:border-[#A67A0D] rounded-full px-5 py-3 text-sm font-semibold text-navy shrink-0 transition-all duration-200 hover:shadow-sm active:scale-[0.97]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-[#A67A0D] text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Filters popup — rendered via portal so no ancestor transform (e.g. the
              fade-in animation on this row) can hijack its fixed positioning */}
          {filtersOpen && createPortal(
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/10 z-[90]"
                aria-hidden="true"
                onClick={() => setFiltersOpen(false)}
              />

              <div
                ref={filterPanelRef}
                style={{ top: panelPos.top, right: panelPos.right }}
                className="fixed w-[92vw] sm:w-[420px] bg-white border border-[#E3E1DA] rounded-xl shadow-2xl p-6 z-[100] max-h-[75vh] overflow-y-auto animate-fade-in-up origin-top"
              >
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
                  placeholder="Search"
                  className="w-full bg-white border border-[#E3E1DA] rounded-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-navy"
                />
              </div>

              <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2">FILE SIZE</p>
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center border border-[#E3E1DA] rounded-md overflow-hidden">
                  <input
                    type="number"
                    value={sizeMin}
                    onChange={(e) => setSizeMin(e.target.value)}
                    placeholder="Min"
                    className="w-20 px-3 py-2 text-sm focus:outline-none"
                  />
                  <select
                    value={sizeMinUnit}
                    onChange={(e) => setSizeMinUnit(e.target.value)}
                    className="border-l border-[#E3E1DA] bg-[#F7F6F2] text-sm px-2 py-2 focus:outline-none"
                  >
                    {SIZE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <span className="text-sm text-gray-400">to</span>
                <div className="flex items-center border border-[#E3E1DA] rounded-md overflow-hidden">
                  <input
                    type="number"
                    value={sizeMax}
                    onChange={(e) => setSizeMax(e.target.value)}
                    placeholder="Max"
                    className="w-20 px-3 py-2 text-sm focus:outline-none"
                  />
                  <select
                    value={sizeMaxUnit}
                    onChange={(e) => setSizeMaxUnit(e.target.value)}
                    className="border-l border-[#E3E1DA] bg-[#F7F6F2] text-sm px-2 py-2 focus:outline-none"
                  >
                    {SIZE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
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

              <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2">USABILITY RATING</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {USABILITY_OPTIONS.map((option) => (
                  <PillCheckbox
                    key={option}
                    label={option}
                    checked={selectedUsability.includes(option)}
                    onToggle={() => toggleInSet(option, selectedUsability, setSelectedUsability)}
                  />
                ))}
              </div>

              <p className="text-xs font-semibold tracking-wide text-gray-500 mb-2">HIGHLY VOTED FOR</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {HIGHLY_VOTED_FOR.map((tag) => (
                  <PillCheckbox
                    key={tag}
                    label={tag}
                    checked={selectedVotedFor.includes(tag)}
                    onToggle={() => toggleInSet(tag, selectedVotedFor, setSelectedVotedFor)}
                  />
                ))}
              </div>

              <div className="flex items-center justify-end gap-5 mt-4 pt-4 border-t border-[#E3E1DA]">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-semibold text-gray-500 hover:text-navy transition-colors active:scale-95"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-150 hover:shadow-md active:scale-95"
                >
                  Apply
                </button>
              </div>
              </div>
            </>,
            document.body
          )}
        </div>

        {/* Quick category pills */}
        <div className="flex flex-wrap gap-2 mb-10 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          {QUICK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                "px-4 py-2 rounded-full text-sm border transition-all duration-150 active:scale-95",
                activeCategory === cat
                  ? "bg-[#A67A0D] text-white border-[#A67A0D] scale-[1.03]"
                  : "bg-white text-navy border-[#E3E1DA] hover:border-[#A67A0D] hover:scale-[1.03]",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
        </div>

        {isSearching ? (
          /* Search / filtered results */
          <section>
            {searchLoading && (
              <p className="text-sm text-gray-500 mb-4">Searching…</p>
            )}
            {!searchLoading && results.length === 0 && (
              <p className="text-gray-500 text-sm">No datasets match your search or filters.</p>
            )}
            {results.length > 0 && (
              <div className="bg-white border border-[#E3E1DA] rounded-xl overflow-hidden">
                {results.map((dataset, i) => {
                  const isOpen = expandedId === dataset.id;
                  const thumb = dataset.image ?? dataset.thumbnail_key ?? null;
                  const authorName = dataset.author ?? dataset.owner_name ?? "Unknown";
                  const desc = dataset.metadata?.description ?? dataset.description ?? "";
                  const fCount = dataset.fileCount ?? dataset.files?.length ?? 0;
                  const fType = (dataset.fileType
                    ?? [...new Set((dataset.files ?? []).map((f) => f.file_type?.toUpperCase()).filter(Boolean))].join(", "))
                    || "N/A";
                  const sz = dataset.size ?? formatBytes(dataset.files?.reduce((a, f) => a + (f.file_size || 0), 0) ?? 0);
                  return (
                    <div
                      key={dataset.id}
                      className={i !== results.length - 1 ? "border-b border-[#E3E1DA]" : ""}
                    >
                      <div
                        onClick={() => setExpandedId(isOpen ? null : dataset.id)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isOpen}
                        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#F7F6F2] transition-colors duration-150"
                      >
                        <div className="w-14 h-14 rounded-md bg-[#F0EFEA] overflow-hidden shrink-0">
                          {thumb ? (
                            <img src={thumb} alt={dataset.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Database className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-serif font-bold text-navy truncate">{dataset.title}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="text-[#2C5AAE] underline">{authorName}</span> · {formatRelativeDate(dataset.updated_at) || dataset.updated || ""}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {dataset.visibility ?? dataset.access} · {fCount} File{fCount === 1 ? "" : "s"} ({fType}) · {sz}
                          </p>
                        </div>
                        <BookmarkButton
                          bookmarked={bookmarkedIds.has(dataset.id)}
                          onToggle={() => toggleBookmark(dataset.id)}
                        />
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </div>

                      {isOpen && (
                        <div className="px-5 pb-5 pl-[4.75rem] animate-fade-in-up" style={{ animationDuration: "150ms" }}>
                          <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/datasets/${dataset.id}`);
                            }}
                            className="mt-3 text-sm font-semibold text-[#A67A0D] hover:text-[#8f690b] transition-colors"
                          >
                            View full dataset →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* Curated discovery sections — powered by real backend data */
          <>
            <CuratedSection
              icon={TrendingUp}
              title="Trending Datasets"
              datasets={trendingDatasets}
              navigate={navigate}
              onSeeAll={() => navigate("/datasets?sort=newest")}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
            />
            <CuratedSection
              icon={Star}
              title="Popular Datasets"
              datasets={popularDatasets}
              navigate={navigate}
              onSeeAll={() => navigate("/datasets?sort=popular")}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
            />
            <CuratedSection
              icon={History}
              title="Discover More"
              datasets={discoverDatasets}
              navigate={navigate}
              onSeeAll={() => navigate("/datasets")}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
            />
          </>
        )}
      </div>
    </div>
  );
}