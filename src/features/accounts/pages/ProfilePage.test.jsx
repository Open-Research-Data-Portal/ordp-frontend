import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProfilePage from "./ProfilePage";

const authApi = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  updateCompleteProfile: vi.fn(),
  getCompleteProfile: vi.fn(),
  getCategories: vi.fn().mockResolvedValue([
    { id: "cat-ai", name: "Artificial Intelligence" },
    { id: "cat-ml", name: "Machine Learning" },
    { id: "cat-eng", name: "Engineering" },
  ]),
  getDepartments: vi.fn().mockResolvedValue([]),
  getColleges: vi.fn().mockResolvedValue([]),
  getCentersOfExcellence: vi.fn().mockResolvedValue([]),
  getProfileOptions: vi.fn().mockResolvedValue({}),
}));

const mockAuthUser = vi.hoisted(() => ({
  email: "researcher@aastu.edu.et",
  username: "researcher",
  full_name: "Researcher User",
}));

vi.mock("../../../layouts/Sidebar", () => ({ default: () => <aside /> }));
vi.mock("../../../layouts/TopBar", () => ({ default: ({ title }) => <header>{title}</header> }));
vi.mock("../../../context/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: mockAuthUser,
  }),
}));
vi.mock("../api/authApi", () => authApi);

function renderProfilePage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.updateProfile.mockResolvedValue({});
    authApi.updateCompleteProfile.mockResolvedValue({});
    authApi.getCompleteProfile.mockResolvedValue({
      full_name: "Researcher User",
      affiliation: "Addis Ababa Science and Technology University (AASTU)",
      academia: "researcher",
      interests: [],
    });
    authApi.getProfile.mockResolvedValue({
      email: "researcher@aastu.edu.et",
      username: "researcher",
    });
    authApi.getCategories.mockResolvedValue([
      { id: "cat-ai", name: "Artificial Intelligence" },
      { id: "cat-ml", name: "Machine Learning" },
      { id: "cat-eng", name: "Engineering" },
    ]);
    authApi.getDepartments.mockResolvedValue([]);
    authApi.getColleges.mockResolvedValue([]);
    authApi.getCentersOfExcellence.mockResolvedValue([]);
    authApi.getProfileOptions.mockResolvedValue({});
  });

  it("renders Email Address and Username as read-only and does not allow editing", async () => {
    renderProfilePage();
    const email = screen.getByLabelText(/email address/i);
    const username = screen.getByLabelText(/username/i);

    expect(email).toHaveAttribute("readonly");
    expect(username).toHaveAttribute("readonly");
    await waitFor(() => expect(email).toHaveValue("researcher@aastu.edu.et"));

    const originalEmail = email.value;
    await userEvent.type(email, "changed@example.com");
    expect(email.value).toBe(originalEmail);
  });

  it("shows the password field masked and read-only, with a Change Password action", () => {
    renderProfilePage();
    expect(screen.getByText(/change password/i)).toBeInTheDocument();
    const password = screen.getByLabelText(/password/i);
    expect(password).toHaveAttribute("readonly");
    expect(password).toHaveAttribute("type", "password");
  });

  it("marks Academic Role and Research Interests as required", () => {
    renderProfilePage();
    const roleLabel = screen.getByText("Academia");
    expect(roleLabel.parentElement).toHaveTextContent("Academia*");

    const interestsLabel = screen.getByText("Research Interests");
    expect(interestsLabel.parentElement).toHaveTextContent("Research Interests*");
  });

  it("lets the user add and remove a research interest tag", async () => {
    renderProfilePage();
    await screen.findByDisplayValue("researcher@aastu.edu.et");
    await screen.findByText("Artificial Intelligence");
    expect(screen.getAllByText("Artificial Intelligence").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "Machine Learning" }));
    expect(screen.getAllByText("Machine Learning").length).toBeGreaterThan(0);

    const removeButton = await screen.findByRole("button", {
      name: /remove .*machine learning/i,
    });
    await userEvent.click(removeButton);
    expect(
      screen.queryByRole("button", { name: /remove .*machine learning/i }),
    ).not.toBeInTheDocument();
  });

  it("enforces the 300-character limit on the Bio field and shows a live counter", async () => {
    renderProfilePage();
    const bio = screen.getByLabelText(/^bio/i);
    const longText = "x".repeat(310);
    fireEvent.change(bio, { target: { value: longText } });

    expect(bio.value.length).toBeLessThanOrEqual(300);
    expect(screen.getByText(/300 \/ 300|^\d+ \/ 300$/)).toBeInTheDocument();
  });

  it("pre-fills Affiliation with the AASTU default value", () => {
    renderProfilePage();
    expect(screen.getByLabelText(/affiliation/i)).toHaveValue(
      "Addis Ababa Science and Technology University (AASTU)"
    );
  });

  it("shows a saved confirmation after clicking Save Changes", async () => {
    renderProfilePage();
    await screen.findByDisplayValue("researcher@aastu.edu.et");
    await userEvent.selectOptions(screen.getByLabelText(/profile visibility/i), "public");
    await userEvent.click(screen.getByLabelText(/ordp terms/i));
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/saved/i);
  });
});
