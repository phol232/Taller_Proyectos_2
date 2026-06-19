import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import { I18nProvider } from "@/lib/i18n";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  default: { post: vi.fn() },
}));

const { default: api } = await import("@/lib/api");

function renderPage() {
  return render(
    <I18nProvider>
      <ForgotPasswordPage />
    </I18nProvider>
  );
}

async function goToCodeStep(user: ReturnType<typeof userEvent.setup>) {
  vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
  await user.type(screen.getByPlaceholderText("usuario@continental.edu.pe"), "ana@continental.edu.pe");
  await user.click(screen.getByRole("button", { name: "Enviar código" }));
  await screen.findByRole("heading", { name: "Código de verificación" });
}

async function fillCode(_user: ReturnType<typeof userEvent.setup>, digits = "123456") {
  for (let i = 0; i < 6; i++) {
    fireEvent.change(screen.getByLabelText(`Dígito ${i + 1}`), { target: { value: digits[i] } });
  }
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("paso email: valida campo obligatorio", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(await screen.findByText("El correo es obligatorio.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("paso email: rechaza formato inválido", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("usuario@continental.edu.pe"), "no-es-email");
    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(await screen.findByText("Ingresa un correo institucional válido.")).toBeInTheDocument();
  });

  it("paso email: rechaza dominio no institucional", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("usuario@continental.edu.pe"), "ana@gmail.com");
    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(await screen.findByText("Solo se permiten correos @continental.edu.pe")).toBeInTheDocument();
  });

  it("paso email: éxito avanza al paso de código", async () => {
    const user = userEvent.setup();
    renderPage();

    await goToCodeStep(user);

    expect(api.post).toHaveBeenCalledWith("/api/auth/password-reset/request", { email: "ana@continental.edu.pe" });
  });

  it("paso código: verifica y avanza al paso de nueva contraseña", async () => {
    const user = userEvent.setup();
    renderPage();
    await goToCodeStep(user);

    vi.mocked(api.post).mockResolvedValueOnce({ data: { resetToken: "token-123" } });
    await fillCode(user);
    await user.click(screen.getByRole("button", { name: "Verificar código" }));

    expect(await screen.findByRole("heading", { name: "Nueva contraseña" })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/api/auth/password-reset/verify", {
      email: "ana@continental.edu.pe",
      otp: "123456",
    });
  });

  it("paso código: código inválido limpia los dígitos y muestra error", async () => {
    const user = userEvent.setup();
    renderPage();
    await goToCodeStep(user);

    vi.mocked(api.post).mockRejectedValueOnce({ response: { status: 400, data: { message: "Código inválido" } } });
    await fillCode(user);
    await user.click(screen.getByRole("button", { name: "Verificar código" }));

    await waitFor(() => expect(screen.getByLabelText("Dígito 1")).toHaveValue(""));
  });

  it("paso código: reenvía el código", async () => {
    const user = userEvent.setup();
    renderPage();
    await goToCodeStep(user);

    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
    await user.click(screen.getByRole("button", { name: "Reenviar" }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/auth/password-reset/request", { email: "ana@continental.edu.pe" }));
  });

  async function goToPasswordStep(user: ReturnType<typeof userEvent.setup>) {
    await goToCodeStep(user);
    vi.mocked(api.post).mockResolvedValueOnce({ data: { resetToken: "token-123" } });
    await fillCode(user);
    await user.click(screen.getByRole("button", { name: "Verificar código" }));
    await screen.findByRole("heading", { name: "Nueva contraseña" }, { timeout: 2000 });
  }

  it("paso password: valida longitud mínima", async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPasswordStep(user);

    const [newPassInput, confirmInput] = screen.getAllByPlaceholderText("••••••••");
    await user.type(newPassInput, "abc");
    await user.type(confirmInput, "abc");
    await user.click(screen.getByRole("button", { name: "Establecer contraseña" }));

    expect(await screen.findByText("Mínimo 8 caracteres.")).toBeInTheDocument();
  });

  it("paso password: valida requisitos de complejidad faltantes", async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPasswordStep(user);

    const [newPassInput, confirmInput] = screen.getAllByPlaceholderText("••••••••");
    await user.type(newPassInput, "abcdefgh");
    await user.type(confirmInput, "abcdefgh");
    await user.click(screen.getByRole("button", { name: "Establecer contraseña" }));

    expect(await screen.findByText(/La contraseña debe incluir:/)).toBeInTheDocument();
  });

  it("paso password: valida que las contraseñas coincidan", async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPasswordStep(user);

    const [newPassInput, confirmInput] = screen.getAllByPlaceholderText("••••••••");
    await user.type(newPassInput, "Abcdef1!");
    await user.type(confirmInput, "Different1!");
    await user.click(screen.getByRole("button", { name: "Establecer contraseña" }));

    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument();
  });

  it("paso password: éxito avanza al paso final y permite ir al login", async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPasswordStep(user);

    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
    const [newPassInput, confirmInput] = screen.getAllByPlaceholderText("••••••••");
    await user.type(newPassInput, "Abcdef1!");
    await user.type(confirmInput, "Abcdef1!");
    await user.click(screen.getByRole("button", { name: "Establecer contraseña" }));

    expect(await screen.findByText("¡Contraseña actualizada!")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ir al login" }));
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("botón volver: en el paso email navega al login", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Volver al login" }));

    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("botón volver: en pasos posteriores retrocede un paso", async () => {
    const user = userEvent.setup();
    renderPage();
    await goToCodeStep(user);

    await user.click(screen.getByRole("button", { name: "Paso anterior" }));

    expect(await screen.findByText("¿Olvidaste tu contraseña?")).toBeInTheDocument();
  });
});
