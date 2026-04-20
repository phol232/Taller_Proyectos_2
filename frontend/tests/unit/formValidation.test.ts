import { describe, it, expect } from "vitest";

/**
 * Tests unitarios de la lógica de validación de formularios de autenticación.
 * La lógica se extrae directamente de las funciones en login/page.tsx y
 * forgot-password/page.tsx para testearla en aislamiento.
 */

// ── Lógica de validación idéntica a la de login/page.tsx ──────────────────

function validateLoginForm(email: string, password: string) {
  const errors = { email: "", password: "" };
  if (!email) {
    errors.email = "El correo es obligatorio.";
  } else if (!email.endsWith("@continental.edu.pe")) {
    errors.email = "Solo se permiten correos @continental.edu.pe.";
  }
  if (!password) {
    errors.password = "La contraseña es obligatoria.";
  }
  return errors;
}

// ── Lógica de validación idéntica a la de forgot-password/page.tsx ────────

function validateForgotEmail(email: string) {
  if (!email) return "El correo es obligatorio.";
  if (!email.endsWith("@continental.edu.pe")) {
    return "Solo se permiten correos @continental.edu.pe.";
  }
  return "";
}

function validateNewPassword(newPass: string, confirm: string) {
  const isUppercaseChar = (character: string) => /\p{Lu}/u.test(character);
  const isLowercaseChar = (character: string) => /\p{Ll}/u.test(character);
  const isDigitChar = (character: string) => /\p{Nd}/u.test(character);
  const isControlChar = (character: string) => /\p{Cc}|\p{Cf}/u.test(character);
  const isSpecialChar = (character: string) => !isUppercaseChar(character)
    && !isLowercaseChar(character)
    && !isDigitChar(character)
    && !/\s/u.test(character)
    && !isControlChar(character);
  const hasUnsupportedCharacters = [...newPass].some(
    (character) => /\s/u.test(character) || isControlChar(character)
  );

  let newPassError = "";

  if (newPass.length < 8) {
    newPassError = "La contraseña debe tener al menos 8 caracteres.";
  } else if (hasUnsupportedCharacters) {
    newPassError = "La contraseña no puede contener espacios ni caracteres no visibles.";
  } else if (
    ![...newPass].some(isUppercaseChar)
    || ![...newPass].some(isLowercaseChar)
    || ![...newPass].some(isDigitChar)
    || ![...newPass].some(isSpecialChar)
  ) {
    const missing: string[] = [];

    if (![...newPass].some(isUppercaseChar)) missing.push("una mayúscula");
    if (![...newPass].some(isLowercaseChar)) missing.push("una minúscula");
    if (![...newPass].some(isDigitChar)) missing.push("un número");
    if (![...newPass].some(isSpecialChar)) missing.push("un carácter especial");

    newPassError = `La contraseña debe incluir: ${missing.join(", ")}.`;
  }

  const confirmError = newPass !== confirm
    ? "Las contraseñas no coinciden."
    : "";
  return { newPassError, confirmError };
}

// ── Tests: Login ───────────────────────────────────────────────────────────

describe("validateLoginForm()", () => {
  it("email vacío → error requerido", () => {
    const { email } = validateLoginForm("", "Password1!");
    expect(email).toBe("El correo es obligatorio.");
  });

  it("email con dominio externo → error de dominio", () => {
    const { email } = validateLoginForm("user@gmail.com", "Password1!");
    expect(email).toContain("continental.edu.pe");
  });

  it("email con dominio parcial (@continental.edu) → error de dominio", () => {
    const { email } = validateLoginForm("user@continental.edu", "Password1!");
    expect(email).toContain("continental.edu.pe");
  });

  it("email institucional correcto → sin error de email", () => {
    const { email } = validateLoginForm("user@continental.edu.pe", "Password1!");
    expect(email).toBe("");
  });

  it("password vacío → error requerido", () => {
    const { password } = validateLoginForm("user@continental.edu.pe", "");
    expect(password).toBe("La contraseña es obligatoria.");
  });

  it("credenciales válidas → sin errores", () => {
    const errors = validateLoginForm("user@continental.edu.pe", "Password1!");
    expect(errors.email).toBe("");
    expect(errors.password).toBe("");
  });

  it("ambos campos vacíos → dos errores", () => {
    const errors = validateLoginForm("", "");
    expect(errors.email).not.toBe("");
    expect(errors.password).not.toBe("");
  });
});

// ── Tests: Forgot Password — paso 1 ───────────────────────────────────────

describe("validateForgotEmail()", () => {
  it("email vacío → error requerido", () => {
    expect(validateForgotEmail("")).toBe("El correo es obligatorio.");
  });

  it("dominio externo → error de dominio", () => {
    expect(validateForgotEmail("user@hotmail.com")).toContain("continental.edu.pe");
  });

  it("email institucional → sin error", () => {
    expect(validateForgotEmail("72890842@continental.edu.pe")).toBe("");
  });
});

// ── Tests: Forgot Password — paso 3 ───────────────────────────────────────

describe("validateNewPassword()", () => {
  it("contraseña menor a 8 chars → error en newPassError", () => {
    const { newPassError } = validateNewPassword("short", "short");
    expect(newPassError).toContain("8 caracteres");
  });

  it("contraseñas que no coinciden → error en confirmError", () => {
    const { confirmError } = validateNewPassword("Password1!", "Different1!");
    expect(confirmError).toBe("Las contraseñas no coinciden.");
  });

  it("contraseñas que coinciden y son válidas → sin errores", () => {
    const { newPassError, confirmError } = validateNewPassword("Password1!", "Password1!");
    expect(newPassError).toBe("");
    expect(confirmError).toBe("");
  });

  it("contraseña sin complejidad requerida → error en newPassError", () => {
    const { newPassError } = validateNewPassword("password1", "password1");
    expect(newPassError).toContain("una mayúscula");
    expect(newPassError).toContain("carácter especial");
  });

  it("contraseña con símbolos como _ y # → válida", () => {
    const { newPassError } = validateNewPassword("BRayan27_@", "BRayan27_@");
    expect(newPassError).toBe("");
  });

  it("contraseña con espacio → error específico", () => {
    const { newPassError } = validateNewPassword("BRayan27 @_", "BRayan27 @_");
    expect(newPassError).toContain("espacios");
  });

  it("contraseña vacía → error de longitud", () => {
    const { newPassError } = validateNewPassword("", "");
    expect(newPassError).not.toBe("");
  });

  it("contraseñas no coinciden aunque ambas son válidas", () => {
    const { newPassError, confirmError } = validateNewPassword("Password1!", "Password2!");
    expect(newPassError).toBe("");
    expect(confirmError).not.toBe("");
  });
});
