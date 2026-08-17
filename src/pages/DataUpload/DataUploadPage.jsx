import { useEffect, useMemo, useState } from "react";
import { Database, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../layouts/Sidebar";
import TopBar from "../../layouts/TopBar";
import TextInput from "../../components/ui/TextInput";
import TextArea from "../../components/ui/TextArea";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/useAuth";
import * as authApi from "../../features/accounts/api/authApi";

import {
  OCCUPATION_OPTIONS,
  ACADEMIC_TITLE_OPTIONS,
  ACADEMIC_RANK_OPTIONS,
  STUDENT_TYPE_OPTIONS,
  DEFAULT_AFFILIATION,
  BIO_MAX_LENGTH,
  HIGHEST_DEGREE_OPTIONS,

} from "../../features/accounts/pages/constants";
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

export default function DataUploadPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [grandFatherName, setGrandFatherName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const [affiliation, setAffiliation] = useState(DEFAULT_AFFILIATION);
  const [academicRole, setAcademicRole] = useState("");
  const [studentType, setStudentType] = useState("");
  const [academicTitle, setAcademicTitle] = useState("");
  const [academicRank, setAcademicRank] = useState("");
  const [highestDegree, setHighestDegree] = useState("");

  const [bio, setBio] = useState("");
  const [orcidId, setOrcidId] = useState("");
  const [additionalLink, setAdditionalLink] = useState("");
  const [projectWork, setProjectWork] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function loadProfile() {
      let profile = null;
      try {
        profile = await authApi.getProfile();
      } catch {
        // Fall back to context user below.
      }
      if (cancelled) return;

      const source = profile ?? user;
      if (!source) return;

      const parts = getNameParts(source);
      setFirstName(parts.firstName);
      setFatherName(parts.fatherName);
      setGrandFatherName(parts.grandFatherName);
      setEmail(source?.email ?? "");
      setUsername(source?.username ?? "");
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  const displayName = useMemo(() => {
    const full = [firstName, fatherName, grandFatherName].filter(Boolean).join(" ").trim();
    return full || username || email || "";
  }, [firstName, fatherName, grandFatherName, username, email]);

  const canSubmit =
    firstName.trim() &&
    fatherName.trim() &&
    grandFatherName.trim() &&
    email.trim() &&
    username.trim() &&
    affiliation.trim() &&
    academicRole.trim() &&
    (academicRole !== "Student" || studentType.trim());

  async function handleSubmit() {
    if (!canSubmit) {
      setSubmitError("Please fill all required fields before sending the request.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setSubmitted(false);

    try {
      const full_name = [firstName, fatherName, grandFatherName].filter(Boolean).join(" ").trim();
      await authApi.submitResearcherRequest({
        request_type: "data_uploader",
        full_name,
        affiliation,
        occupation: academicRole,
        student_type: academicRole === "Student" ? studentType : "",
        academic_title: academicTitle,
        academic_rank: academicRank,
        highest_degree: highestDegree,
        bio,
        orcid_id: orcidId,
        additional_link: additionalLink,
        project_work: projectWork,
      });
      setSubmitted(true);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
    } catch (err) {
      setSubmitError(
        err instanceof authApi.AuthApiError ? err.message : err?.message || "Failed to send request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F5F5F3]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Data Upload Request" user={{ name: displayName }} hideRight />
        <main className="flex-1 px-8 py-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {submitted && (
              <div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
                Request sent to admin.
              </div>
            )}
            {submitError && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <Database className="w-4 h-4 text-[#8B6F1F]" />
                <h2 className="text-lg font-bold text-[#0B1526]">Request researcher / data uploader access</h2>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                Fill your profile details and send a request for admin approval.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
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
                <div />

                <TextInput id="email" label="Email Address" required readOnly value={email} />
                <TextInput id="username" label="Username" required readOnly value={username} />

                <div className="md:col-span-2">
                  <TextInput
                    id="affiliation"
                    label="Affiliation"
                    required
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    placeholder="AASTU / department / institution"
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

                {academicRole === "Student" ? (
                  <Select
                    id="studentType"
                    label="Student Type"
                    required
                    value={studentType}
                    onChange={(e) => setStudentType(e.target.value)}
                    options={STUDENT_TYPE_OPTIONS}
                  />
                ) : (
                  <div />
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
                <div />

                <div className="md:col-span-2">
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
                </div>

                <TextInput
                  id="orcid"
                  label="ORCID ID"
                  optional
                  value={orcidId}
                  onChange={(e) => setOrcidId(e.target.value)}
                  placeholder="0000-0002-1825-0097"
                  status={orcidId ? (/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcidId) ? "valid" : null) : null}
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

                <div className="md:col-span-2">
                  <TextArea
                    id="projectWork"
                    label="Research & project work"
                    optional
                    value={projectWork}
                    onChange={(e) => setProjectWork(e.target.value)}
                    rows={3}
                    placeholder="List your key research projects..."
                  />
                </div>
              </div>

                <div className="flex items-center justify-end gap-3 mt-4">
                <Button variant="secondary" fullWidth={false} onClick={() => navigate("/dashboard")}>
                  Cancel
                </Button>
                <Button
                  variant="gold"
                  fullWidth={false}
                  icon={Send}
                  loading={submitting}
                  onClick={handleSubmit}
                >
                  Send Request
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
