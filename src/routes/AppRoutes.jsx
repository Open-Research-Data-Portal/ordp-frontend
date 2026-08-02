import { Routes, Route } from "react-router-dom";
import ContributeDatasetPage from "../features/datasets/pages/ContributeDatasetPage";
import SubmissionSuccessPage from "../features/datasets/pages/SubmissionSuccessPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ...your existing routes... */}
      <Route path="/datasets/contribute" element={<ContributeDatasetPage />} />
      <Route path="/datasets/contribute/success" element={<SubmissionSuccessPage />} />
    </Routes>
  );
}