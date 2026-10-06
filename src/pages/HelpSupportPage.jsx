import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  HelpCircle,
  Search,
  BookOpen,
  ShieldCheck,
  Share2,
  UserCheck,
  Mail,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Building,
  Phone,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import DashboardAwareLayout from "../layouts/DashboardAwareLayout";
import { useAuth } from "../context/useAuth";

const FAQ_CATEGORIES = [
  "All",
  "Dataset Uploads",
  "Peer Review",
  "Access & Sharing",
  "Account & Roles",
];

const FAQS = [
  {
    category: "Dataset Uploads",
    question: "What file formats and size limits are supported for dataset uploads?",
    answer:
      "ORDP accepts tabular data (CSV, TSV, Excel, Parquet), scientific formats (HDF5, NetCDF, MATLAB), archives (ZIP, TAR.GZ), and document collections. The single file size limit for direct upload is 500 MB. For massive research data files, contact the institutional repository team for assisted high-throughput accessioning.",
  },
  {
    category: "Dataset Uploads",
    question: "How do I propose a new research category if my subject is not listed?",
    answer:
      "When filling out the Metadata Entry form, select 'Other (suggest or create a new category)' from the category dropdown. You can type your proposed category name and click '+ Add Category' to register and select it immediately. Administrators review and verify newly proposed categories regularly.",
  },
  {
    category: "Dataset Uploads",
    question: "What happens to draft datasets that are not published?",
    answer:
      "Draft datasets remain safely saved to your account. Under institutional repository retention rules, drafts inactive for over 30 days without updates may be automatically flagged for cleanup. You can resume and submit drafts anytime from your My Datasets workspace.",
  },
  {
    category: "Peer Review",
    question: "How does the evaluation scoring criteria work?",
    answer:
      "Submitted datasets are evaluated by institutional peer reviewers across 6 weighted dimensions: Metadata Completeness (25%), Data Integrity (25%), Ethical Compliance (20%), Documentation (15%), Access & Licensing (10%), and Novelty/Relevance (5%). A total score of 70% or higher is recommended for open publication.",
  },
  {
    category: "Peer Review",
    question: "How long does the dataset review process take?",
    answer:
      "Reviews are typically completed within 3 to 5 business days. Once a decision (Approved, Revision Requested, or Rejected) is reached, you will receive an immediate real-time bell notification and an update in your Submissions log.",
  },
  {
    category: "Access & Sharing",
    question: "How can I request access to a restricted dataset?",
    answer:
      "For restricted datasets, click the 'Request Access' button on the dataset page. Provide your academic purpose, duration, and institutional justification. The dataset author or administrator will review your request and grant access upon approval.",
  },
  {
    category: "Access & Sharing",
    question: "How do I cite datasets published on ORDP?",
    answer:
      "Every published dataset is assigned an institutional citation format with its title, author, year, and persistent identifier. You can copy the formatted citation or download BibTeX / APA entries directly from the dataset view page.",
  },
  {
    category: "Account & Roles",
    question: "How do I switch roles if I am both a Researcher and Reviewer?",
    answer:
      "Click your profile avatar at the top right of the dashboard header. In the dropdown menu, use the 'Active Role' switcher to change between User, Reviewer, or Admin modes. The sidebar navigation and workspace will dynamically adjust.",
  },
  {
    category: "Account & Roles",
    question: "How do I update my profile photo and institutional affiliation?",
    answer:
      "Go to Settings → Profile. Under the Profile Header, click the camera icon to upload a profile photo. Fill in your department, college, ORCID ID, and research interests, then click 'Save Complete Profile'. Your photo is instantly updated across your header badge and public dataset author cards.",
  },
];

const GUIDES = [
  {
    icon: BookOpen,
    title: "Dataset Publishing Guide",
    desc: "Learn how to prepare clean data files, complete descriptive metadata, choose open licenses, and pass peer review on the first attempt.",
    link: "/datasets/contribute?new=1",
    tag: "Submission",
  },
  {
    icon: ShieldCheck,
    title: "Reviewer Criteria & Standards",
    desc: "Understand ethical compliance, FAIR data principles, data validation checks, and institutional scoring guidelines.",
    link: "/about",
    tag: "Evaluation",
  },
  {
    icon: Share2,
    title: "Data Access & Sharing Policy",
    desc: "Guidelines for open access, restricted datasets, embargoed releases, data protection, and citation etiquette.",
    link: "/datasets",
    tag: "Governance",
  },
  {
    icon: UserCheck,
    title: "Roles & Delegations",
    desc: "Overview of administrative workflows, reviewer assignments, profile management, and account succession.",
    link: "/profile",
    tag: "Accounts",
  },
];

