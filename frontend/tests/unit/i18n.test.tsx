import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider, useTranslation } from "@/lib/i18n";

function LocaleProbe() {
  const { locale, t } = useTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="login-title">{t.login.welcomeBack}</span>
    </div>
  );
}

describe("I18nProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "es";
  });

  it("usa español por defecto", () => {
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("locale")).toHaveTextContent("es");
    expect(screen.getByTestId("login-title")).toHaveTextContent(/bienvenido de vuelta/i);
  });

  it("restaura locale guardado en localStorage", async () => {
    localStorage.setItem("planner-uc-locale", "en");

    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en");
    });
  });

  it("setLocale persiste el idioma seleccionado", async () => {
    const user = userEvent.setup();

    function Switcher() {
      const { setLocale, locale } = useTranslation();
      return (
        <div>
          <span data-testid="locale">{locale}</span>
          <button type="button" onClick={() => setLocale("en")}>
            English
          </button>
        </div>
      );
    }

    render(
      <I18nProvider>
        <Switcher />
      </I18nProvider>,
    );

    await user.click(screen.getByRole("button", { name: "English" }));

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en");
    });
    expect(localStorage.getItem("planner-uc-locale")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("lanza error fuera del provider", () => {
    expect(() => render(<LocaleProbe />)).toThrow(/I18nProvider/i);
  });
});
