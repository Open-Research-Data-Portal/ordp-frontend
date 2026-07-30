import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProfilePage from "./ProfilePage";
import { AuthProvider } from "../../context/authContext";

vi.mock("../../api/authApi");

function renderProfilePage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ProfilePage />
      </AuthProvider>
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

    const originalEmail = email.value;
    await userEvent.type(email, "changed@example.com");
    expect(email.value).toBe(originalEmail);
  });

  it("shows the password field masked and read-only, with a Change Password action", () => {
    renderProfilePage();
    expect(screen.getByText(/change password/i)).toBeInTheDocument();
    const password = screen.getByLabelText(/^password$/i);
    expect(password).toHaveAttribute("readonly");
    expect(password.value).toBe("••••••••");
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
    await userEvent.clear(bio);
    const longText = "x".repeat(310);
    await userEvent.type(bio, longText);

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
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/saved/i);
  });
});
