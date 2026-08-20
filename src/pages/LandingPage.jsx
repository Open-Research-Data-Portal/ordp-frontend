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
  BookOpen,
  Users,
  Shield,
  Quote,
} from "lucide-react";
import TopBar from "../layouts/TopBar";
import logo from "../assets/aastulogo.png";
import campusImg from "../assets/1.jfif";

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

const STATS = [
  { label: "Datasets archived", value: "1,240+" },
  { label: "Contributing researchers", value: "310+" },
  { label: "Departments represented", value: "12" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Discover", description: "Search and filter datasets by subject, file type, license, and access level.", icon: Search },
  { step: "02", title: "Access", description: "Download public datasets instantly or request access to restricted collections.", icon: BookOpen },
  { step: "03", title: "Contribute", description: "Upload your research data with rich metadata and receive a citable DOI.", icon: UploadCloud },
  { step: "04", title: "Collaborate", description: "Share datasets with co-authors, invite contributors, and track engagement.", icon: Users },
];

const POPULAR_DATASETS = [
  { id: "p1", accession: "ORDP · CV · 014", category: "COMPUTER VISION", title: "Ethiopian Coffee Leaf Disease Detection", description: "High-resolution images detailing various coffee leaf diseases across growing regions.", views: "12.4K", size: "2.4 GB", files: 18 },
  { id: "p2", accession: "ORDP · NLP · 007", category: "NLP", title: "Amharic News Text Corpus for NLP", description: "Over 100,000 annotated news articles in Amharic from major Ethiopian outlets.", views: "8.2K", size: "450 MB", files: 3 },
  { id: "p3", accession: "ORDP · HLT · 022", category: "HEALTHCARE", title: "Addis Ababa Urban Health Indicators", description: "Time-series respiratory health data correlated with urban traffic patterns.", views: "5.1K", size: "1.2 GB", files: 12 },
  { id: "p4", accession: "ORDP · GEO · 031", category: "GEOGRAPHY", title: "GERD Water Level Satellite Imagery", description: "Multi-spectral satellite imagery tracking reservoir filling phases.", views: "15.3K", size: "8.5 GB", files: 24 },
];

const NEWLY_ADDED_DATASETS = [
  { id: "n1", accession: "ORDP · AGR · 058", category: "AGRICULTURE", title: "Teff Yield Prediction Variables", description: "Soil composition, rainfall, and temperature mapped to Teff crop yields.", views: "142", size: "120 MB", files: 2 },
  { id: "n2", accession: "ORDP · FIN · 059", category: "FINANCE", title: "Mobile Money Transaction Patterns", description: "Anonymized digital financial transactions for economic research.", views: "89", size: "3.1 GB", files: 5 },
  { id: "n3", accession: "ORDP · ENG · 060", category: "ENGINEERING", title: "Addis Ababa Light Rail Transit Usage", description: "Daily passenger volume, peak hours, and route efficiency metrics.", views: "312", size: "56 MB", files: 1 },
  { id: "n4", accession: "ORDP · CLM · 061", category: "CLIMATE", title: "Historical Drought Indices - Horn of Africa", description: "SPEI drought index data spanning three decades across the region.", views: "45", size: "210 MB", files: 4 },
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
    <div onClick={onClick} role="button" tabIndex={0} className="group bg-white rounded-lg overflow-hidden border border-border hover:border-gold hover:shadow-md cursor-pointer transition">
      <div className="px-4 pt-4 flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-wide text-gray-400">{dataset.accession}</span>
        <span className="text-[10px] font-semibold tracking-wide text-navy bg-gold-light px-2 py-1 rounded">{dataset.category}</span>
      </div>
      <div className="p-4 pt-3">
        <h3 className="text-sm font-serif font-bold text-navy leading-snug">{dataset.title}</h3>
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{dataset.description}</p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span>{dataset.views} views</span><span>·</span><span>{dataset.size}</span><span>·</span><span>{dataset.files} file{dataset.files === 1 ? "" : "s"}</span>
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
    if (heroQuery.trim()) navigate(`/datasets?q=${encodeURIComponent(heroQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-bg">
      <TopBar />

      {/* Hero */}
      <section className="relative bg-navy px-6 py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy-light opacity-90" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none" preserveAspectRatio="none" viewBox="0 0 800 400">
          <path d="M0,320 Q200,260 400,300 T800,280" stroke="#A87E0E" strokeWidth="1.5" fill="none" />
          <path d="M0,350 Q200,300 400,335 T800,320" stroke="#A87E0E" strokeWidth="1.5" fill="none" />
          <path d="M0,60 Q200,110 400,75 T800,95" stroke="#A87E0E" strokeWidth="1.5" fill="none" />
        </svg>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <img src={logo} alt="AASTU" className="h-14 w-14 object-contain drop-shadow-md" />
            <div className="text-left hidden sm:block">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-gold uppercase">AASTU</p>
              <p className="text-sm font-serif font-bold text-white">Open Research Data Portal</p>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white leading-tight tracking-tight">
            A living archive of research,<br className="hidden sm:block" /> donated by its authors
          </h1>
          <p className="text-slate-300 mt-5 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Every dataset here was accessioned by the researcher who created it — searchable, citable, and open to the next person who needs it.
          </p>

          <form onSubmit={handleHeroSearch} className="mt-10 max-w-3xl mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-black/20 p-1.5 pl-4">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                placeholder="Search datasets by title, keyword, subject, or researcher…"
                className="flex-1 min-w-0 bg-transparent border-0 px-3 py-3.5 text-sm text-navy placeholder:text-gray-400 focus:outline-none focus:ring-0"
              />
              <button
                type="submit"
                className="shrink-0 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors"
              >
                Search
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Try: <button type="button" onClick={() => navigate("/datasets?q=climate")} className="text-gold/90 hover:text-gold underline-offset-2 hover:underline">climate</button>
              {" · "}
              <button type="button" onClick={() => navigate("/datasets?q=machine+learning")} className="text-gold/90 hover:text-gold underline-offset-2 hover:underline">machine learning</button>
              {" · "}
              <button type="button" onClick={() => navigate("/datasets?q=health")} className="text-gold/90 hover:text-gold underline-offset-2 hover:underline">public health</button>
            </p>
          </form>
        </div>

        <div className="relative max-w-3xl mx-auto mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center px-2">
              <p className="text-2xl sm:text-3xl font-serif font-bold text-white">{stat.value}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 tracking-wide uppercase leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Categories */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-5">
            <div>
              <SectionEyebrow>Browse the collection</SectionEyebrow>
              <h2 className="text-xl font-serif font-bold text-navy">Explore by Category</h2>
            </div>
            <button onClick={() => navigate("/datasets")} className="text-sm font-semibold text-gold hover:underline shrink-0">View All Categories →</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map(({ label, icon: Icon, slug }) => (
              <button key={slug} onClick={() => navigate(`/datasets?category=${slug}`)} className="flex flex-col items-center justify-center gap-2.5 bg-white rounded-xl py-7 border border-border hover:border-gold hover:shadow-sm transition">
                <Icon className="w-5 h-5 text-navy" />
                <span className="text-sm font-medium text-navy">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Popular */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-5">
            <div><SectionEyebrow>Most consulted</SectionEyebrow><h2 className="text-xl font-serif font-bold text-navy">Popular Datasets</h2></div>
            <button onClick={() => navigate("/datasets?sort=popular")} className="text-sm font-semibold text-gold hover:underline shrink-0">Explore More →</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {POPULAR_DATASETS.map((d) => <DatasetCard key={d.id} dataset={d} onClick={() => navigate(`/datasets/${d.id}`)} />)}
          </div>
        </section>

        {/* Newly Added */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-5">
            <div><SectionEyebrow>Latest accessions</SectionEyebrow><h2 className="text-xl font-serif font-bold text-navy">Newly Added</h2></div>
            <button onClick={() => navigate("/datasets?sort=newest")} className="text-sm font-semibold text-gold hover:underline shrink-0">View All →</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {NEWLY_ADDED_DATASETS.map((d) => <DatasetCard key={d.id} dataset={d} onClick={() => navigate(`/datasets/${d.id}`)} />)}
          </div>
        </section>

        {/* Research at AASTU — campus image (NOT hero, NOT feeds) */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-border">
              <img src={campusImg} alt="AASTU campus and research facilities" className="w-full h-72 lg:h-96 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-white font-serif font-bold text-lg">Research at AASTU</p>
                <p className="text-white/80 text-sm mt-1">Advancing science and technology for Ethiopia and beyond.</p>
              </div>
            </div>
            <div>
              <SectionEyebrow>Our mission</SectionEyebrow>
              <h2 className="text-2xl font-serif font-bold text-navy mb-4">Building Ethiopia's open research infrastructure</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                The Open Research Data Portal at Addis Ababa Science and Technology University provides a trusted,
                institutionally governed platform where researchers can publish, discover, and reuse datasets with
                proper metadata, licensing, and long-term preservation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Shield, title: "Institutional governance", desc: "Peer review and admin oversight on every submission." },
                  { icon: Quote, title: "Citable & persistent", desc: "DOI assignment and standardized citation formats." },
                  { icon: Users, title: "Collaborative", desc: "Co-authors, contributors, and controlled sharing." },
                  { icon: BookOpen, title: "Rich metadata", desc: "Categories, keywords, and variable specifications." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-3 p-3 rounded-xl bg-white border border-border">
                    <span className="w-9 h-9 rounded-lg bg-gold-light flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-gold" /></span>
                    <div><p className="text-sm font-semibold text-navy">{title}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-16">
          <div className="text-center mb-10">
            <SectionEyebrow>Getting started</SectionEyebrow>
            <h2 className="text-xl font-serif font-bold text-navy">How the portal works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, title, description, icon: Icon }) => (
              <div key={step} className="bg-white rounded-xl p-6 border border-border hover:border-gold/40 hover:shadow-sm transition text-center">
                <span className="text-xs font-bold text-gold tracking-widest">{step}</span>
                <span className="w-10 h-10 rounded-full bg-navy text-gold flex items-center justify-center mx-auto mt-3 mb-4"><Icon className="w-5 h-5" /></span>
                <h3 className="font-semibold text-navy">{title}</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Research departments */}
        <section className="mb-16 bg-white rounded-2xl border border-border p-8 lg:p-10">
          <div className="text-center mb-8">
            <SectionEyebrow>Across the university</SectionEyebrow>
            <h2 className="text-xl font-serif font-bold text-navy">Research data from every faculty</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">
              Engineering, agriculture, health sciences, computer science, and more — all contributing to Ethiopia&apos;s open research record.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {["Engineering", "Computer Science", "Agriculture", "Health Sciences", "Architecture", "Material Science", "Water Resources", "Applied Physics"].map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => navigate(`/datasets?q=${encodeURIComponent(dept)}`)}
                className="py-4 px-3 rounded-xl border border-border hover:border-gold hover:bg-gold-light/30 text-sm font-medium text-navy transition"
              >
                {dept}
              </button>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative bg-navy rounded-2xl px-8 py-16 text-center overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" preserveAspectRatio="none" viewBox="0 0 800 300">
            <path d="M0,240 Q200,190 400,220 T800,200" stroke="#A87E0E" strokeWidth="1.5" fill="none" />
          </svg>
          <div className="relative max-w-xl mx-auto">
            <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase mb-4">Add to the record</p>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">Share knowledge through data</h2>
            <p className="text-slate-300 mt-3 text-sm sm:text-base">Publish datasets, discover useful data, and help researchers build better solutions.</p>
            <button onClick={() => navigate("/datasets/contribute")} className="mt-7 inline-flex items-center gap-2 bg-gold text-white font-semibold rounded-lg px-6 py-3.5 hover:bg-gold-dark transition">
              <UploadCloud className="w-4 h-4" /> Submit a Dataset
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
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
