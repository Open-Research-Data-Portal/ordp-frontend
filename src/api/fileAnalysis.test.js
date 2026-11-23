import { describe, it, expect, vi } from "vitest";
import client from "./client";
import {
  getFileAnalysis,
  getLevelInfo,
  getCheckFriendlyName,
  getCheckDescription,
  formatBytes,
} from "./fileAnalysis";

vi.mock("./client", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("fileAnalysis utility & API", () => {
  it("formats file levels correctly", () => {
    const levelA = getLevelInfo("A");
    expect(levelA).toBeTruthy();
    expect(levelA.shortName).toBe("Level A");
    expect(levelA.types).toContain("CSV");

    const levelB1 = getLevelInfo("b1");
    expect(levelB1).toBeTruthy();
    expect(levelB1.shortName).toBe("Level B1");
    expect(levelB1.types).toContain("PDF");

    const levelC = getLevelInfo("C");
    expect(levelC).toBeTruthy();
    expect(levelC.shortName).toBe("Level C");

    const unknown = getLevelInfo("Z");
    expect(unknown.shortName).toBe("Level Z");

    expect(getLevelInfo(null)).toBeNull();
  });

  it("formats human-readable check titles", () => {
    expect(getCheckFriendlyName("checksum_verified")).toBe("SHA-256 Checksum Verification");
    expect(getCheckFriendlyName("malware_scan")).toBe("Antivirus & Malware Scan");
    expect(getCheckFriendlyName("type_from_contents")).toBe("MIME Type & Magic Bytes");
    expect(getCheckFriendlyName("archive_limits")).toBe("Archive Limits & Zip Bomb Defense");
    expect(getCheckDescription("password_protected")).toContain("locked behind passwords");
  });

  it("formats byte sizes correctly", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1572864)).toBe("1.5 MB");
    expect(formatBytes(1073741824)).toBe("1.0 GB");
  });

  it("calls the correct API endpoint in getFileAnalysis", async () => {
    const mockData = {
      file_id: "test-file-123",
      status: "done",
      level: "A",
      detected_type: "text/csv",
      checks: [{ name: "checksum_verified", result: "pass" }],
    };
    client.get.mockResolvedValueOnce({ data: mockData });

    const result = await getFileAnalysis("test-file-123");
    expect(client.get).toHaveBeenCalledWith("/files/test-file-123/analysis/");
    expect(result).toEqual(mockData);
  });

  it("returns null when fileId is falsy", async () => {
    const result = await getFileAnalysis(null);
    expect(result).toBeNull();
  });
});
