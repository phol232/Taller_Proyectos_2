import { describe, it, expect, vi, beforeEach } from "vitest";
import { cn, toastError, toastSuccess } from "@/lib/utils";

// Mock de sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from "sonner";

describe("cn()", () => {
  it("combina clases correctamente", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("resuelve conflictos de clases Tailwind (el último gana)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("omite valores falsy", () => {
    expect(cn("px-2", undefined, null, false, "py-4")).toBe("px-2 py-4");
  });

  it("acepta clases condicionales con objeto", () => {
    expect(cn({ "bg-red-500": true, "bg-blue-500": false })).toBe("bg-red-500");
  });
});

describe("toastError()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("llama a toast.error con el título y duración correctos", () => {
    toastError("Credenciales inválidas");
    expect(toast.error).toHaveBeenCalledWith("Credenciales inválidas", {
      description: undefined,
      duration: 2000,
    });
  });

  it("pasa la descripción cuando se provee", () => {
    toastError("Error", "Algo salió mal");
    expect(toast.error).toHaveBeenCalledWith("Error", {
      description: "Algo salió mal",
      duration: 2000,
    });
  });
});

describe("toastSuccess()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("llama a toast.success con el título y duración correctos", () => {
    toastSuccess("Operación exitosa");
    expect(toast.success).toHaveBeenCalledWith("Operación exitosa", {
      description: undefined,
      duration: 1000,
    });
  });

  it("pasa la descripción cuando se provee", () => {
    toastSuccess("Listo", "Todo fue guardado");
    expect(toast.success).toHaveBeenCalledWith("Listo", {
      description: "Todo fue guardado",
      duration: 1000,
    });
  });
});
