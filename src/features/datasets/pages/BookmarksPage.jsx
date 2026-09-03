import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bookmark,
  ChevronDown,
  Database,
  Download,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import * as bookmarksApi from "../../../api/bookmarks";
import { getDatasetImage } from "../../../utils/datasetImage";


function formatRelativeDate(dateString) {
  if (!dateString) return "";

  const diffMs = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days < 1) return "Updated today";
  if (days === 1) return "Updated 1 day ago";
  if (days < 30) return `Updated ${days} days ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `Updated ${months} mo ago`;

  return `Updated ${Math.floor(months / 12)}y ago`;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileInfo(dataset) {
  const files = Array.isArray(dataset.files) ? dataset.files : [];

  const fileCount =
    dataset.file_count ??
    dataset.fileCount ??
    files.length ??
    0;

  const fileTypes =
    dataset.fileType ??
    [...new Set(
      files
        .map((file) => file.file_type || file.type)
        .filter(Boolean)
        .map((type) => String(type).toUpperCase())
    )].join(", ");

  const totalBytes = files.reduce(
    (total, file) =>
      total +
      Number(file.file_size ?? file.size ?? 0),
    0
  );

  const size =
    dataset.size ??
    (dataset.file_size ? formatBytes(dataset.file_size) : formatBytes(totalBytes));

  return {
    fileCount,
    fileTypes: fileTypes || "N/A",
    size,
  };
}



function BookmarkButton({ bookmarked, onClick }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      aria-pressed={bookmarked}
      className={`shrink-0 transition-transform hover:scale-110 ${
        bookmarked
          ? "text-[#B1840A]"
          : "text-gray-400 hover:text-[#B1840A]"
      }`}
    >
      <Bookmark
        className="w-5 h-5"
        fill={bookmarked ? "currentColor" : "none"}
        strokeWidth={1.8}
      />
    </button>
  );
}

export default function BookmarksPage() {
  const navigate = useNavigate();

  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadBookmarks() {
      setLoading(true);
      setError("");

      try {
        const data = await bookmarksApi.getBookmarks();
        const list = bookmarksApi.extractBookmarkList(data);

        if (mounted) {
          setBookmarks(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("Failed to load bookmarks", err);

        if (mounted) {
          setError(
            err?.response?.data?.detail ||
              "Failed to load your bookmarks."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadBookmarks();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredBookmarks = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return bookmarks;

    return bookmarks.filter((dataset) => {
      const title = dataset.title ?? "";
      const author =
        dataset.author ??
        dataset.owner_name ??
        dataset.owner?.name ??
        "";
      const description =
        dataset.metadata?.description ??
        dataset.description ??
        "";

      return `${title} ${author} ${description}`
        .toLowerCase()
        .includes(term);
    });
  }, [bookmarks, search]);

  const removeBookmark = async (datasetId) => {
    setRemovingId(datasetId);

    // Optimistic update so the row disappears immediately.
    const previous = bookmarks;
    setBookmarks((current) =>
      current.filter((dataset) => dataset.id !== datasetId)
    );

    if (expandedId === datasetId) {
      setExpandedId(null);
    }

    try {
      await bookmarksApi.toggleBookmark(datasetId);
    } catch (err) {
      console.error("Failed to remove bookmark", err);
      setBookmarks(previous);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <DashboardShell title="Bookmarks" subtitle="Datasets you've saved for later.">
          <main>
            <div className="bg-white rounded-2xl border border-[#E3E1DA] min-h-[calc(100vh-180px)] overflow-hidden">
              {/* Page header */}
              <div className="px-8 lg:px-10 pt-8">
                <div className="mb-7">
                  <h1 className="text-3xl font-serif font-bold text-navy">
                    Bookmarks
                  </h1>

                  <p className="text-sm text-gray-500 mt-1">
                    Datasets you've saved for later.
                  </p>
                </div>

                {/* Search */}
                <div className="flex items-center gap-3 mb-7">
                  <div className="flex-1 flex items-center gap-3 border border-[#E3E1DA] rounded-full px-4 py-3 bg-white focus-within:border-[#B1840A] transition-colors">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />

                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search bookmarks"
                      className="w-full text-sm text-navy placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    className="flex items-center gap-2 bg-navy hover:bg-navy-dark text-white rounded-full px-5 py-3 text-sm font-semibold shrink-0 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                </div>
              </div>

              {/* Content */}
              {loading && (
                <div className="px-8 lg:px-10 py-10">
                  <p className="text-sm text-gray-500">
                    Loading bookmarks…
                  </p>
                </div>
              )}

              {!loading && error && (
                <div className="mx-8 lg:mx-10 mb-8 rounded-xl border border-red-100 bg-red-50 px-5 py-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {!loading && !error && filteredBookmarks.length === 0 && (
                <div className="mx-8 lg:mx-10 mb-8 rounded-xl border border-[#E3E1DA] bg-[#F7F6F2] px-6 py-14 text-center">
                  <Bookmark className="w-9 h-9 mx-auto text-gray-300 mb-3" />

                  <h2 className="text-base font-semibold text-navy">
                    {bookmarks.length === 0
                      ? "No bookmarked datasets yet"
                      : "No bookmarks match your search"}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    {bookmarks.length === 0
                      ? "Save datasets you want to quickly access later."
                      : "Try searching with a different title, author, or keyword."}
                  </p>

                  {bookmarks.length === 0 && (
                    <button
                      type="button"
                      onClick={() => navigate("/datasets")}
                      className="mt-5 bg-[#B1840A] hover:bg-[#966F08] text-white rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
                    >
                      Browse Datasets
                    </button>
                  )}
                </div>
              )}

              {!loading && !error && filteredBookmarks.length > 0 && (
                <div className="border-t border-[#E3E1DA]">
                  {filteredBookmarks.map((dataset, index) => {
                    const isOpen = expandedId === dataset.id;
                    const image = getDatasetImage(dataset);

                    const author =
                      dataset.author ??
                      dataset.owner_name ??
                      dataset.owner?.name ??
                      "Unknown";

                    const updated =
                      dataset.updated_at ??
                      dataset.modified_at ??
                      dataset.created_at;

                    const description =
                      dataset.metadata?.description ??
                      dataset.description ??
                      "";

                    const { fileCount, fileTypes, size } =
                      getFileInfo(dataset);

                    const access =
                      dataset.visibility ??
                      dataset.access ??
                      "public";

                    const downloads =
                      dataset.downloads ??
                      dataset.download_count ??
                      null;

                    return (
                      <div
                        key={dataset.id}
                        className={
                          index !== filteredBookmarks.length - 1
                            ? "border-b border-[#E3E1DA]"
                            : ""
                        }
                      >
                        {/* Bookmark row */}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={isOpen}
                          onClick={() =>
                            setExpandedId(
                              isOpen ? null : dataset.id
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" ||
                              event.key === " "
                            ) {
                              event.preventDefault();
                              setExpandedId(
                                isOpen ? null : dataset.id
                              );
                            }
                          }}
                          className="flex items-center gap-4 px-8 lg:px-10 py-5 cursor-pointer hover:bg-[#FAFAF8] transition-colors"
                        >
                          {/* Thumbnail */}
                          <div className="w-[68px] h-[68px] rounded-md bg-[#F0EFEA] overflow-hidden shrink-0 border border-[#E3E1DA]">
                            {image ? (
                              <img
                                src={image}
                                alt={dataset.title}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Database className="w-7 h-7 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* Dataset information */}
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-serif font-bold text-navy truncate">
                              {dataset.title || "Untitled Dataset"}
                            </p>

                            <p className="text-sm text-[#2C5AAE] mt-1 truncate">
                              {author}
                              <span className="text-gray-400">
                                {" "}·{" "}
                              </span>
                              <span className="text-gray-500">
                                {formatRelativeDate(updated)}
                              </span>
                            </p>

                            <p className="text-sm text-gray-500 mt-1">
                              {access} · {fileCount} File
                              {fileCount === 1 ? "" : "s"} ({fileTypes})
                              {size ? ` · ${size}` : ""}
                              {downloads != null
                                ? ` · ${Number(downloads).toLocaleString()} downloads`
                                : ""}
                            </p>
                          </div>

                          {/* Bookmark */}
                          <BookmarkButton
                            bookmarked
                            onClick={() => removeBookmark(dataset.id)}
                          />

                          {/* Expand */}
                          <ChevronDown
                            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            } ${
                              removingId === dataset.id
                                ? "opacity-40"
                                : ""
                            }`}
                          />
                        </div>

                        {/* Expanded information */}
                        {isOpen && (
                          <div className="px-8 lg:px-10 pb-5 pl-[8rem]">
                            {description ? (
                              <p className="text-sm text-gray-600 leading-relaxed max-w-4xl">
                                {description}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400">
                                No description available.
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/datasets/${dataset.id}`);
                              }}
                              className="mt-3 text-sm font-semibold text-[#B1840A] hover:underline"
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
            </div>
          </main>
    </DashboardShell>
  );
}