import { useEffect, useRef, useState } from "react";
import { Camera, User as UserIcon, GraduationCap, Database, Save, RotateCcw } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import TextInput from "../../../components/ui/TextInput";
import TextArea from "../../../components/ui/TextArea";
import Select from "../../../components/ui/Select";
import ResearchInterests from "../../../components/ui/ResearchInterests";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../context/useAuth";
import * as authApi from "../api/authApi";
import {
  asEntityId,
  extractSelectedInterests,
  loadPersistedInterests,
  parseInterestCatalog,
  persistSelectedInterests,
  pickerCategories,
  buildProfileCompletionPatch,
  saveProfileCompletion,
} from "../onboarding";
import {
  OCCUPATION_OPTIONS,
  ACADEMIC_TITLE_OPTIONS,
  ACADEMIC_RANK_OPTIONS,
  HIGHEST_DEGREE_OPTIONS,
  STUDENT_TYPE_OPTIONS,
  RESEARCH_INTEREST_CATEGORIES,
  DEFAULT_AFFILIATION,
  BIO_MAX_LENGTH,
  toOptionValue,
} from "./constants";
import { getDashboardPath } from "../../../utils/userRoles";
import { useNavigate } from "react-router-dom";

const PROFILE_VISIBILITY_OPTIONS = [
  { value: "public", label: "Everyone (Public)" },
  { value: "trusted", label: "Trusted Parties" },
  { value: "private", label: "Only Me (Private)" },
];

function uniqueInterestLabels(...lists) {
  const labels = [];
  lists.flat().forEach((item) => {
    const value = String(item || "").trim();
    if (value && !asEntityId(value) && !labels.includes(value)) labels.push(value);
  });
  return labels;
}

