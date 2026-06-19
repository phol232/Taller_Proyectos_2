import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsersPage from "@/app/(app)/admin/users/page";
import { I18nProvider } from "@/lib/i18n";
import type { UserAdmin } from "@/types/admin";

function renderPage() {
  return render(
    <I18nProvider>
      <AdminUsersPage />
    </I18nProvider>
  );
}

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/adminApi", () => ({
  adminApi: {
    listUsers: vi.fn(),
    searchUsers: vi.fn(),
    createUser: vi.fn(),
    activateUser: vi.fn(),
    deactivateUser: vi.fn(),
  },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

const { adminApi } = await import("@/lib/adminApi");
const USER_ID = "a1111111-1111-4111-8111-111111111111";

function sampleUser(overrides: Partial<UserAdmin> = {}): UserAdmin {
  return {
    id: USER_ID,
    email: "ana@continental.edu.pe",
    passwordHash: "hash",
    fullName: "Ana García",
    role: "ADMIN",
    active: true,
    emailVerified: true,
    avatarUrl: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function pagedResult(content: UserAdmin[]) {
  return { content, page: 1, pageSize: 12, totalCount: content.length, totalPages: 1 };
}

describe("AdminUsersPage", () => {
  beforeEach(() => {
    vi.mocked(adminApi.listUsers).mockResolvedValue(pagedResult([sampleUser()]));
    vi.mocked(adminApi.searchUsers).mockResolvedValue(pagedResult([]));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("carga y muestra la lista de usuarios", async () => {
    renderPage();

    expect(await screen.findByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("ana@continental.edu.pe")).toBeInTheDocument();
    await waitFor(() => expect(adminApi.listUsers).toHaveBeenCalled());
  });

  it("busca usuarios por nombre", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Ana García");

    await user.type(screen.getByPlaceholderText("Buscar por nombre"), "Ana");

    await waitFor(() => expect(adminApi.searchUsers).toHaveBeenCalledWith("Ana", 1), { timeout: 2000 });
  });

  it("filtra por rol", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.listUsers).mockResolvedValue(
      pagedResult([sampleUser(), sampleUser({ id: "y", fullName: "Luis Estudiante", role: "STUDENT" })])
    );
    renderPage();
    await screen.findByText("Ana García");
    expect(screen.getByText("Luis Estudiante")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Estudiante" }));

    await waitFor(() => {
      expect(screen.queryByText("Ana García")).not.toBeInTheDocument();
      expect(screen.getByText("Luis Estudiante")).toBeInTheDocument();
    });
  });

  it("crea un usuario nuevo desde el diálogo", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.createUser).mockResolvedValue(sampleUser({ id: "x", email: "nuevo@continental.edu.pe" }));
    renderPage();
    await screen.findByText("Ana García");

    await user.click(screen.getByRole("button", { name: /Nuevo usuario/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByPlaceholderText("usuario@continental.edu.pe"), "nuevo@continental.edu.pe");
    await user.type(within(dialog).getByPlaceholderText("Nombres y apellidos"), "Usuario Nuevo");
    await user.type(within(dialog).getByPlaceholderText("Mínimo 8 caracteres"), "Abcdef1!");
    await user.click(within(dialog).getByRole("button", { name: /Crear|Registrar/i }));

    await waitFor(() => expect(adminApi.createUser).toHaveBeenCalled());
  });

  it("crea un usuario: valida campos obligatorios", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Ana García");

    await user.click(screen.getByRole("button", { name: /Nuevo usuario/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Crear|Registrar/i }));

    expect(await within(dialog).findByText("El email es obligatorio.")).toBeInTheDocument();
    expect(adminApi.createUser).not.toHaveBeenCalled();
  });

  it("desactiva un usuario tras confirmar", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deactivateUser).mockResolvedValue(sampleUser({ active: false }));
    renderPage();
    await screen.findByText("Ana García");

    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(adminApi.deactivateUser).toHaveBeenCalledWith(USER_ID));
  });

  it("activa un usuario inactivo sin confirmación", async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.listUsers).mockResolvedValue(pagedResult([sampleUser({ active: false })]));
    vi.mocked(adminApi.activateUser).mockResolvedValue(sampleUser({ active: true }));
    renderPage();
    await screen.findByText("Ana García");

    await user.click(screen.getByRole("button", { name: "Activar" }));

    await waitFor(() => expect(adminApi.activateUser).toHaveBeenCalledWith(USER_ID));
  });
});
