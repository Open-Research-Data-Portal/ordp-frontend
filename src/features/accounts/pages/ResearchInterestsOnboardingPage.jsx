import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import TopBar from "../../../layouts/TopBar";
import Button from "../../../components/ui/Button";
import ResearchInterests from "../../../components/ui/ResearchInterests";
import { useAuth } from "../../../context/useAuth";
import * as authApi from "../api/authApi";

export default function ResearchInterestsOnboardingPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const canContinue = selectedInterests.length >= 1;

  useEffect(() => {
    const completed = Boolean(
      user?.researchInterestsCompleted ||
      user?.onboardingCompleted ||
      user?.research_interests_completed ||
      user?.onboarding_completed
    );
    if (completed) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    authApi.getCategories()
      .then((list) => {
        if (cancelled) return;
        const items = Array.isArray(list) ? list : (list?.results || []);
        setCategories(items);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingCategories(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleContinue() {
    if (!canContinue) return;
    setError("");
    setSubmitting(true);

    try {
      const interestIds = selectedInterests
        .map((item) => (typeof item === "object" && item?.id ? item.id : null))
        .filter(Boolean);

      const payload = { interests: interestIds };
      await authApi.updateCompleteProfile(payload);
      await updateProfile({
        researchInterests: selectedInterests,
        researchInterestsCompleted: true,
        onboardingCompleted: true,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Failed to save interests. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddOtherInterest(name) {
    setError("");
    try {
      const created = await authApi.addOtherInterest(name);
      const newId = created?.id || created?.category?.id;
      if (!newId) throw new Error("Missing id from create-category response.");
      const newObj = { id: newId, name, pending: true };
      setSelectedInterests((prev) => [...prev, newObj]);
    } catch (err) {
      setError(err?.message || "Failed to add custom interest.");
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <TopBar title="Onboarding" user={{ name: user?.full_name || user?.username || user?.email || "User" }} />
      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
        <div className="rounded-3xl bg-white p-8 shadow-lg border border-slate-200">
          <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#0B1526] mb-3">Tell us about your Research Interests</h1>
              <p className="text-sm text-slate-500 max-w-2xl">
                Your interests help personalize recommendations, collaborations, datasets, and research opportunities.
                Select the fields that best describe your research focus.
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr]">
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-[#F8F7F4] p-6">
                <h2 className="text-lg font-semibold text-[#0B1526] mb-3">Research Interests</h2>
                {loadingCategories ? (
                  <p className="text-sm text-slate-500">Loading interests...</p>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-slate-500">No interests available yet.</p>
                ) : (
                  <ResearchInterests
                    id="onboardingResearchInterests"
                    label="Select your research interests"
                    required
                    value={selectedInterests}
                    onChange={setSelectedInterests}
                    categories={categories}
                    onAddOtherInterest={handleAddOtherInterest}
                  />
                )}
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </section>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="secondary" fullWidth={false} onClick={() => navigate("/dashboard")}>Skip for Now</Button>
            <Button type="button" variant="gold" fullWidth={false} onClick={handleContinue} disabled={!canContinue} loading={submitting} icon={ArrowRight}>
              Continue
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
