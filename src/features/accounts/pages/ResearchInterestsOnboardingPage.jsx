import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import TopBar from "../../../layouts/TopBar";
import Button from "../../../components/ui/Button";
import ResearchInterests from "../../../components/ui/ResearchInterests";
import { useAuth } from "../../../context/useAuth";
import * as authApi from "../api/authApi";
import {
  isInterestsOnboardingSatisfied,
  markInterestsOnboardingSkipped,
  persistSelectedInterests,
  parseInterestCatalog,
  pickerCategories,
  buildProfileCompletionPatch,
  saveProfileCompletion,
} from "../onboarding";
import { RESEARCH_INTEREST_CATEGORIES } from "./constants";
import { getDashboardPath } from "../../../utils/userRoles";

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
  const { user, isAuthenticated, loading: authLoading, setUser } = useAuth();

  const [interestCatalog, setInterestCatalog] = useState(() =>
    parseInterestCatalog(RESEARCH_INTEREST_CATEGORIES)
  );
  const [categories, setCategories] = useState(RESEARCH_INTEREST_CATEGORIES);
  const [options, setOptions] = useState({});
  const [completion, setCompletion] = useState({});
  const [interests, setInterests] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, navigate, user]);

  async function handleSave() {
    if (interests.length === 0) {
      setError("Please select at least one research interest, or choose Skip for now.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await saveProfileCompletion(
        buildProfileCompletionPatch({
          labels: interests,
          catalog: interestCatalog,
          completion,
          options,
        })
      );
      persistSelectedInterests(user, interests);
      setUser?.((current) => ({
        ...(current || {}),
        research_interests: interests,
        researchInterests: interests,
      }));
      navigate(getDashboardPath(user), { replace: true });
    } catch (err) {
      setError(err?.message || "Failed to save your interests. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    // Nothing to persist server-side (the user chose not to pick interests), so
    // record the skip locally and move on. See ../onboarding.js for why.
    markInterestsOnboardingSkipped(user);
    navigate("/profile", { state: { from: "/research-interests-onboarding" }, replace: true });
  }

  /** POST /accounts/profile/interests/other/ — request an unlisted category. */
  async function handleRequestCategory(name) {
    await authApi.addCustomInterest(name);
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="text-center text-slate-500">
          <Loader2 className="w-8 h-8 text-[#B8860B] animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading research interest options…</p>
        </div>
      </div>
    );
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
              Your interests help personalize recommendations, collaborations,
              datasets, and research opportunities. You can change these at any
              time from your profile settings.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

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

            <aside className="space-y-6 rounded-3xl border border-slate-200 bg-[#FDF7E6] p-6">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-full bg-[#B8860B] p-2 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1526]">
                      Why this helps
                    </h3>
                    <p className="text-xs text-slate-500">
                      Optional — you can skip and add these later.
                    </p>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li>Personalized content</li>
                  <li>Better collaboration matches</li>
                  <li>Curated dataset recommendations</li>
                </ul>
              </div>
            </aside>
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
