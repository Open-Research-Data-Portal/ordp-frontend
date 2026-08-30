import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Plus } from "lucide-react";
import TopBar from "../../../layouts/TopBar";
import Button from "../../../components/ui/Button";
import StepIndicator from "../../../components/StepIndicator";
import Select from "../../../components/ui/Select";
import ResearchInterests from "../../../components/ui/ResearchInterests";
import { useAuth } from "../../../context/useAuth";
import * as authApi from "../api/authApi";
import { RESEARCH_INTEREST_CATEGORIES } from "./constants";

const STEPS = ["College / Center", "Department", "Research Interests"];

const AFFILIATION_TYPES = [
  { value: "college", label: "College" },
  { value: "center_of_excellence", label: "Center of Excellence" },
];

/** Normalizes list items (string or {id,name}) into Select options. */
function optionList(items) {
  return (items || []).map((item) => {
    if (typeof item === "string") return { value: item, label: item };
    const id = item?.id ?? item?.slug ?? item?.code ?? item?.name;
    const label = item?.name ?? item?.title ?? String(id);
    return { value: String(id), label };
  });
}

function unwrapCompletionInterests(data) {
  return (
    data?.research_interests ??
    data?.researchInterests ??
    data?.interests ??
    []
  );
}

export default function ResearchInterestsOnboardingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [step, setStep] = useState(1);
  const [affType, setAffType] = useState("college");
  const [colleges, setColleges] = useState([]);
  const [centers, setCenters] = useState([]);
  const [affId, setAffId] = useState("");

  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [interests, setInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const affOptions = useMemo(
    () => optionList(affType === "center_of_excellence" ? centers : colleges),
    [affType, colleges, centers]
  );
  const departmentOptions = useMemo(() => optionList(departments), [departments]);

  const canContinue =
    step === 1
      ? Boolean(affId)
      : step === 2
      ? Boolean(departmentId)
      : interests.length >= 1;

  // Auth guard + initial data load + completion check.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (!isAuthenticated) return;

    let cancelled = false;

    async function load() {
      setLoadingData(true);
      setLoadError("");
      try {
        const [collegeList, centerList] = await Promise.all([
          authApi.getColleges(),
          authApi.getCentersOfExcellence(),
        ]);
        if (cancelled) return;
        setColleges(collegeList);
        setCenters(centerList);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err?.message || "Could not load affiliation options. Please try again."
        );
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    authApi
      .getProfileCompletion()
      .then((completion) => {
        if (cancelled) return;
        if (authApi.isProfileCompleted(completion)) {
          navigate("/dashboard", { replace: true });
          return;
        }
        const nextAffType =
          completion?.affiliation_type ?? completion?.college_type ?? "college";
        const nextAffId = completion?.college_id ?? completion?.college ?? "";
        const nextDeptId =
          completion?.department_id ?? completion?.department ?? "";
        setAffType(
          nextAffType === "center_of_excellence"
            ? "center_of_excellence"
            : "college"
        );
        setAffId(nextAffId ? String(nextAffId) : "");
        setDepartmentId(nextDeptId ? String(nextDeptId) : "");
        setInterests(unwrapCompletionInterests(completion));
      })
      .catch(() => {
        // Prefill is best-effort; don't block onboarding on it.
      });

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, navigate]);
// Whenever an affiliation is chosen, fetch its departments.
  useEffect(() => {
    if (!affId) {
      setDepartments([]);
      setDepartmentId("");
      return;
    }
    let cancelled = false;
    setLoadingDepartments(true);
    setError("");
    authApi
      .getDepartments({ parentType: affType, parentId: affId })
      .then((list) => {
        if (cancelled) return;
        setDepartments(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Could not load departments. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadingDepartments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [affId, affType]);

  function handleChangeAffiliation(value) {
    setAffId(value);
    setDepartmentId("");
  }

  function handleContinue() {
    setError("");
    if (!canContinue) return;
    if (step === 1 && !affId) {
      setError("Please select your college or center of excellence.");
      return;
    }
    if (step === 2 && !departmentId) {
      setError("Please select your department.");
      return;
    }
    if (step === 3) {
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (interests.length === 0) {
      setError("Please select at least one research interest.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await authApi.updateProfileCompletion({
        college: affId,
        department: departmentId,
        research_interests: interests,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Failed to save your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddCustomInterest() {
    const name = customInterest.trim();
    if (!name || interests.includes(name)) return;
    setAddingCustom(true);
    setError("");
    try {
      const created = await authApi.addCustomInterest(name);
      const label =
        created?.name ?? created?.interest ?? created?.label ?? created?.title ?? name;
      setInterests((prev) => (prev.includes(label) ? prev : [...prev, label]));
      setCustomInterest("");
    } catch (err) {
      setError(err?.message || "Could not add this interest. Please try again.");
    } finally {
      setAddingCustom(false);
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="text-center text-slate-500">
          <Loader2 className="w-8 h-8 text-[#B8860B] animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading your onboarding options…</p>
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
        <StepIndicator steps={STEPS} currentStep={step} />

        <div className="rounded-3xl bg-white p-8 shadow-lg border border-slate-200">
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm text-slate-500 uppercase tracking-[0.25em]">
              <div className="h-1.5 w-16 rounded-full bg-[#B8860B]" />
              <span>Step {step} of 3</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#0B1526] mb-3">
                {step === 1 && "Where do you belong?"}
                {step === 2 && "Select your department"}
                {step === 3 && "Tell us about your Research Interests"}
              </h1>
              <p className="text-sm text-slate-500 max-w-2xl">
                {step === 1 &&
                  "Start by choosing your college or center of excellence. This helps us route your profile to the right academic community."}
                {step === 2 &&
                  "Pick the department you are affiliated with. Departments belong to the college or center you selected."}
                {step === 3 &&
                  "Your interests help personalize recommendations, collaborations, datasets, and research opportunities."}
              </p>
            </div>
          </div>

          {loadError && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {loadError}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <section className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-[#F8F7F4] p-6">
                  <h2 className="text-lg font-semibold text-[#0B1526] mb-4">
                    Affiliation type
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {AFFILIATION_TYPES.map((type) => {
                      const active = affType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            setAffType(type.value);
                            handleChangeAffiliation("");
                          }}
                          className={`text-sm font-medium px-4 py-3 rounded-2xl border transition ${
                            active
                              ? "border-[#B8860B] bg-[#FDF7E6] text-[#0B1526]"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>

                  {affOptions.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No {affType === "center_of_excellence" ? "centers of excellence" : "colleges"} available yet.
                    </p>
                  ) : (
                    <Select
                      id="affiliationOption"
                      label={affType === "center_of_excellence" ? "Center of Excellence" : "College"}
                      required
                      value={affId}
                      onChange={(e) => handleChangeAffiliation(e.target.value)}
                      options={affOptions}
                      placeholder={`Choose a ${affType === "center_of_excellence" ? "center of excellence" : "college"}...`}
                    />
                  )}
                </div>
              </section>

              <aside className="space-y-6 rounded-3xl border border-slate-200 bg-[#FDF7E6] p-6">
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-full bg-[#B8860B] p-2 text-white">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#0B1526]">Why this matters</h3>
                      <p className="text-xs text-slate-500">Affiliation-based routing for collaborations and datasets.</p>
                    </div>
                  </div>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li>Connect with your college community</li>
                    <li>See department-relevant datasets</li>
                    <li>Accurate academic profile</li>
                  </ul>
                </div>
              </aside>
            </div>
          )}
{step === 2 && (
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <section className="rounded-3xl border border-slate-200 bg-[#F8F7F4] p-6">
                <h2 className="text-lg font-semibold text-[#0B1526] mb-3">Your Department</h2>
                {loadingDepartments ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
                    <Loader2 className="w-4 h-4 text-[#B8860B] animate-spin" />
                    Loading departments…
                  </div>
                ) : departmentOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No departments found for the selected{" "}
                    {affType === "center_of_excellence" ? "center of excellence" : "college"}. Please go back and pick another one.
                  </p>
                ) : (
                  <Select
                    id="department"
                    label="Department"
                    required
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    options={departmentOptions}
                    placeholder="Choose your department..."
                  />
                )}
              </section>

              <aside className="space-y-6 rounded-3xl border border-slate-200 bg-[#FDF7E6] p-6">
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-full bg-[#B8860B] p-2 text-white">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#0B1526]">Almost there</h3>
                      <p className="text-xs text-slate-500">One more step after this — your research interests.</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
{step === 3 && (
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <section className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-[#F8F7F4] p-6">
                  <h2 className="text-lg font-semibold text-[#0B1526] mb-3">Research Interests</h2>
                  <ResearchInterests
                    id="onboardingResearchInterests"
                    label="Select your research interests"
                    required
                    value={interests}
                    onChange={setInterests}
                    categories={RESEARCH_INTEREST_CATEGORIES}
                  />

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500 mb-2">
                      Have a specific interest not listed? Add it below and it will be saved to your profile.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={customInterest}
                        onChange={(e) => setCustomInterest(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomInterest();
                          }
                        }}
                        placeholder="e.g. Computational Biology"
                        className="flex-1 rounded-lg border border-slate-200 text-sm py-2.5 px-3"
                      />
                      <Button
                        type="button"
                        variant="gold"
                        fullWidth={false}
                        loading={addingCustom}
                        icon={Plus}
                        onClick={handleAddCustomInterest}
                        disabled={!customInterest.trim()}
                      >
                        Add Interest
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="space-y-6 rounded-3xl border border-slate-200 bg-[#FDF7E6] p-6">
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-full bg-[#B8860B] p-2 text-white">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#0B1526]">Last step!</h3>
                      <p className="text-xs text-slate-500">Select at least one interest to finish onboarding.</p>
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
          )}
<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth={false}
                  icon={ArrowLeft}
                  onClick={() => setStep((s) => s - 1)}
                >
                  Back
                </Button>
              ) : (
                <Button type="button" variant="secondary" fullWidth={false} onClick={() => navigate("/dashboard")}>
                  Cancel
                </Button>
              )}
              <Button type="button" variant="secondary" fullWidth={false} onClick={() => navigate("/dashboard")}>
                Skip for Now
              </Button>
            </div>
            <Button
              type="button"
              variant="gold"
              fullWidth={false}
              onClick={handleContinue}
              disabled={!canContinue}
              loading={submitting || loadingDepartments}
              icon={ArrowRight}
            >
              {step === 3 ? "Finish" : "Continue"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}