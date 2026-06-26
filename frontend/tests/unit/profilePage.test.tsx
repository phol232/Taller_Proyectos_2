import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "@/app/(app)/profile/page";
import { I18nProvider } from "@/lib/i18n";
import { profileApi } from "@/lib/profileApi";
import { adminApi } from "@/lib/adminApi";
import { useAuthStore } from "@/store/auth.store";

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return { ...actual, toastError: vi.fn(), toastSuccess: vi.fn() };
});

function renderPage() {
  return render(
    <I18nProvider>
      <ProfilePage />
    </I18nProvider>,
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: "1", name: "Ana Pérez", email: "ana@continental.edu.pe", role: "student" },
      role: "student",
      isAuthenticated: true,
    });

    vi.spyOn(profileApi, "getMe").mockResolvedValue({
      id: "1",
      email: "ana@continental.edu.pe",
      fullName: "Ana Pérez",
      role: "STUDENT",
      dni: "12345678",
      phone: "987654321",
      sex: "FEMALE",
      age: 20,
      facultadId: "fac-1",
      carreraId: "car-1",
      preferredShifts: ["MORNING"],
      avatarUrl: null,
    });

    vi.spyOn(adminApi, "listCatalogFacultades").mockResolvedValue([
      { id: "fac-1", code: "ING", name: "Ingeniería", isActive: true, createdAt: null, updatedAt: null },
    ]);

    vi.spyOn(adminApi, "listCatalogCarreras").mockResolvedValue([
      {
        id: "car-1",
        code: "SIS",
        name: "Sistemas",
        facultadId: "fac-1",
        isActive: true,
        createdAt: null,
        updatedAt: null,
      },
    ]);
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
    vi.restoreAllMocks();
  });

  it("muestra los datos del perfil cargados", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("12345678")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("987654321")).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
  });

  it("permite entrar en modo edición", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue("12345678")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /editar/i }));

    expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });
});