function getNameParts(source) {
  const full =
    source?.full_name ?? [source?.first_name, source?.last_name].filter(Boolean).join(" ").trim();

  if (!full) {
    return {
      firstName: source?.first_name ?? "",
      fatherName: source?.last_name ?? "",
      grandFatherName: "",
    };
  }

  const parts = full.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    fatherName: parts[1] ?? "",
    grandFatherName: parts.slice(2).join(" "),
  };
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl mb-6 shadow-sm">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
        <Icon className="w-4 h-4 text-[#8B6F1F]" />
        <h2 className="text-sm font-bold text-[#0B1526]">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isAuthenticated, setUser } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [grandFatherName, setGrandFatherName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const [affiliation, setAffiliation] = useState(DEFAULT_AFFILIATION);
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState([]);
  const [academicRole, setAcademicRole] = useState("researcher");
  const [studentType, setStudentType] = useState("");
  const [academicTitle, setAcademicTitle] = useState("");
  const [academicRank, setAcademicRank] = useState("");
  const [highestDegree, setHighestDegree] = useState("");

  const [researchInterests, setResearchInterests] = useState(user?.researchInterests || []);
  const [interestCatalog, setInterestCatalog] = useState(() =>
    parseInterestCatalog(RESEARCH_INTEREST_CATEGORIES)
  );
  const [interestCategories, setInterestCategories] = useState(RESEARCH_INTEREST_CATEGORIES);
  const completionRef = useRef({});
  const optionsRef = useRef({});
  const [bio, setBio] = useState("");
  const [orcidId, setOrcidId] = useState("");
  const [projectWork, setProjectWork] = useState("");
  const [additionalLink, setAdditionalLink] = useState("");
  const [profileVisibility, setProfileVisibility] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const parts = getNameParts(user);
    queueMicrotask(() => {
      setFirstName(parts.firstName);
      setFatherName(parts.fatherName);
      setGrandFatherName(parts.grandFatherName);

      setEmail(user?.email ?? "");
      setUsername(user?.username ?? "");
      setAffiliation(user?.affiliation ?? DEFAULT_AFFILIATION);
      setAcademicRole(
        toOptionValue(OCCUPATION_OPTIONS, user?.occupation ?? user?.academicRole) ||
          "researcher"
      );
      setResearchInterests(
        uniqueInterestLabels(
          extractSelectedInterests(user, RESEARCH_INTEREST_CATEGORIES),
          loadPersistedInterests(user)
        )
      );
      setBio(user?.bio ?? "");
      setOrcidId(user?.orcidId ?? user?.orcid_id ?? "");
      setProfileVisibility(
        user?.profileVisibility ?? user?.profile_visibility ?? "public"
      );
    });
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    Promise.allSettled([
      authApi.getProfile(),
      authApi.getProfileCompletion(),
      authApi.getProfileOptions(),
    ]).then(([profileResult, completionResult, optionsResult]) => {
        if (cancelled) return;

        const profile =
          profileResult.status === "fulfilled" ? profileResult.value : null;
        const completion =
          completionResult.status === "fulfilled" ? completionResult.value : null;
        const options =
          optionsResult.status === "fulfilled" ? optionsResult.value : null;

        completionRef.current = completion || {};
        optionsRef.current = options || {};
        const remoteCatalog = options ? parseInterestCatalog(options) : [];
        const catalog =
          remoteCatalog.length > 0
            ? remoteCatalog
            : parseInterestCatalog(RESEARCH_INTEREST_CATEGORIES);
        setInterestCatalog(catalog);
        const picker = pickerCategories(catalog);
        if (picker.length > 0) setInterestCategories(picker);

        const merged = { ...(user || {}), ...(profile || {}), ...(completion || {}) };
        const parts = getNameParts(merged);
        setFirstName(parts.firstName);
        setFatherName(parts.fatherName);
        setGrandFatherName(parts.grandFatherName);
        setEmail(merged?.email ?? "");
        setUsername(merged?.username ?? "");
        setAffiliation(merged?.affiliation ?? DEFAULT_AFFILIATION);
        setDepartment(merged?.department ?? merged?.department_id ?? "");
        setAcademicRole(
          toOptionValue(
            OCCUPATION_OPTIONS,
            merged?.occupation ?? merged?.academia ?? merged?.academicRole
          ) || "researcher"
        );
        setStudentType(merged?.studentType ?? merged?.student_type ?? "");
        setAcademicTitle(
          toOptionValue(
            ACADEMIC_TITLE_OPTIONS,
            merged?.academicTitle ?? merged?.academic_title
          )
        );
        setAcademicRank(
          toOptionValue(
            ACADEMIC_RANK_OPTIONS,
            merged?.academicRank ?? merged?.academic_rank
          )
        );
        setHighestDegree(
          toOptionValue(
            HIGHEST_DEGREE_OPTIONS,
            merged?.highestDegree ?? merged?.highest_degree
          )
        );
        setResearchInterests(
          uniqueInterestLabels(
            loadPersistedInterests(user),
            extractSelectedInterests(user, picker),
            extractSelectedInterests(profile, picker),
            extractSelectedInterests(completion, picker)
          )
        );
        setBio(merged?.bio ?? "");
        setOrcidId(merged?.orcidId ?? merged?.orcid_id ?? "");
        setProjectWork(merged?.projectWork ?? merged?.project_work ?? "");
        setAdditionalLink(merged?.additionalLink ?? merged?.additional_link ?? "");
        setProfileVisibility(
          merged?.profileVisibility ?? merged?.profile_visibility ?? "public"
        );
        setTermsAccepted(
          Boolean(merged?.termsAccepted ?? merged?.terms_accepted ?? false)
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) authApi.getDepartments().then(setDepartments).catch(() => {});
  }, [isAuthenticated]);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (file) setAvatarUrl(URL.createObjectURL(file));
  }

  /**
   * POST /accounts/profile/interests/other/ — request an unlisted category.
   * Same behaviour as the onboarding page, so interests picked during
   * onboarding remain fully editable (add / remove / request new) here.
   */
  async function handleRequestCategory(name) {
    await authApi.addCustomInterest(name);
  }

  async function handleSave() {
    setSaved(false);
    setSaveError("");

    if (!firstName.trim() || !fatherName.trim()) {
      setSaveError("First name and father name are required.");
      return;
    }
    if (!profileVisibility) {
      setSaveError("Choose who can see your profile.");
      return;
    }
    if (!termsAccepted) {
      setSaveError("Please accept the terms of use to save your profile.");
      return;
    }

    setSaving(true);
    try {
      const fullName = [firstName, fatherName, grandFatherName].filter(Boolean).join(" ").trim();
      const occupation =
        toOptionValue(OCCUPATION_OPTIONS, academicRole) || academicRole;
      const deptId = department ? Number(department) : undefined;
      const payload = buildProfileCompletionPatch({
        labels: researchInterests,
        catalog: interestCatalog,
        completion: completionRef.current,
        options: optionsRef.current,
        extra: {
          first_name: firstName,
          last_name: fatherName,
          grand_father_name: grandFatherName,
          full_name: fullName,
          affiliation,
          department: deptId,
          department_id: deptId,
          academia: occupation || "researcher",
          occupation,
          student_type: studentType,
          academic_title: toOptionValue(ACADEMIC_TITLE_OPTIONS, academicTitle) || academicTitle,
          academic_rank: toOptionValue(ACADEMIC_RANK_OPTIONS, academicRank) || academicRank,
          highest_degree: toOptionValue(HIGHEST_DEGREE_OPTIONS, highestDegree) || highestDegree,
          bio,
          orcid_id: orcidId,
          project_work: projectWork,
          additional_link: additionalLink,
          profile_visibility: profileVisibility,
          terms_accepted: termsAccepted,
        },
      });

      const completion = await saveProfileCompletion(payload);

      try {
        await authApi.updateProfile({
          first_name: firstName,
          last_name: fatherName,
          full_name: fullName,
          affiliation,
          department: deptId,
          academia: occupation || "researcher",
          occupation,
          bio,
          orcid_id: orcidId,
        });
      } catch {
        // Completion endpoint is the source of truth for interests; a
        // narrower /profile/ PATCH may reject extra fields.
      }

      persistSelectedInterests(user, researchInterests);
      const nextUser = {
        ...(user || {}),
        ...(completion || {}),        first_name: firstName,
        last_name: fatherName,
        full_name: fullName,
        affiliation,
department,
        occupation,
        research_interests: researchInterests,
        researchInterests,
        bio,
        orcid_id: orcidId,
        profile_visibility: profileVisibility,
        terms_accepted: termsAccepted,
        profile_complete: true,
        is_profile_complete: true,
        can_upload_datasets: true,
      };
      sessionStorage.setItem("ordp:profile_completed", "true");
      localStorage.setItem("ordp:profile_completed", "true");
      setUser?.(nextUser);
      navigate(getDashboardPath(nextUser), {
        replace: true,
        state: { profileJustCompleted: true },
      });
    } catch (err) {
      const message =
        typeof err?.message === "string" && err.message
          ? err.message
          : "Couldn't save your profile. Please try again.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  const displayName = [firstName, fatherName, grandFatherName].filter(Boolean).join(" ").trim() || username || email;

  return (
    <DashboardShell title="Settings" subtitle={displayName ? `Profile — ${displayName}` : "Manage your profile and research identity"}>
        <div className="max-w-4xl">
            <button
              type="button"
              onClick={() => navigate(getDashboardPath(user))}
              className="mb-4 inline-flex items-center text-xs font-semibold text-gray-500 hover:text-navy transition-colors"
            >
              ← Back to dashboard
            </button>
            {saved && (
              <div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
                Profile completed. Your changes have been saved.
              </div>
            )}
            {saveError && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <SectionCard icon={UserIcon} title="Personal Information">
              <div className="flex items-start gap-6 mb-6">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-400 text-xs">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      "img"
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold text-white
                               flex items-center justify-center cursor-pointer shadow-sm"
                    aria-label="Upload profile picture"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="absolute -bottom-1 -left-1 w-auto px-2 h-7 rounded-md bg-white border border-slate-200 text-xs text-slate-600 flex items-center gap-1 shadow-sm"
                    aria-label="Delete profile picture"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-xs text-slate-400 pt-8">Allowed: JPG, PNG. Max 2MB.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                <TextInput
                  id="firstName"
                  label="First Name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <TextInput
                  id="fatherName"
                  label="Father Name"
                  required
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />
                <TextInput
                  id="grandFatherName"
                  label="Grand Father Name"
                  required
                  value={grandFatherName}
                  onChange={(e) => setGrandFatherName(e.target.value)}
                />
                <TextInput
                  id="email"
                  label="Email Address"
                  required
                  readOnly
                  value={email}
                />
                <TextInput
                  id="username"
                  label="Username"
                  required
                  readOnly
                  value={username}
                />
                <div>
                  <TextInput
                    id="password"
                    label="Password"
                    required
                    readOnly
                    type="password"
                    value="••••••••"
                  />
                  <div className="mt-1">
                    <a
                      href="/forgot-password"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#B8860B] hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" /> Change Password
                    </a>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={GraduationCap} title="Academic & Professional Information">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                <div className="md:col-span-3">
                  <TextInput
                    id="affiliation"
                    label="Affiliation"
                    required
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                  />
                </div>
                <Select id="department" label="Department" required value={department} onChange={(e) => setDepartment(e.target.value)} options={departments.map((d) => ({ value: d.id, label: d.name }))} placeholder="Choose your department..." />
                <Select
                  id="academicRole"
                  label="Occupation"
                  required
                  value={academicRole}
                  onChange={(e) => {
                    const next = e.target.value;
                    setAcademicRole(next);
                    if (next !== "student") setStudentType("");
                  }}
                  options={OCCUPATION_OPTIONS}
                />
                {academicRole === "student" && (
                  <Select
                    id="studentType"
                    label="Student Type"
                    required
                    value={studentType}
                    onChange={(e) => setStudentType(e.target.value)}
                    options={STUDENT_TYPE_OPTIONS}
                  />
                )}
                <Select
                  id="academicTitle"
                  label="Title"
                  optional
                  value={academicTitle}
                  onChange={(e) => setAcademicTitle(e.target.value)}
                  options={ACADEMIC_TITLE_OPTIONS}
                />
                <Select
                  id="academicRank"
                  label="Academic Rank"
                  optional
                  value={academicRank}
                  onChange={(e) => setAcademicRank(e.target.value)}
                  options={ACADEMIC_RANK_OPTIONS}
                />
                <Select
                  id="highestDegree"
                  label="Highest Degree"
                  optional
                  value={highestDegree}
                  onChange={(e) => setHighestDegree(e.target.value)}
                  options={HIGHEST_DEGREE_OPTIONS}
                />
              </div>
            </SectionCard>

            <SectionCard icon={Database} title="Research Profile">
              <TextArea
                id="bio"
                label={`Bio (max ${BIO_MAX_LENGTH} chars)`}
                optional
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
                maxLength={BIO_MAX_LENGTH}
                rows={4}
                showCount
              />

              <TextInput
                id="orcid"
                label="ORCID ID"
                optional
                value={orcidId}
                onChange={(e) => setOrcidId(e.target.value)}
                placeholder="0000-0002-1825-0097"
                status={/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcidId) ? "valid" : null}
              />

              <TextInput
                id="additionalLink"
                label="Additional Link"
                optional
                value={additionalLink}
                onChange={(e) => setAdditionalLink(e.target.value)}
                placeholder="https://example.com"
                helperText="Personal website, institutional staff page, or other professional social media links."
              />

              <ResearchInterests
                id="researchInterests"
                label="Research Interests"
                required
                value={researchInterests}
                onChange={setResearchInterests}
                categories={interestCategories}
                onRequestCategory={handleRequestCategory}
              />

              <TextArea
                id="projectWork"
                label="Research & project work"
                optional
                value={projectWork}
                onChange={(e) => setProjectWork(e.target.value)}
                rows={3}
                placeholder="List your key research projects..."
              />
            </SectionCard>

            <SectionCard icon={UserIcon} title="Visibility & Consent">
              <Select
                id="profileVisibility"
                label="Profile Visibility"
                required
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value)}
                options={PROFILE_VISIBILITY_OPTIONS}
                placeholder="Choose who can see your profile..."
              />

              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="ordpTerms" className="text-sm font-semibold text-slate-700">
                    ORDP Terms of Use<span className="text-red-500 ml-0.5">*</span>
                  </label>
                </div>
                <label htmlFor="ordpTerms" className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    id="ordpTerms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 accent-[#0B1526]"
                  />
                  <span>I agree to the ORDP&apos;s terms of use, privacy policy, and data sharing agreement.</span>
                </label>
              </div>
            </SectionCard>

            <div className="flex items-center justify-end gap-3 pb-8">
              <Button variant="secondary" fullWidth={false}>
                Cancel
              </Button>
              <Button
                variant="gold"
                fullWidth={false}
                icon={Save}
                loading={saving}
                onClick={handleSave}
                disabled={saving}
              >
                Save Changes
              </Button>
            </div>
        </div>
    </DashboardShell>
  );
}
