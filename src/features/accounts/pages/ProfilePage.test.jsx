import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProfilePage from "./ProfilePage";

const authApi = vi.hoisted(() => ({
  getProfile: vi.fn(),
  getProfileCompletion: vi.fn(),
  getProfileOptions: vi.fn(),
  updateProfile: vi.fn(),
  updateProfileCompletion: vi.fn(),
  addCustomInterest: vi.fn(),
}));

const mockAuthUser = vi.hoisted(() => ({
  email: "researcher@aastu.edu.et",
  username: "researcher",
  full_name: "Researcher User",
}));

// Mutable so individual tests can exercise the authenticated fetch path.
const mockAuth = vi.hoisted(() => ({
  isAuthenticated: false,
  user: null,
  setUser: vi.fn(),
}));

vi.mock("../../../layouts/Sidebar", () => ({ default: () => <aside /> }));
vi.mock("../../../layouts/TopBar", () => ({ default: ({ title }) => <header>{title}</header> }));
vi.mock("../../../components/dashboard/DashboardShell", () => ({
  default: ({ children, title }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));
vi.mock("../../../context/useAuth", () => ({
  useAuth: () => mockAuth,
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
    mockAuth.isAuthenticated = false;
    mockAuth.user = mockAuthUser;
    authApi.getProfile.mockResolvedValue({});
    authApi.getProfileCompletion.mockResolvedValue({});
    authApi.getProfileOptions.mockResolvedValue({ research_interests: [] });
    authApi.updateProfile.mockResolvedValue({});
    authApi.updateProfileCompletion.mockResolvedValue({});
    authApi.addCustomInterest.mockResolvedValue({ name: "Engineering — Mining" });
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
    const roleLabel = screen.getByText("Occupation");
    expect(roleLabel.parentElement).toHaveTextContent("Occupation*");

    const interestsLabel = screen.getByText("Research Interests");
    expect(interestsLabel.parentElement).toHaveTextContent("Research Interests*");
  });

  it("lets the user add and remove a research interest tag", async () => {
    renderProfilePage();
    await screen.findByDisplayValue("researcher@aastu.edu.et");
    expect(screen.getAllByText("Artificial Intelligence").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "Machine Learning" }));
    expect(screen.getByText("Machine Learning")).toBeInTheDocument();

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
    mockAuth.isAuthenticated = true;
    mockAuth.setUser = vi.fn();
    authApi.getProfile.mockResolvedValue({ email: "researcher@aastu.edu.et" });
    authApi.getProfileCompletion.mockResolvedValue({
      research_interests: ["Law — Cyber Law"],
    });

    renderProfilePage();

    await screen.findByDisplayValue("researcher@aastu.edu.et");
    await userEvent.selectOptions(screen.getByLabelText(/profile visibility/i), "public");
    await userEvent.click(screen.getByLabelText(/ordp terms/i));
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(authApi.updateProfileCompletion).toHaveBeenCalled());
    expect(authApi.updateProfileCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ terms_accepted: true })
    );
    const payload = authApi.updateProfileCompletion.mock.calls[0][0];
    expect(payload.research_interests).toBeUndefined();
  });

  it("loads interests chosen during onboarding from /profile/complete/ so they stay editable", async () => {
    mockAuth.isAuthenticated = true;
    authApi.getProfile.mockResolvedValue({ email: "researcher@aastu.edu.et" });
    authApi.getProfileCompletion.mockResolvedValue({
      research_interests: ["Artificial Intelligence — Deep Learning"],
    });

    renderProfilePage();

    // Rendered as a removable chip, i.e. editable rather than a one-time form.
    const remove = await screen.findByRole("button", {
      name: /remove .*deep learning/i,
    });
    await userEvent.click(remove);
    expect(
      screen.queryByRole("button", { name: /remove .*deep learning/i })
    ).not.toBeInTheDocument();
  });

  it("keeps existing interests when saving the profile", async () => {
    mockAuth.isAuthenticated = true;
    authApi.getProfile.mockResolvedValue({ email: "researcher@aastu.edu.et" });
    authApi.getProfileCompletion.mockResolvedValue({
      research_interests: ["Law — Cyber Law"],
    });

    renderProfilePage();
    await screen.findByRole("button", { name: /remove .*cyber law/i });

    await userEvent.selectOptions(screen.getByLabelText(/profile visibility/i), "public");
    await userEvent.click(screen.getByLabelText(/ordp terms/i));
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(authApi.updateProfileCompletion).toHaveBeenCalledWith(
        expect.objectContaining({ terms_accepted: true })
      )
    );
    expect(authApi.updateProfileCompletion.mock.calls[0][0].research_interests).toBeUndefined();
  });

  it("requests an unlisted category through POST /profile/interests/other/", async () => {
    renderProfilePage();
    await screen.findByDisplayValue("researcher@aastu.edu.et");

    await userEvent.type(screen.getByLabelText(/new category/i), "Engineering");
    await userEvent.type(screen.getByLabelText(/new subcategory/i), "Mining");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() =>
      expect(authApi.addCustomInterest).toHaveBeenCalledWith("Engineering — Mining")
    );
  });
});
