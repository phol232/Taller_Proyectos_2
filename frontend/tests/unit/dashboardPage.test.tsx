import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(app)/dashboard/page";
import { useAuthStore } from "@/store/auth.store";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  });

  it("redirige a /admin para rol admin", async () => {
    useAuthStore.setState({ role: "admin" });
    render(<DashboardPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/admin"));
  });

  it("redirige a /coordinator para rol coordinator", async () => {
    useAuthStore.setState({ role: "coordinator" });
    render(<DashboardPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/coordinator"));
  });

  it("redirige a /student para rol student", async () => {
    useAuthStore.setState({ role: "student" });
    render(<DashboardPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/student"));
  });

  it("mantiene /dashboard para rol teacher", async () => {
    useAuthStore.setState({ role: "teacher" });
    render(<DashboardPage />);

    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled());
  });

  it("no redirige cuando no hay rol", async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled());
  });
});
