import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import TopBar from "../../../layouts/TopBar";
import Button from "../../../components/ui/Button";
import ResearchInterests from "../../../components/ui/ResearchInterests";
import { useAuth } from "../../../context/useAuth";
import * as authApi from "../api/authApi";
import { getDashboardPath } from "../../../utils/userRoles";

export default function ResearchInterestsOnboardingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, refreshProfile } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Auth guard — must be logged in (valid token) before this page can load anything.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    async function load() {
      setLoadingCategories(true);
      try {
        const [categoriesResult, profileResult] = await Promise.allSettled([
          authApi.getInterestCategories(),
          authApi.getCompleteProfile(),
        ]);
        if (cancelled) return;

        if (categoriesResult.status === "fulfilled") {
          setCategories(categoriesResult.value || []);
        }
        if (profileResult.status === "fulfilled") {
          const existing = profileResult.value?.interests;
          if (Array.isArray(existing) && existing.length > 0) {
            setSelectedInterests(existing);
          }
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

 async function handleAddOtherInterest(name) {
  setError("");
  try {
    const created = await authApi.addOtherInterest(name);
    const newId = created?.category_id;   // ← was created?.id || created?.category?.id
    if (!newId) throw new Error("Missing category_id from create-category response.");
    setSelectedInterests((prev) => [...prev, { id: newId, name, pending: true }]);
  } catch (err) {
    setError(err?.message || "Failed to add custom interest. Please try again.");
  }
}

async function handleContinue() {
  setError("");
  setSubmitting(true);
  try {
    const approvedIds = new Set(categories.map((c) => c.id));
    const interestIds = selectedInterests
      .map((item) => (typeof item === "object" && item?.id ? item.id : item))
      .filter((id) => approvedIds.has(id)); // only STANDARD-origin ids go in this PATCH

    await authApi.updateCompleteProfile({ interests: interestIds });
    if (refreshProfile) await refreshProfile();
    navigate(getDashboardPath(user), { replace: true });
  } catch (err) {
    setError(err?.message || "Failed to save your interests. Please try again.");
  } finally {
    setSubmitting(false);
  }
}

  function handleSkip() {
    navigate(getDashboardPath(user), { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <TopBar
        title="Onboarding"
        user={{ name: user?.full_name || user?.username || user?.email || "User" }}
      />
      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
        <div className="rounded-3xl bg-white p-8 shadow-lg border border-slate-200">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#0B1526] mb-3">
              Tell us about your Research Interests
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              Your interests help personalize recommendations, collaborations, datasets, and
              research opportunities. Select the fields that best describe your research focus.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="rounded-3xl border border-slate-200 bg-[#F8F7F4] p-6">
            <h2 className="text-lg font-semibold text-[#0B1526] mb-3">Research Interests</h2>
            {loadingCategories ? (
              <p className="text-sm text-slate-500">Loading interests...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-slate-500">
                No interests available yet — you can still add your own below.
              </p>
            ) : null}
            <ResearchInterests
              id="onboardingResearchInterests"
              label="Select your research interests"
              value={selectedInterests}
              onChange={setSelectedInterests}
              categories={categories}
              onAddOtherInterest={handleAddOtherInterest}
            />
          </section>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="secondary" fullWidth={false} onClick={handleSkip} disabled={submitting}>
              Skip for Now
            </Button>
            <Button type="button" variant="gold" fullWidth={false} onClick={handleContinue} loading={submitting} icon={ArrowRight}>
              Finish
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}