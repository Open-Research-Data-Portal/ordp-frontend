import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ResearchInterestsOnboardingPage from "./ResearchInterestsOnboardingPage";

const navigate = vi.hoisted(() => vi.fn());

const authApi = vi.hoisted(() => ({
  getProfileOptions: vi.fn(),
  getProfileCompletion: vi.fn(),
  updateProfileCompletion: vi.fn(),
  addCustomInterest: vi.fn(),
  isProfileCompleted: vi.fn(() => false),
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));
vi.mock("../../../layouts/TopBar", () => ({
  default: ({ title }) => <header>{title}</header>,
}));
vi.mock("../../../context/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { id: 42, email: "researcher@aastu.edu.et", username: "researcher" },
  }),
}));
vi.mock("../api/authApi", () => authApi);

function renderPage() {
  return render(
    <MemoryRouter>
      <ResearchInterestsOnboardingPage />
    </MemoryRouter>
  );
}

/** Waits out the initial options/completion load. */
async function renderLoaded() {
  renderPage();
  await screen.findByRole("heading", {
    name: /tell us about your research interests/i,
  });
}

describe("ResearchInterestsOnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authApi.isProfileCompleted.mockReturnValue(false);
    authApi.getProfileOptions.mockResolvedValue(null);
    authApi.getProfileCompletion.mockResolvedValue({ research_interests: [] });
    authApi.updateProfileCompletion.mockResolvedValue({});
    authApi.addCustomInterest.mockResolvedValue({ name: "Engineering — Mining" });
  });

  it("is a single step: no wizard step indicator, no college or department pickers", async () => {
    await renderLoaded();

    expect(screen.queryByText(/step 1 of 3|step \d of \d/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/college/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/department/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^back$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
  });

  it("selects an interest, saves it to PATCH /profile/complete/, and routes to the dashboard", async () => {
    await renderLoaded();

    await userEvent.click(screen.getByRole("button", { name: "Machine Learning" }));
    await userEvent.click(screen.getByRole("button", { name: /finish/i }));

    await waitFor(() =>
      expect(authApi.updateProfileCompletion).toHaveBeenCalledWith(
        expect.objectContaining({ terms_accepted: true })
      )
    );
    expect(authApi.updateProfileCompletion.mock.calls[0][0].research_interests).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("removes a selected interest via its × chip button", async () => {
    await renderLoaded();

    await userEvent.click(screen.getByRole("button", { name: "Deep Learning" }));
    const remove = await screen.findByRole("button", {
      name: /remove .*deep learning/i,
    });

    await userEvent.click(remove);
    expect(
      screen.queryByRole("button", { name: /remove .*deep learning/i })
    ).not.toBeInTheDocument();
  });

  it("skips to the profile page (which then routes back) without requiring interests or a save call", async () => {
    await renderLoaded();

    await userEvent.click(screen.getByRole("button", { name: /skip for now/i }));

    expect(authApi.updateProfileCompletion).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      "/profile",
      { state: { from: "/research-interests-onboarding" }, replace: true }
    );
  });

  it("does not re-prompt onboarding after a skip", async () => {
    await renderLoaded();
    await userEvent.click(screen.getByRole("button", { name: /skip for now/i }));

    navigate.mockClear();
    renderPage();

    // The skip is remembered, so the second visit bounces to the dashboard.
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true })
    );
  });

  it("blocks Finish with no selection and explains the Skip alternative", async () => {
    await renderLoaded();

    await userEvent.click(screen.getByRole("button", { name: /finish/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/skip for now/i);
    expect(authApi.updateProfileCompletion).not.toHaveBeenCalled();
  });

  it("sends an unlisted category to POST /profile/interests/other/ and shows Pending Approval", async () => {
    await renderLoaded();

    await userEvent.type(screen.getByLabelText(/new category/i), "Engineering");
    await userEvent.type(screen.getByLabelText(/new subcategory/i), "Mining");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() =>
      expect(authApi.addCustomInterest).toHaveBeenCalledWith("Engineering — Mining")
    );

    const heading = await screen.findByRole("heading", { name: /pending requests/i });
    const pending = within(heading.closest("div")).getByRole("listitem");
    expect(pending).toHaveTextContent("Engineering — Mining");
    expect(pending).toHaveTextContent(/pending approval/i);
  });

  it("skips the page for users who already stored interests (they edit from profile settings)", async () => {
    authApi.getProfileCompletion.mockResolvedValue({
      research_interests: ["Law — Cyber Law"],
    });

    renderPage();

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true })
    );
  });

  it("uses backend categories from GET /profile/options/ when provided", async () => {
    authApi.getProfileOptions.mockResolvedValue({
      research_interests: [
        { category: "Hydrology", subcategories: ["Groundwater Modeling"] },
      ],
    });

    await renderLoaded();

    expect(
      await screen.findByRole("button", { name: "Groundwater Modeling" })
    ).toBeInTheDocument();
  });

  it("redirects to the dashboard when the backend already reports the profile complete", async () => {
    authApi.isProfileCompleted.mockReturnValue(true);

    renderPage();

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true })
    );
  });
});
