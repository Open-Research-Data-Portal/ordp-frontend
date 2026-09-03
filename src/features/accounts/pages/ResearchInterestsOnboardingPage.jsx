import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import TopBar from "../../../layouts/TopBar";
import Button from "../../../components/ui/Button";
import ResearchInterests from "../../../components/ui/ResearchInterests";
import { useAuth } from "../../../context/useAuth";
import * as authApi from "../api/authApi";

/**
 * Single-step onboarding: research interests only.
 *
 * The former three-step wizard (college/center → department → interests) is
 * gone; after email verification the user lands straight here. Choosing
 * interests is optional — "Skip for now" completes onboarding without them.
 * Either way the user ends up on the dashboard, and everything picked here
 * stays editable later from profile settings, which renders the very same
 * ResearchInterests control.
 */
export default function ResearchInterestsOnboardingPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Auth guard + prefill. Interests already on the profile are loaded so this
  // page behaves as an editor rather than a blank form on a second visit.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (!isAuthenticated) return;

    let cancelled = false;

    async function load() {
      setLoadingData(true);
      try {
        const [options, completion] = await Promise.allSettled([
          authApi.getProfileOptions(),
          authApi.getProfileCompletion(),
        ]);

        if (cancelled) return;

        if (options.status === "fulfilled") {
          const payload = options.value || {};
          setOptions(payload);
          const remote = parseInterestCatalog(payload);
          if (remote.length > 0) {
            setInterestCatalog(remote);
            const picker = pickerCategories(remote);
            if (picker.length > 0) setCategories(picker);
          }
        }

        if (completion.status === "fulfilled") {
          const data = completion.value;
          setCompletion(data || {});
          // Nothing left to do here — don't strand the user on an optional
          // page. Users who already have interests edit them from profile
          // settings, so this page always starts as a first-run picker.
          if (
            isInterestsOnboardingSatisfied({
              completion: data,
              user,
              backendCompleted: authApi.isProfileCompleted(data),
            })
          ) {
            navigate("/dashboard", { replace: true });
            return;
          }
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

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
      setError(err?.message || "Failed to save your interests. Please try again.");
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
      <TopBar
        title="Onboarding"
        user={{ name: user?.full_name || user?.username || user?.email || "User" }}
      />
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

          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <section className="rounded-3xl border border-slate-200 bg-[#F8F7F4] p-6">
              <h2 className="text-lg font-semibold text-[#0B1526] mb-3">
                Research Interests
              </h2>
              <ResearchInterests
                id="onboardingResearchInterests"
                label="Select your research interests"
                value={interests}
                onChange={setInterests}
                categories={categories}
                onRequestCategory={handleRequestCategory}
              />
            </section>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              fullWidth={false}
              onClick={handleSkip}
              disabled={submitting}
            >
              Skip for Now
            </Button>
            <Button
              type="button"
              variant="gold"
              fullWidth={false}
              onClick={handleSave}
              loading={submitting}
              icon={ArrowRight}
            >
              Finish
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
