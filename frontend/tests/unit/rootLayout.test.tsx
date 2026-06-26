import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme">{children}</div>,
}));

vi.mock("@/components/shared/SessionExpiredDialog", () => ({
  default: () => <div data-testid="session-dialog" />,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

describe("RootLayout", () => {
  it("envuelve el contenido con proveedores globales", () => {
    render(
      <RootLayout>
        <div>Contenido raíz</div>
      </RootLayout>,
    );

    expect(screen.getByText("Contenido raíz")).toBeInTheDocument();
    expect(screen.getByTestId("theme")).toBeInTheDocument();
    expect(screen.getByTestId("session-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });
});
