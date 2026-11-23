import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FileAnalysisBadge from "./FileAnalysisBadge";
import FileAnalysisCard from "./FileAnalysisCard";
import FileAnalysisModal from "./FileAnalysisModal";

describe("FileAnalysis Components", () => {
  const sampleDoneAnalysis = {
    file_id: "file-999",
    status: "done",
    level: "A",
    detected_type: "text/csv",
    coverage: "fully_analysed",
    checks: [
      { name: "type_from_contents", result: "pass", detail: "Detected text/csv" },
      { name: "checksum_verified", result: "pass", detail: "SHA-256 matches stored checksum" },
      { name: "not_empty", result: "pass", detail: "File size 4500 bytes" },
      { name: "opens_correctly", result: "pass", detail: "Parsed CSV successfully" },
      { name: "password_protected", result: "pass", detail: "No encryption detected" },
      { name: "macros", result: "pass", detail: "No macros detected" },
      { name: "archive_limits", result: "pass", detail: "Not an archive" },
      { name: "malware_scan", result: "pass", detail: "ClamAV clean" },
    ],
    warnings: [],
    technical: {
      size_bytes: 4500,
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
    created_at: "2026-11-23T10:00:00Z",
    finished_at: "2026-11-23T10:00:02Z",
  };

  it("renders FileAnalysisBadge with Level A for completed analysis", () => {
    render(
      <FileAnalysisBadge
        fileId="file-999"
        fileName="dataset.csv"
        initialAnalysis={sampleDoneAnalysis}
      />
    );

    expect(screen.getByText("Level A")).toBeTruthy();
  });

  it("renders FileAnalysisBadge with Analyzing... state", () => {
    render(
      <FileAnalysisBadge
        fileId="file-999"
        fileName="dataset.csv"
        initialAnalysis={{ status: "running", level: null }}
      />
    );

    expect(screen.getByText("Analyzing…")).toBeTruthy();
  });

  it("renders FileAnalysisBadge with Failed state", () => {
    render(
      <FileAnalysisBadge
        fileId="file-999"
        fileName="dataset.csv"
        initialAnalysis={{ status: "failed", level: null, error: "CANNOT_READ" }}
      />
    );

    expect(screen.getByText("Check Failed")).toBeTruthy();
  });

  it("renders FileAnalysisCard and toggles quick view details", () => {
    render(
      <FileAnalysisCard
        fileId="file-999"
        fileName="dataset.csv"
        initialAnalysis={sampleDoneAnalysis}
      />
    );

    expect(screen.getByText("AI File Check")).toBeTruthy();
    expect(screen.getByText(/8 of 8 checks passed/)).toBeTruthy();

    const quickViewBtn = screen.getByRole("button", { name: /quick view/i });
    fireEvent.click(quickViewBtn);

    expect(screen.getByText("SHA-256 Checksum Verification")).toBeTruthy();
    expect(screen.getByText("Antivirus & Malware Scan")).toBeTruthy();
  });

  it("renders FileAnalysisModal with full verification report", () => {
    const handleClose = vi.fn();
    render(
      <FileAnalysisModal
        fileId="file-999"
        fileName="dataset.csv"
        isOpen={true}
        onClose={handleClose}
        initialAnalysis={sampleDoneAnalysis}
      />
    );

    expect(screen.getByText("AI File Integrity Inspection")).toBeTruthy();
    expect(screen.getByText("Structured & Tabular Data")).toBeTruthy();
    expect(screen.getByText("text/csv")).toBeTruthy();
    expect(screen.getByText("SHA-256 Checksum Verification")).toBeTruthy();
    expect(screen.getByText("ClamAV clean")).toBeTruthy();

    const closeBtn = screen.getByRole("button", { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

