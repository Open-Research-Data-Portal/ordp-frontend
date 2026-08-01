import { useEffect, useState } from "react";
import { Camera, User as UserIcon, GraduationCap, Database, Save, RotateCcw } from "lucide-react";
import Sidebar from "../../layouts/Sidebar";
import TopBar from "../../layouts/TopBar";
import TextInput from "../../components/ui/TextInput";
import TextArea from "../../components/ui/TextArea";
import Select from "../../components/ui/Select";
import MultiSelectTags from "../../components/ui/MultiSelectTags";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/useAuth";
import * as authApi from "../../api/authApi";
import {
  OCCUPATION_OPTIONS,
  ACADEMIC_TITLE_OPTIONS,
  ACADEMIC_RANK_OPTIONS,
  HIGHEST_DEGREE_OPTIONS,
  STUDENT_TYPE_OPTIONS,
  RESEARCH_INTEREST_OPTIONS,
  DEFAULT_AFFILIATION,
  BIO_MAX_LENGTH,
} from "./constants";

const PROFILE_VISIBILITY_OPTIONS = [
  { value: "public", label: "Everyone (Public)" },
  { value: "trusted", label: "Trusted Parties" },
  { value: "private", label: "Only Me (Private)" },
];

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
  const { user, isAuthenticated } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [grandFatherName, setGrandFatherName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const [affiliation, setAffiliation] = useState(DEFAULT_AFFILIATION);
  const [academicRole, setAcademicRole] = useState("Researcher");
  const [studentType, setStudentType] = useState("");
  const [academicTitle, setAcademicTitle] = useState("Dr.");
  const [academicRank, setAcademicRank] = useState("Professor");
  const [highestDegree, setHighestDegree] = useState("PhD");

  const [researchInterests, setResearchInterests] = useState([
    "Artificial Intelligence",
    "Software Engineering",
  ]);
  const [bio, setBio] = useState(
    "Leading research in NLP and Computer Vision within the East African context, focusing on low-resource language processing and agricultural computer vision models."
  );
  const [orcidId, setOrcidId] = useState("0000-0002-1825-0097");
  const [projectWork, setProjectWork] = useState("");
  const [additionalLink, setAdditionalLink] = useState("");
  const [profileVisibility, setProfileVisibility] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const parts = getNameParts(user);
    setFirstName(parts.firstName);
    setFatherName(parts.fatherName);
    setGrandFatherName(parts.grandFatherName);

    setEmail(user?.email ?? "");
    setUsername(user?.username ?? "");
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    authApi
      .getProfile()
      .then((profile) => {
        if (cancelled) return;
        const parts = getNameParts(profile);
        setFirstName(parts.firstName);
        setFatherName(parts.fatherName);
        setGrandFatherName(parts.grandFatherName);
        setEmail(profile?.email ?? "");
        setUsername(profile?.username ?? "");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (file) setAvatarUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const displayName = [firstName, fatherName, grandFatherName].filter(Boolean).join(" ").trim() || username || email;

  return (
    <div className="min-h-screen flex bg-[#F5F5F3]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="User Profile" user={{ name: displayName }} />

        <main className="flex-1 px-8 py-6 overflow-y-auto">
          <div className="max-w-4xl">
            {saved && (
              <div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
                Profile changes saved.
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
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#8B6F1F] text-white
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
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#B8860B] hover:underline -mt-2"
                  >
                    <RotateCcw className="w-3 h-3" /> Change Password
                  </button>
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
                <Select
                  id="academicRole"
                  label="Occupation"
                  required
                  value={academicRole}
                  onChange={(e) => {
                    const next = e.target.value;
                    setAcademicRole(next);
                    if (next !== "Student") setStudentType("");
                  }}
                  options={OCCUPATION_OPTIONS}
                />
                {academicRole === "Student" && (
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

              <MultiSelectTags
                id="researchInterests"
                label="Research Interests"
                required
                value={researchInterests}
                onChange={setResearchInterests}
                options={RESEARCH_INTEREST_OPTIONS}
                placeholder="Other (type to add)..."
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
                disabled={!profileVisibility || !termsAccepted}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </main>

        <footer className="px-8 py-5 border-t border-slate-200 bg-[#F7F7F5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <p className="font-semibold text-slate-600">AASTU Research Portal</p>
            <p className="mt-0.5">© 2024 Addis Ababa Science and Technology University. All Rights Reserved.</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="hover:text-[#0B1526]">Privacy Policy</a>
            <a href="/terms" className="hover:text-[#0B1526]">Terms of Service</a>
            <a href="/contact" className="hover:text-[#0B1526]">Contact Us</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
