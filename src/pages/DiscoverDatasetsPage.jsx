import { useEffect, useState } from "react";
import { ArrowLeft, Database, Download, Eye, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardAwareLayout from "../layouts/DashboardAwareLayout";
import { searchDatasets } from "../api/search";
import { getDatasetImage } from "../utils/datasetImage";

export default function DiscoverDatasetsPage() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    searchDatasets({ order_by: "popular" })
      .then((items) => {
        if (active) setDatasets(items);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <DashboardAwareLayout>
      <button type="button" onClick={() => navigate("/datasets")} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Back to datasets
      </button>
      <div className="mb-8 flex items-start gap-3">
        <div className="rounded-xl bg-gold/15 p-3 text-gold-dark"><History className="h-5 w-5" /></div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-navy">Discover More</h1>
          <p className="mt-1 text-sm text-gray-500">Explore more of the research datasets available in the repository.</p>
        </div>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading datasets…</p>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">We could not load discoverable datasets right now. Please try again shortly.</div>}
      {!loading && !error && datasets.length === 0 && <p className="text-sm text-gray-500">No additional datasets are available yet.</p>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {datasets.map((dataset) => {
          const image = getDatasetImage(dataset);
          return (
            <button key={dataset.id} type="button" onClick={() => navigate(`/datasets/${dataset.id}`)} className="group overflow-hidden rounded-xl border border-border bg-white text-left shadow-sm transition hover:shadow-md">
              <div className="h-40 overflow-hidden bg-navy/5">
                {image ? <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-navy/10 to-gold/10"><Database className="h-8 w-8 text-navy/30" /></div>}
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-navy group-hover:text-gold">{dataset.title}</p>
                <p className="mt-2 line-clamp-2 text-xs text-gray-500">{dataset.metadata?.description || dataset.description || "Research dataset"}</p>
                <div className="mt-4 flex gap-4 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{Number(dataset.views ?? dataset.view_count ?? 0).toLocaleString()}</span>
                  <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" />{Number(dataset.downloads ?? dataset.download_count ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </DashboardAwareLayout>
  );
}
