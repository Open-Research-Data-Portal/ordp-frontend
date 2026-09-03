import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResetPasswordPage from "./ResetPassword";
import * as authApi from "../api/authApi";

vi.mock("../api/authApi", () => ({
  confirmPasswordReset: vi.fn(),
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the password fields when only token is present in search params", () => {
    render(
      <MemoryRouter initialEntries={["/reset-password?token=valid-token-123"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Set a new password/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
  });

  it("shows an error when token is missing", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole("button", { name: /Reset Password/i });
    await user.click(submitBtn);

    expect(
      screen.getByText(/Invalid or missing reset link/i)
    ).toBeInTheDocument();
    expect(authApi.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it("shows an error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/reset-password?token=valid-token-123"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    );

    const newPassInput = screen.getByLabelText(/New Password/i);
    const confirmPassInput = screen.getByLabelText(/Confirm Password/i);
    const submitBtn = screen.getByRole("button", { name: /Reset Password/i });

    await user.type(newPassInput, "password123");
    await user.type(confirmPassInput, "differentpassword");
    await user.click(submitBtn);

    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(authApi.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it("successfully calls confirmPasswordReset with token when passwords match", async () => {
    const user = userEvent.setup();
    authApi.confirmPasswordReset.mockResolvedValueOnce({ detail: "Success" });

    render(
      <MemoryRouter initialEntries={["/reset-password?token=valid-token-123"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const newPassInput = screen.getByLabelText(/New Password/i);
    const confirmPassInput = screen.getByLabelText(/Confirm Password/i);
    const submitBtn = screen.getByRole("button", { name: /Reset Password/i });

    await user.type(newPassInput, "StrongPass123!");
    await user.type(confirmPassInput, "StrongPass123!");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(authApi.confirmPasswordReset).toHaveBeenCalledWith({
        uid: null,
        token: "valid-token-123",
        new_password: "StrongPass123!",
        confirm_password: "StrongPass123!",
      });
    });

    expect(await screen.findByText(/Login Page/i)).toBeInTheDocument();
  });
});
