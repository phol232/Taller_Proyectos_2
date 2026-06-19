import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "@/components/layout/Sidebar";
import { I18nProvider } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";

const pathnameMock = vi.fn(() => "/admin");
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

vi.mock("@/lib/api", () => ({
  default: { post: vi.fn() },
}));

function renderSidebar() {
  return render(
    <I18nProvider>
      <Sidebar />
    </I18nProvider>
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue("/admin");
    useAuthStore.setState({
      user: { id: "1", name: "Ana García", email: "ana@continental.edu.pe", role: "admin" },
      role: "admin",
      isAuthenticated: true,
    });
    useUiStore.setState({ sidebarCollapsed: false, mobileSidebarOpen: false });
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList));
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
    useUiStore.setState({ sidebarCollapsed: false, mobileSidebarOpen: false });
    vi.unstubAllGlobals();
  });

  it("no renderiza cuando no hay rol", () => {
    useAuthStore.setState({ role: null });
    const { container } = renderSidebar();

    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza enlaces de navegación para admin", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: /Inicio/i })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: /Usuarios/i })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: /Períodos/i })).toHaveAttribute("href", "/admin/academic-periods");
  });

  it("renderiza enlaces para estudiante", () => {
    useAuthStore.setState({ role: "student" });
    pathnameMock.mockReturnValue("/student");
    renderSidebar();

    expect(screen.getByRole("link", { name: /Inicio/i })).toHaveAttribute("href", "/student");
    expect(screen.getByRole("link", { name: /Mi Horario/i })).toHaveAttribute("href", "/student/my-schedule");
  });

  it("renderiza enlaces para coordinador", () => {
    useAuthStore.setState({ role: "coordinator" });
    pathnameMock.mockReturnValue("/coordinator");
    renderSidebar();

    expect(screen.getByRole("link", { name: /Generar/i })).toHaveAttribute("href", "/coordinator/schedule/generate");
  });

  it("muestra la información del usuario", () => {
    renderSidebar();

    expect(screen.getByText("Ana García")).toBeInTheDocument();
  });

  it("colapsa el sidebar en desktop", () => {
    useUiStore.setState({ sidebarCollapsed: true });
    renderSidebar();

    expect(screen.queryByText("Universidad Continental")).not.toBeInTheDocument();
  });
});
