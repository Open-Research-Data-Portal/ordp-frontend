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
  MessageSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Send,
  CheckCircle2,
  Building,
  Phone,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import DashboardAwareLayout from "../layouts/DashboardAwareLayout";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/ToastContext";

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
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);

  // Contact Form State
  const [inquiryName, setInquiryName] = useState(user?.full_name || user?.name || "");
  const [inquiryEmail, setInquiryEmail] = useState(user?.email || "");
  const [inquirySubject, setInquirySubject] = useState("");
  const [inquiryTopic, setInquiryTopic] = useState("Technical Support");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);

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

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    if (!inquiryEmail.trim() || !inquiryMessage.trim()) return;

    setSubmittingInquiry(true);
    setTimeout(() => {
      setSubmittingInquiry(false);
      setInquirySent(true);
      addToast("Your support request has been submitted. Our team will respond shortly.", "success");
      setInquirySubject("");
      setInquiryMessage("");
    }, 800);
  };

  return (
    <DashboardAwareLayout>
      <div className="max-w-6xl mx-auto space-y-10 pb-16 animate-fade-in-up">
        {/* ── HERO BANNER ── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#16224D] to-[#0A102D] text-white p-8 sm:p-12 shadow-xl border border-navy-light/20">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-gold text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              AASTU Research Portal Help Desk
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
              How can we assist your research today?
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Search our repository knowledge base, review step-by-step submission guides, or get direct support from the ORDP technical team.
            </p>

            {/* Live Search Input */}
            <div className="mt-8 relative max-w-2xl">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g., uploading data, review scoring, category requests, citation)…"
                className="w-full rounded-2xl bg-white/95 text-navy placeholder:text-slate-400 pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-gold/30 shadow-lg border-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-navy"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

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

        {/* ── CONTACT SUPPORT & DIRECT INQUIRY ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Institutional Contact Info */}
          <div className="bg-gradient-to-br from-[#FAF9F5] to-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-serif font-bold text-navy">Direct Support Channels</h3>
              <p className="text-xs text-slate-500 mt-1">
                Reach out directly to the institutional repository desk at Addis Ababa Science &amp; Technology University.
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <Mail className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-navy">Support Email</p>
                  <a href="mailto:support.ordp@aastu.edu.et" className="text-slate-500 hover:text-navy underline">
                    support.ordp@aastu.edu.et
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <Building className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-navy">Research Directorate</p>
                  <p className="text-slate-500">Center of Excellence Building, 3rd Floor, AASTU Campus</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <Clock className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-navy">Operating Hours</p>
                  <p className="text-slate-500">Monday – Friday: 8:30 AM – 5:30 PM (EAT)</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate("/about")}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-navy transition shadow-2xs cursor-pointer"
              >
                <span>About ORDP Mission &amp; Ethics</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Inquiry Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-gold-dark" />
              <h3 className="text-lg font-serif font-bold text-navy">Submit a Support Ticket</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Have an issue with dataset uploading, peer review scoring, account permissions, or data accessioning? Send us a ticket.
            </p>

            {inquirySent ? (
              <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-emerald-900 text-base">Inquiry Successfully Submitted!</h4>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  Thank you for reaching out. A confirmation has been logged and our support engineers will review your request.
                </p>
                <button
                  type="button"
                  onClick={() => setInquirySent(false)}
                  className="mt-4 px-4 py-2 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy-light transition"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name</label>
                    <input
                      required
                      type="text"
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      placeholder="e.g. Dr. Almaz Bekele"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Institutional Email</label>
                    <input
                      required
                      type="email"
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                      placeholder="almaz.b@aastu.edu.et"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Inquiry Topic</label>
                    <select
                      value={inquiryTopic}
                      onChange={(e) => setInquiryTopic(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
                    >
                      <option value="Technical Support">Technical Issue / Bug</option>
                      <option value="Dataset Ingestion">Dataset Upload &amp; Ingestion</option>
                      <option value="Peer Review">Peer Review &amp; Evaluation</option>
                      <option value="Category Proposal">Category / Ontology Request</option>
                      <option value="Access & Permissions">Access &amp; Role Permissions</option>
                      <option value="General Question">General Inquiry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                    <input
                      required
                      type="text"
                      value={inquirySubject}
                      onChange={(e) => setInquirySubject(e.target.value)}
                      placeholder="Brief summary of your question…"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Message Details</label>
                  <textarea
                    required
                    rows={4}
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    placeholder="Describe your question or issue in detail. Include dataset IDs, URLs, or error messages where applicable…"
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submittingInquiry}
                    className="inline-flex items-center gap-2 rounded-xl bg-gold hover:bg-gold-dark text-white text-xs font-bold px-6 py-3 shadow-xs hover:shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submittingInquiry ? "Submitting…" : "Submit Support Ticket"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </DashboardAwareLayout>
  );
}
