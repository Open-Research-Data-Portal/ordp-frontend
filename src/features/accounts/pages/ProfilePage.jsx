import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  OCCUPATION_OPTIONS,
  ACADEMIC_TITLE_OPTIONS,
  ACADEMIC_RANK_OPTIONS,
  HIGHEST_DEGREE_OPTIONS,
  DEFAULT_AFFILIATION,
  BIO_MAX_LENGTH,
} from "./constants";

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
  const navigate = useNavigate();
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [grandFatherName, setGrandFatherName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [college, setCollege] = useState("");
  const [centerOfExcellence, setCenterOfExcellence] = useState("");
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState([]);
  const [academicRole, setAcademicRole] = useState("researcher");
  const [academiaOther, setAcademiaOther] = useState("");
  const [academicTitle, setAcademicTitle] = useState("");
  const [academicRank, setAcademicRank] = useState("");
  const [highestDegree, setHighestDegree] = useState("");
  const [highestDegreeOther, setHighestDegreeOther] = useState("");

  const [researchInterests, setResearchInterests] = useState([]);
  const [bio, setBio] = useState("");
  const [orcidId, setOrcidId] = useState("");
  const [projectWork, setProjectWork] = useState("");
  const [additionalLink, setAdditionalLink] = useState("");
  const [profileVisibility, setProfileVisibility] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [colleges, setColleges] = useState([]);
  const [centers, setCenters] = useState([]);
  const [profileCategories, setProfileCategories] = useState([]);
  const [academiaOptions, setAcademiaOptions] = useState(OCCUPATION_OPTIONS);
  const [academicTitleOptions, setAcademicTitleOptions] = useState(ACADEMIC_TITLE_OPTIONS);
  const [academicRankOptions, setAcademicRankOptions] = useState(ACADEMIC_RANK_OPTIONS);
  const [highestDegreeOptions, setHighestDegreeOptions] = useState(HIGHEST_DEGREE_OPTIONS);
  const [visibilityOptions, setVisibilityOptions] = useState([
    { value: "public", label: "Everyone (Public)" },
    { value: "trusted", label: "Trusted Parties" },
    { value: "private", label: "Only Me (Private)" },
  ]);

  useEffect(() => {
    const parts = getNameParts(user);
    queueMicrotask(() => {
      setFirstName(parts.firstName);
      setFatherName(parts.fatherName);
      setGrandFatherName(parts.grandFatherName);

      setEmail(user?.email ?? "");
      setUsername(user?.username ?? "");
      setAcademicRole(user?.academia ?? user?.occupation ?? user?.academicRole ?? "researcher");
      setResearchInterests(user?.researchInterests ?? user?.research_interests ?? []);
      setBio(user?.bio ?? "");
      setOrcidId(user?.orcidId ?? user?.orcid_id ?? "");
      setProfileVisibility(user?.profileVisibility ?? user?.profile_visibility ?? "");
    });
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    Promise.all([
      authApi.getProfile().catch(() => null),
      authApi.getCompleteProfile().catch(() => null),
      authApi.getProfileOptions().catch(() => null),
      authApi.getColleges().catch(() => null),
      authApi.getCentersOfExcellence().catch(() => null),
      authApi.getCategories().catch(() => []),
    ])
      .then(([profile, completeProfile, options, collegesData, centersData, categoriesList]) => {
        if (cancelled) return;
        const data = { ...(profile || {}), ...(completeProfile || {}) };
        const parts = getNameParts(data);
        setFirstName(parts.firstName);
        setFatherName(parts.fatherName);
        setGrandFatherName(parts.grandFatherName);
        setEmail(data?.email ?? "");
        setUsername(data?.username ?? "");
        setCollege(data?.college ?? "");
        setCenterOfExcellence(data?.center_of_excellence ?? "");
        setDepartment(data?.department ?? data?.department_id ?? "");
        setAcademicRole(data?.academia ?? data?.occupation ?? data?.academicRole ?? "researcher");
        setAcademiaOther(data?.academia_other ?? "");
        setAcademicTitle(data?.academicTitle ?? data?.academic_title ?? "");
        setAcademicRank(data?.academicRank ?? data?.academic_rank ?? "");
        setHighestDegree(data?.highestDegree ?? data?.highest_degree ?? "");
        setHighestDegreeOther(data?.highest_degree_other ?? "");
        setResearchInterests((data?.interests || []).map((item) => {
          if (typeof item === "string") return item;
          return { id: item?.id, name: item?.name || String(item) };
        }));
        setBio(data?.bio ?? "");
        setOrcidId(data?.orcidId ?? data?.orcid_id ?? "");
        setProjectWork(data?.projectWork ?? data?.project_work ?? "");
        setAdditionalLink(data?.additionalLink ?? data?.additional_link ?? "");
        setProfileVisibility(data?.profileVisibility ?? data?.profile_visibility ?? "");
        setTermsAccepted(Boolean(data?.termsAccepted ?? data?.terms_accepted ?? false));

        if (options) {
          if (options.academia) setAcademiaOptions(options.academia);
          if (options.academic_title) setAcademicTitleOptions(options.academic_title);
          if (options.academic_rank) setAcademicRankOptions(options.academic_rank);
          if (options.highest_degree) setHighestDegreeOptions(options.highest_degree);
          if (options.profile_visibility) setVisibilityOptions(options.profile_visibility);
        }
        if (collegesData?.results) setColleges(collegesData.results);
        if (centersData?.results) setCenters(centersData.results);
        if (Array.isArray(categoriesList)) setProfileCategories(categoriesList);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (college && !centerOfExcellence) {
      authApi.getDepartments("college", college).then(setDepartments).catch(() => {});
    } else if (centerOfExcellence && !college) {
      authApi.getDepartments("center_of_excellence", centerOfExcellence).then(setDepartments).catch(() => {});
    } else {
      queueMicrotask(() => setDepartments([]));
    }
  }, [isAuthenticated, college, centerOfExcellence]);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (file) setAvatarUrl(URL.createObjectURL(file));
  }

  async function handleAddOtherInterest(name) {
    setError("");
    try {
      const created = await authApi.addOtherInterest(name);
      const newId = created?.id || created?.category?.id;
      if (!newId) throw new Error("Missing id from create-category response.");
      setResearchInterests((prev) => [...prev, { id: newId, name, pending: true }]);
    } catch (err) {
      setError(err?.message || "Failed to add custom interest.");
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const fullName = [firstName, fatherName, grandFatherName].filter(Boolean).join(" ").trim();

      const byName = new Map((profileCategories || []).map((c) => [String(c.name).toLowerCase(), c.id]));
      const validCollegeIds = new Set((colleges || []).map((c) => c.id));
      const validCenterIds = new Set((centers || []).map((c) => c.id));
      const validDeptIds = new Set((departments || []).map((d) => d.id));
      const validCategoryIds = new Set((profileCategories || []).map((c) => c.id));

      const interestIds = (Array.isArray(researchInterests) ? researchInterests : [])
        .map((item) => {
          if (typeof item === "object" && item?.id) {
            if (!validCategoryIds.has(item.id)) return null;
            return item.id;
          }
          if (typeof item === "string") {
            const normalized = item.toLowerCase();
            const matchedId = byName.get(normalized) || byName.get(normalized.split(" — ")[0]);
            if (!matchedId || !validCategoryIds.has(matchedId)) return null;
            return matchedId;
          }
          return null;
        })
        .filter(Boolean);

      const resolvedCollege = college && validCollegeIds.has(college) ? college : undefined;
      const resolvedCenter = centerOfExcellence && validCenterIds.has(centerOfExcellence) ? centerOfExcellence : undefined;
      const resolvedDepartment = department && validDeptIds.has(department) ? department : undefined;

      const academiaOther = academicRole === "other" ? (academiaOther || "") : "";
      const highestDegreeOther = highestDegree === "other" ? (highestDegreeOther || "") : "";

      const payload = {
        first_name: firstName,
        last_name: fatherName,
        grand_father_name: grandFatherName,
        full_name: fullName,
        affiliation: DEFAULT_AFFILIATION,
        college: resolvedCollege,
        center_of_excellence: resolvedCenter,
        department: resolvedDepartment,
        academia: academicRole,
        academia_other: academiaOther,
        academic_title: academicTitle,
        academic_rank: academicRank,
        highest_degree: highestDegree,
        highest_degree_other: highestDegreeOther,
        interests: interestIds,
        bio,
        orcid_id: orcidId,
        project_work: projectWork,
        additional_link: additionalLink,
        profile_visibility: profileVisibility,
        terms_accepted: termsAccepted,
      };

      await Promise.all([
        authApi.updateProfile({ first_name: firstName, last_name: fatherName, full_name: fullName }),
        authApi.updateCompleteProfile(payload),
      ]);
      try {
        const freshProfile = await authApi.getCompleteProfile();
        const isNowComplete = Boolean(
          freshProfile?.full_name &&
          freshProfile?.affiliation &&
          freshProfile?.department &&
          freshProfile?.academia &&
          freshProfile?.profile_visibility &&
          freshProfile?.terms_accepted
        );
        const merged = {
          ...user,
          ...freshProfile,
          profile_complete: true,
          is_profile_complete: true,
          ...(isNowComplete ? { can_upload_datasets: true } : {}),
        };
        if (updateProfile) {
          await updateProfile(merged);
        }
        setSaved(true);
        if (isNowComplete) {
          setTimeout(() => navigate("/dashboard", { replace: true }), 600);
        }
      } catch {
        const isNowComplete = Boolean(
          fullName &&
          affiliation &&
          department &&
          academia &&
          profileVisibility &&
          termsAccepted
        );
        const merged = {
          ...user,
          ...payload,
          profile_complete: true,
          is_profile_complete: true,
          ...(isNowComplete ? { can_upload_datasets: true } : {}),
        };
        if (updateProfile) {
          await updateProfile(merged);
        }
        setSaved(true);
        if (isNowComplete) {
          setTimeout(() => navigate("/dashboard", { replace: true }), 600);
        }
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError(err?.message || "Failed to save profile. Please check your inputs.");
    } finally {
      setSaving(false);
    }
  }

  const displayName = [firstName, fatherName, grandFatherName].filter(Boolean).join(" ").trim() || username || email;

  return (
    <DashboardShell title="Settings" subtitle={displayName ? `Profile — ${displayName}` : "Manage your profile and research identity"}>
        <div className="max-w-4xl">
            {saved && (
              <div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
                Profile changes saved.
              </div>
            )}

            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
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
                    readOnly
                    value={DEFAULT_AFFILIATION}
                    helperText="This field is set to your institution by default."
                  />
                </div>
                <Select
                  id="college"
                  label="College"
                  optional
                  value={college}
                  onChange={(e) => {
                    setCollege(e.target.value);
                    setCenterOfExcellence("");
                    setDepartment("");
                  }}
                  options={colleges.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Choose a college..."
                />
                <Select
                  id="centerOfExcellence"
                  label="Center of Excellence"
                  optional
                  value={centerOfExcellence}
                  onChange={(e) => {
                    setCenterOfExcellence(e.target.value);
                    setCollege("");
                    setDepartment("");
                  }}
                  options={centers.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Choose a center of excellence..."
                />
                <Select
                  id="department"
                  label="Department"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder={college || centerOfExcellence ? "Choose your department..." : "Select a college or center first"}
                  disabled={!college && !centerOfExcellence}
                />
                <Select
                  id="academicRole"
                  label="Academia"
                  required
                  value={academicRole}
                  onChange={(e) => {
                    const next = e.target.value;
                    setAcademicRole(next);
                    if (next !== "other") setAcademiaOther("");
                  }}
                  options={academiaOptions}
                />
                {academicRole === "other" && (
                  <TextInput
                    id="academiaOther"
                    label="Please specify your occupation"
                    required
                    value={academiaOther}
                    onChange={(e) => setAcademiaOther(e.target.value)}
                    placeholder="e.g., Research Assistant, Independent Researcher..."
                  />
                )}
                <Select
                  id="academicTitle"
                  label="Title"
                  optional
                  value={academicTitle}
                  onChange={(e) => setAcademicTitle(e.target.value)}
                  options={academicTitleOptions}
                />
                <Select
                  id="academicRank"
                  label="Academic Rank"
                  optional
                  value={academicRank}
                  onChange={(e) => setAcademicRank(e.target.value)}
                  options={academicRankOptions}
                />
                <Select
                  id="highestDegree"
                  label="Highest Degree"
                  optional
                  value={highestDegree}
                  onChange={(e) => {
                    setHighestDegree(e.target.value);
                    if (e.target.value !== "other") setHighestDegreeOther("");
                  }}
                  options={highestDegreeOptions}
                />
                {highestDegree === "other" && (
                  <TextInput
                    id="highestDegreeOther"
                    label="Please specify your highest degree"
                    required
                    value={highestDegreeOther}
                    onChange={(e) => setHighestDegreeOther(e.target.value)}
                    placeholder="e.g., Professional Certificate, Other qualification..."
                  />
                )}
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
                categories={profileCategories}
                onAddOtherInterest={handleAddOtherInterest}
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
                options={visibilityOptions}
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
                disabled={!profileVisibility || !termsAccepted}
              >
                Save Changes
              </Button>
            </div>
        </div>
    </DashboardShell>
  );
}
