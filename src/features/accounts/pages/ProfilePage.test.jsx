import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProfilePage from "./ProfilePage";

vi.mock("../../../layouts/Sidebar", () => ({ default: () => <aside /> }));
vi.mock("../../../layouts/TopBar", () => ({ default: ({ title }) => <header>{title}</header> }));
vi.mock("../../../context/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: {
      email: "researcher@aastu.edu.et",
      username: "researcher",
      full_name: "Researcher User",
    },
  }),
}));

function renderProfilePage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );
}

describe("ProfilePage", () => {
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
    expect(screen.getByText("Artificial Intelligence")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /add interest/i }));
    await userEvent.click(screen.getByRole("button", { name: "Machine Learning" }));
    expect(screen.getByText("Machine Learning")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /remove machine learning/i }));
    expect(screen.queryByText("Machine Learning")).not.toBeInTheDocument();
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
    await userEvent.selectOptions(screen.getByLabelText(/profile visibility/i), "public");
    await userEvent.click(screen.getByLabelText(/ordp terms/i));
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/saved/i);
  });
});
