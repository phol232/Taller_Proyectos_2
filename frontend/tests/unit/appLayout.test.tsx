import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "@/app/(app)/layout";

vi.mock("@/components/shared/RoleGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="role-guard">{children}</div>,
}));

vi.mock("@/components/layout/Navbar", () => ({
  default: () => <nav data-testid="navbar" />,
}));

vi.mock("@/components/layout/Sidebar", () => ({
  default: () => <aside data-testid="sidebar" />,
}));

describe("AppLayout", () => {
  it("renderiza shell con sidebar, navbar y contenido", () => {
    render(
      <AppLayout>
        <div>Contenido hijo</div>
      </AppLayout>,
    );

    expect(screen.getByTestId("role-guard")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByText("Contenido hijo")).toBeInTheDocument();
  });
});
