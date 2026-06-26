import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotFound from "@/app/not-found";
import { I18nProvider } from "@/lib/i18n";

const backMock = vi.fn();
const pathname = "/ruta-inexistente";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ back: backMock }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function renderPage() {
  return render(
    <I18nProvider>
      <NotFound />
    </I18nProvider>,
  );
}

describe("NotFound", () => {
  beforeEach(() => {
    backMock.mockReset();
  });

  it("muestra el código 404 y la ruta solicitada", () => {
    renderPage();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText(pathname)).toBeInTheDocument();
  });

  it("muestra tarjetas informativas", () => {
    renderPage();
    expect(screen.getByText(/despliegue gradual/i)).toBeInTheDocument();
    expect(screen.getByText(/enlace desactualizado/i)).toBeInTheDocument();
  });

  it("permite volver atrás", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /regresar/i }));
    expect(backMock).toHaveBeenCalled();
  });

  it("incluye enlace al inicio", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /volver al inicio/i })).toHaveAttribute("href", "/");
  });
});
