import { useLocation, useNavigate, Link } from "react-router-dom";
import ContributeLayout from "../../../layouts/ContributeLayout";

const STEPS = ["Details", "Metadata", "Uploads", "Policy"];

export default function SubmissionSuccessPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const submission = state?.submission;

  if (!submission) {
    navigate("/datasets/contribute");
    return null;
  }

  return (
    <ContributeLayout currentStep={4} steps={STEPS} allComplete>
      <div className="bg-white border border-border rounded-lg p-12 px-8 text-center">
        <div className="w-14 h-14 rounded-full bg-gold text-white flex items-center justify-center text-2xl mx-auto mb-5">✓</div>
        <h1 className="text-navy m-0 mb-1.5">Dataset Submitted Successfully</h1>
        <p className="text-gray-500 m-0 mb-4">'{submission.title}'</p>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#FBF0D6] text-[#8A6D1F]">◷ Pending Review</span>

        <div className="text-left bg-[#F7F5F0] rounded-lg p-5 my-6">
          <p className="text-[11px] text-gray-500 m-0 mb-3">SUBMISSION SUMMARY</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 m-0">File Count</p>
              <p className="text-sm font-semibold m-0 mt-0.5">{submission.fileCount} Files</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 m-0">Total Size</p>
              <p className="text-sm font-semibold m-0 mt-0.5">{submission.totalSize}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 m-0">Category</p>
              <p className="text-sm font-semibold m-0 mt-0.5">{submission.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 m-0">Visibility</p>
              <p className="text-sm font-semibold m-0 mt-0.5">🌐 {submission.visibility}</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500 border-t border-border pt-3">
            DOI: {submission.doi}<br />License: {submission.license}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 items-center mt-6">
          <Link to={`/datasets/${submission.id}`} className="w-full text-center bg-gold hover:bg-gold-dark text-white rounded-md px-5 py-2.5 text-sm font-semibold">
            View Dataset
          </Link>
          <Link to="/datasets/contribute" className="w-full text-center bg-white border border-border rounded-md px-5 py-2.5 text-sm font-semibold">
            Upload Another
          </Link>
          <Link to="/" className="text-navy text-[13px]">Back to Dashboard</Link>
        </div>
      </div>
    </ContributeLayout>
  );
}