export default function HelpSupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchCat = selectedCategory === "All" || faq.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <DashboardAwareLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        {/* ── PAGE HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-light/50 border border-gold/20 text-gold-dark text-[11px] font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3" />
              Help Desk
            </div>
            <h1 className="text-2xl font-bold text-navy">Help &amp; Support</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Search our knowledge base, read documentation guides, or contact support.
            </p>
          </div>
          {/* Live Search */}
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FAQs…"
              className="w-full rounded-xl bg-white border border-slate-200 text-navy placeholder:text-slate-400 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold shadow-xs transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-navy"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── QUICK GUIDES GRID ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif font-bold text-navy">Guides &amp; Reference Workflows</h2>
              <p className="text-xs text-slate-500 mt-0.5">Core documentation for researchers, reviewers, and administrators.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GUIDES.map((g) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.title}
                  onClick={() => navigate(g.link)}
                  className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-gold/60 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gold-light/40 border border-gold/20 flex items-center justify-center text-gold-dark group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {g.tag}
                      </span>
                    </div>
                    <h3 className="font-bold text-navy text-sm group-hover:text-gold-dark transition-colors">
                      {g.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      {g.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-gold-dark group-hover:translate-x-0.5 transition-transform">
                    <span>Read guide</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FAQS SECTION ── */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-gold-dark" />
                <h2 className="text-xl font-serif font-bold text-navy">Frequently Asked Questions</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Common questions about managing data, peer review, access delegation, and repository policies.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-navy text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-slate-500">No questions matched your search query.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  className="mt-2 text-xs text-gold-dark font-semibold hover:underline"
                >
                  Clear filters &amp; view all FAQs
                </button>
              </div>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isExpanded = expandedFaqIndex === idx;
                return (
                  <div key={faq.question} className="py-4">
                    <button
                      type="button"
                      onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between gap-4 text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
                        <span className="font-semibold text-sm text-navy group-hover:text-gold-dark transition-colors">
                          {faq.question}
                        </span>
                      </div>
                      <span className="p-1 rounded-lg text-slate-400 group-hover:text-navy group-hover:bg-slate-100 transition">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="mt-3 pl-5 text-xs sm:text-sm text-slate-600 leading-relaxed bg-[#FAF9F5] p-4 rounded-xl border border-slate-100 animate-fade-in">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── CONTACT SUPPORT CHANNELS ── */}
        <section className="bg-gradient-to-br from-[#FAF9F5] to-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
          <div className="max-w-2xl">
            <h3 className="text-lg font-serif font-bold text-navy">Direct Support Channels</h3>
            <p className="text-xs text-slate-500 mt-1">
              Reach out directly to the institutional repository desk at Addis Ababa Science &amp; Technology University.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs">
              <Mail className="w-5 h-5 text-gold-dark shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-navy text-xs">Support Email</p>
                <a href="mailto:support.ordp@aastu.edu.et" className="text-xs text-slate-500 hover:text-navy underline break-all">
                  support.ordp@aastu.edu.et
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs">
              <Building className="w-5 h-5 text-gold-dark shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-navy text-xs">Research Directorate</p>
                <p className="text-xs text-slate-500">Center of Excellence Building, 3rd Floor, AASTU Campus</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs">
              <Clock className="w-5 h-5 text-gold-dark shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-navy text-xs">Operating Hours</p>
                <p className="text-xs text-slate-500">Monday – Friday: 8:30 AM – 5:30 PM (EAT)</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Need more details on institutional repository ethics, data accessioning, or intellectual property?
            </p>
            <button
              type="button"
              onClick={() => navigate("/about")}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-navy transition shadow-2xs shrink-0 cursor-pointer"
            >
              <span>About ORDP Mission &amp; Ethics</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>
    </DashboardAwareLayout>
  );
}
