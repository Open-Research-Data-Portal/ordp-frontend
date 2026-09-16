import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Landmark,
  ShieldPlus,
  Leaf,
  Building2,
  Globe,
  ArrowRight,
  Eye,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import TopBar from "../layouts/TopBar";
import logo from "../assets/aastulogo.png";
import center1Img from "../assets/center1.jfif";
import center2Img from "../assets/center2.jpeg";
import { searchDatasets } from "../api/search";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/ToastContext";
import { getDatasetImage } from "../utils/datasetImage";

function formatRelativeDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    const diffMs = Date.now() - date.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days < 1) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      if (hours < 1) return "Added just now";
      return hours === 1 ? "Added 1 hour ago" : `Added ${hours} hours ago`;
    }
    if (days === 1) return "Added 1 day ago";
    if (days < 30) return `Added ${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `Added ${months} mo ago`;
    return `Added ${Math.floor(months / 12)}y ago`;
  } catch {
    return "";
  }
}

const STATS = [
  { label: "Datasets archived", value: "1,240+" },
  { label: "Contributing researchers", value: "310+" },
];

const CENTERS_OF_EXCELLENCE = [
  { name: "Artificial Intelligence & Robotics", description: "AI, automation & intelligent systems for smart services, robotics, and future-ready research.", icon: Bot },
  { name: "Bioprocess & Biotechnology", description: "Biotechnology and sustainable bioprocessing for health, agriculture, industry, and the environment.", icon: ShieldPlus },
  { name: "Construction Quality & Technology", description: "Construction innovation, resilient infrastructure, materials, and quality-focused engineering.", icon: Building2 },
  { name: "HPC & Big Data Analytics", description: "Advanced computing, scalable data systems, machine learning, and reproducible analytics.", icon: Globe },
  { name: "Mineral Exploration, Extraction & Processing", description: "Mineral technology and responsible resource management from exploration through processing.", icon: Landmark },
  { name: "Nanotechnology", description: "Nanomaterials and nanoscale innovation for new devices, materials, and scientific applications.", icon: ImageIcon },
  { name: "Nuclear Reactor Technology", description: "Nuclear science, technology, safety, and applications that support Ethiopia's technical capacity.", icon: ShieldPlus },
  { name: "Sustainable Energy Technology", description: "Renewable energy, energy efficiency, storage, and sustainable power solutions for communities.", icon: Leaf },
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
  const categoryName = dataset.metadata?.category_name || dataset.category || dataset.subject_name || "Research";
  const views = dataset.view_count ?? dataset.views ?? 0;
  const downloads = dataset.downloads ?? dataset.download_count ?? 0;
  const thumbnailUrl = getDatasetImage(dataset);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="group bg-white rounded-xl overflow-hidden border border-border hover:border-gold/40 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="h-36 bg-navy/5 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-navy/10 to-gold/10" />
        )}
      </div>
      <div className="p-4">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gold">{categoryName}</span>
        <h3 className="text-sm font-semibold text-navy mt-1 line-clamp-2 group-hover:text-gold transition-colors">{dataset.title}</h3>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{typeof views === 'number' ? views.toLocaleString() : views}</span>
          <span className="flex items-center gap-1"><Download className="w-3 h-3" />{typeof downloads === 'number' ? downloads.toLocaleString() : downloads}</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const openDataset = (dataset) => {
    if (!isAuthenticated) {
      addToast("Please log in or register first to view dataset details.", "info");
      return;
    }
    navigate(`/datasets/${dataset.id}`);
  };
  const openAnalyticsDatasets = () => {
    if (!isAuthenticated) {
      addToast("Please log in or register first to explore analytics datasets.", "info");
      return;
    }
    navigate("/datasets?q=HPC%20Big%20Data%20Analytics");
  };
  const [popularDatasets, setPopularDatasets] = useState([]);
  const [newestDatasets, setNewestDatasets] = useState([]);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [datasetsError, setDatasetsError] = useState(false);
  const [portalStats, setPortalStats] = useState({
    datasetsCount: null,
    researchersCount: null,
  });

  useEffect(() => {
    async function fetchDatasets() {
      setDatasetsLoading(true);
      setDatasetsError(false);
      try {
        const [pop, newests, allApproved] = await Promise.all([
          searchDatasets({ order_by: "popular" }),
          searchDatasets({ order_by: "newest" }),
          searchDatasets({}),
        ]);
        setPopularDatasets(pop.slice(0, 3));
        setNewestDatasets(newests.slice(0, 3));

        const list = Array.isArray(allApproved) ? allApproved : [];
        const uniqueResearchers = new Set();
        list.forEach((d) => {
          if (d.owner) uniqueResearchers.add(String(d.owner));
          else if (d.owner_name) uniqueResearchers.add(String(d.owner_name).trim().toLowerCase());
          if (Array.isArray(d.contributors)) {
            d.contributors.forEach((c) => {
              if (c.user) uniqueResearchers.add(String(c.user));
              else if (c.name) uniqueResearchers.add(String(c.name).trim().toLowerCase());
            });
          }
        });

        setPortalStats({
          datasetsCount: list.length,
          researchersCount: uniqueResearchers.size,
        });
      } catch (err) {
        console.error("Failed to load landing page datasets:", err);
        setDatasetsError(true);
      } finally {
        setDatasetsLoading(false);
      }
    }

    fetchDatasets();
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <TopBar />

      {/* Hero — campus image with copy beside it, no navy wash */}
      <section className="border-b border-border bg-white px-6 py-10 sm:py-14 lg:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14">
          <div className="order-2 flex flex-col justify-center lg:order-1">
            <div className="mb-6 flex items-center gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">AASTU</p>
                <p className="font-serif text-base font-bold text-navy">Open Research Data Portal</p>
              </div>
            </div>

            <SectionEyebrow>Research excellence at AASTU</SectionEyebrow>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight text-navy sm:text-4xl lg:text-[2.65rem]">
              A living archive of research, donated by its authors
            </h1>
            <p className="mt-3 font-serif text-lg font-semibold text-navy/80">Where ideas become impact</p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
              Every dataset here was accessioned by the researcher who created it — searchable, citable, and open to the next person who needs it. AASTU&apos;s Centers of Excellence bring researchers, students, and industry partners together; this portal makes the data behind that work easier to discover, reuse, and build on.
            </p>

            <div className="mt-8 grid max-w-md grid-cols-2 gap-6 border-t border-border pt-5">
              <div>
                <p className="font-serif text-xl font-bold text-navy">
                  {portalStats.datasetsCount !== null ? portalStats.datasetsCount.toLocaleString() : "…"}
                </p>
                <p className="mt-1 text-[9px] uppercase leading-snug tracking-wide text-gray-500">
                  Datasets archived
                </p>
              </div>
              <div>
                <p className="font-serif text-xl font-bold text-navy">
                  {portalStats.researchersCount !== null ? portalStats.researchersCount.toLocaleString() : "…"}
                </p>
                <p className="mt-1 text-[9px] uppercase leading-snug tracking-wide text-gray-500">
                  Contributing researchers
                </p>
              </div>
            </div>

          </div>
          <div className="order-1 overflow-hidden lg:order-2">
            <img
              src={center1Img}
              alt="AASTU Center of Excellence research facilities"
              className="h-48 w-full rounded-2xl object-cover sm:h-60 lg:h-[22rem]"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Popular */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-5">
            <div><SectionEyebrow>Most consulted</SectionEyebrow><h2 className="text-xl font-serif font-bold text-navy">Popular Datasets</h2></div>
            <button onClick={() => navigate("/datasets?sort=popular")} className="text-sm font-semibold text-gold hover:underline shrink-0">Explore More →</button>
          </div>
          {datasetsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 rounded-lg bg-white border border-border animate-pulse" />
              ))}
            </div>
          ) : popularDatasets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white py-12 text-center">
              <p className="text-sm text-gray-400">
                {datasetsError
                  ? "Couldn't load datasets right now. Please try again shortly."
                  : "No datasets available yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {popularDatasets.map((d) => <DatasetCard key={d.id} dataset={d} onClick={() => openDataset(d)} />)}
            </div>
          )}
        </section>

        {/* Newly Added */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-5">
            <div><SectionEyebrow>Latest accessions</SectionEyebrow><h2 className="text-xl font-serif font-bold text-navy">Newly Added</h2></div>
            <button onClick={() => navigate("/datasets?sort=newest")} className="text-sm font-semibold text-gold hover:underline shrink-0">View All →</button>
          </div>
          {datasetsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 rounded-lg bg-white border border-border animate-pulse" />
              ))}
            </div>
          ) : newestDatasets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white py-12 text-center">
              <p className="text-sm text-gray-400">
                {datasetsError
                  ? "Couldn't load datasets right now. Please try again shortly."
                  : "No datasets available yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {newestDatasets.map((d) => <DatasetCard key={d.id} dataset={d} onClick={() => openDataset(d)} />)}
            </div>
          )}
        </section>

        <section className="mb-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="order-2 lg:order-1 overflow-hidden rounded-2xl border border-border bg-white p-2 shadow-lg">
            <img src={center2Img} alt="AASTU HPC and Big Data Analytics Center" className="h-72 w-full rounded-xl object-cover lg:h-96" />
          </div>
          <div className="order-1 lg:order-2">
            <SectionEyebrow>HPC &amp; Big Data Analytics</SectionEyebrow>
            <h2 className="text-2xl font-serif font-bold leading-tight text-navy sm:text-3xl">Advanced computing for AASTU research</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              The HPC and Big Data Analytics Center provides advanced computing, scalable storage, and data science expertise for demanding research across AASTU. Its infrastructure supports simulation, machine learning, geospatial analysis, genomics, climate modelling, and engineering research.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              This portal is the center&apos;s shared research record: a place to publish well-described datasets, preserve provenance, support reproducible workflows, and help researchers responsibly reuse high-value data.
            </p>
            <button onClick={openAnalyticsDatasets} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-white transition hover:bg-gold-dark">
              Explore analytics datasets <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="mb-16">
          <div className="mb-7">
            <SectionEyebrow>AASTU Centers of Excellence</SectionEyebrow>
            <h2 className="text-2xl font-serif font-bold text-navy sm:text-3xl">Eight centers driving discovery</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">Explore the specialized research centers that contribute knowledge, tools, and data to AASTU&apos;s open research community.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CENTERS_OF_EXCELLENCE.map(({ name, description, icon: Icon }) => (
              <article key={name} className="rounded-xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gold hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold-light text-gold">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-bold leading-snug text-navy">{name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">{description}</p>
              </article>
            ))}
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <blockquote className="mb-7 max-w-2xl border-l-2 border-gold pl-4 text-sm italic leading-relaxed text-slate-600">
            “Contribute today&apos;s research data so tomorrow&apos;s discoveries have a stronger foundation.”
            <cite className="mt-2 block text-xs font-semibold not-italic tracking-wide text-gold-dark">AASTU Open Research Data Portal</cite>
          </blockquote>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="AASTU" className="h-10 w-10 object-contain" />
              <div>
                <p className="text-sm font-serif font-bold text-navy">AASTU Open Research Data Portal</p>
                <p className="text-xs text-gray-500 mt-0.5">Addis Ababa Science and Technology University</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500">
              <button onClick={() => navigate("/datasets")} className="hover:text-navy">Browse Datasets</button>
              <button onClick={() => navigate("/datasets/contribute")} className="hover:text-navy">Contribute</button>
              <button onClick={() => navigate("/login")} className="hover:text-navy">Login</button>
              <button onClick={() => navigate("/support")} className="hover:text-navy">Support</button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-8 text-center sm:text-left">
            © {new Date().getFullYear()} Addis Ababa Science and Technology University. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}