import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("Home", () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it("redirige a /dashboard al montar", async () => {
    render(<Home />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });
});
