import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

describe("LoadingSkeleton", () => {
  it("renderiza la variante card por defecto", () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renderiza la variante table", () => {
    const { container } = render(<LoadingSkeleton variant="table" />);
    expect(container.querySelectorAll(".h-12").length).toBeGreaterThan(0);
  });

  it("renderiza la variante grid", () => {
    const { container } = render(<LoadingSkeleton variant="grid" />);
    expect(container.querySelector(".grid")).toBeInTheDocument();
  });

  it("renderiza la variante form", () => {
    const { container } = render(<LoadingSkeleton variant="form" />);
    expect(container.querySelectorAll(".h-10").length).toBeGreaterThan(0);
  });
});
