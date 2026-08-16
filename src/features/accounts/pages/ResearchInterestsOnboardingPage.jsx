import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import TopBar from "../../../layouts/TopBar";
import Button from "../../../components/ui/Button";
import ResearchInterests from "../../../components/ui/ResearchInterests";
import { useAuth } from "../../../context/useAuth";
import * as authApi from "../api/authApi";
import { RESEARCH_INTEREST_CATEGORIES } from "./constants";

export default function ResearchInterestsOnboardingPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState(user?.researchInterests || user?.research_interests || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  async function handleContinue() {
    if (!canContinue) return;
    setError("");
    setSubmitting(true);

    try {
      await authApi.updateProfile({
        research_interests: selectedInterests,
        researchInterestsCompleted: true,
        onboardingCompleted: true,
      });
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

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <TopBar title="Onboarding" user={{ name: user?.full_name || user?.username || user?.email || "User" }} />
      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
        <div className="rounded-3xl bg-white p-8 shadow-lg border border-slate-200">
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm text-slate-500 uppercase tracking-[0.25em]">
              <div className="h-1.5 w-16 rounded-full bg-[#B8860B]" />
              <span>Step 1 of 3</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#0B1526] mb-3">Tell us about your Research Interests</h1>
              <p className="text-sm text-slate-500 max-w-2xl">
                Your interests help personalize recommendations, collaborations, datasets, and research opportunities.
                Select the fields that best describe your research focus.
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-[#F8F7F4] p-6">
                <h2 className="text-lg font-semibold text-[#0B1526] mb-3">Research Interests</h2>
                <ResearchInterests
                  id="onboardingResearchInterests"
                  label="Select your research interests"
                  required
                  value={selectedInterests}
                  onChange={setSelectedInterests}
                  categories={RESEARCH_INTEREST_CATEGORIES}
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </section>

            <aside className="space-y-6 rounded-3xl border border-slate-200 bg-[#FDF7E6] p-6">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-full bg-[#B8860B] p-2 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1526]">Why this matters</h3>
                    <p className="text-xs text-slate-500">Personalized content, better collaboration matches, and curated dataset recommendations.</p>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li>• Customize your research profile</li>
                  <li>• Receive relevant research opportunities</li>
                  <li>• Make collaboration suggestions more accurate</li>
                </ul>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-[#0B1526] mb-3">Need help?</h3>
                <p className="text-sm text-slate-500">If you don’t find your exact field, request a custom category and we’ll review it.</p>
              </div>
            </aside>
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
