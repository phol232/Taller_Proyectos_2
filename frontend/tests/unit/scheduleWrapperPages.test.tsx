import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/schedule/builder/ScheduleBuilderScreen", () => ({
  default: () => <div data-testid="schedule-builder-screen" />,
}));

vi.mock("@/components/schedule/ConfirmScheduleScreen", () => ({
  default: ({ role }: { role: string }) => (
    <div data-testid="confirm-schedule-screen" data-role={role} />
  ),
}));

vi.mock("@/components/schedule/GenerateScheduleScreen", () => ({
  default: ({ viewBasePath }: { viewBasePath: string }) => (
    <div data-testid="generate-schedule-screen" data-view-base-path={viewBasePath} />
  ),
}));

import AdminScheduleBuilderPage from "@/app/(app)/admin/schedule/builder/page";
import CoordinatorScheduleBuilderPage from "@/app/(app)/coordinator/schedule/builder/page";
import AdminConfirmSchedulePage from "@/app/(app)/admin/schedule/confirm/page";
import CoordinatorConfirmSchedulePage from "@/app/(app)/coordinator/schedule/confirm/page";
import AdminGenerateSchedulePage from "@/app/(app)/admin/schedule/generate/page";
import CoordinatorGenerateSchedulePage from "@/app/(app)/coordinator/schedule/generate/page";

describe("páginas wrapper de horarios", () => {
  it("admin builder delega en ScheduleBuilderScreen", () => {
    render(<AdminScheduleBuilderPage />);
    expect(screen.getByTestId("schedule-builder-screen")).toBeInTheDocument();
  });

  it("coordinator builder delega en ScheduleBuilderScreen", () => {
    render(<CoordinatorScheduleBuilderPage />);
    expect(screen.getByTestId("schedule-builder-screen")).toBeInTheDocument();
  });

  it("admin confirm pasa role admin", () => {
    render(<AdminConfirmSchedulePage />);
    expect(screen.getByTestId("confirm-schedule-screen")).toHaveAttribute("data-role", "admin");
  });

  it("coordinator confirm pasa role coordinator", () => {
    render(<CoordinatorConfirmSchedulePage />);
    expect(screen.getByTestId("confirm-schedule-screen")).toHaveAttribute("data-role", "coordinator");
  });

  it("admin generate pasa la ruta de vista correcta", () => {
    render(<AdminGenerateSchedulePage />);
    expect(screen.getByTestId("generate-schedule-screen")).toHaveAttribute(
      "data-view-base-path",
      "/admin/schedule/view",
    );
  });

  it("coordinator generate pasa la ruta de vista correcta", () => {
    render(<CoordinatorGenerateSchedulePage />);
    expect(screen.getByTestId("generate-schedule-screen")).toHaveAttribute(
      "data-view-base-path",
      "/coordinator/schedule/view",
    );
  });
});
