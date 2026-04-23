/**
 * Helpers para manejar nombres compuestos en formato "Nombres Apellidos".
 *
 * El backend guarda un único `fullName`. En los formularios se separa en
 * `nombres` + `apellidos`. Al recomponer el formato resultante es
 * "Nombres Apellidos" (los nombres van primero).
 */

/**
 * Partículas que nunca inician un apellido por sí solas: se adjuntan al
 * siguiente token (o al anterior) para no romper apellidos como
 * "de la Cruz", "del Valle", "van Dijk", "dos Santos".
 */
const NAME_PARTICLES = new Set([
  "de",
  "la",
  "las",
  "los",
  "del",
  "da",
  "das",
  "di",
  "do",
  "dos",
  "van",
  "von",
  "der",
  "den",
  "y",
]);

function isParticle(token: string): boolean {
  return NAME_PARTICLES.has(token.toLowerCase());
}

/**
 * Separa un fullName en { nombres, apellidos }. Heurística:
 *  - Si hay ≤ 2 tokens: todo va a `apellidos`, `nombres` queda vacío.
 *  - Si hay 3 tokens: 1 nombre + 2 apellidos.
 *  - Si hay ≥ 4 tokens: 2 nombres + resto apellidos.
 *  - Las partículas (de, la, del, van, …) se adjuntan al siguiente token
 *    para no romper apellidos compuestos.
 */
export function splitFullName(fullName: string): { nombres: string; apellidos: string } {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { nombres: "", apellidos: "" };
  if (tokens.length <= 2) return { nombres: "", apellidos: tokens.join(" ") };

  const targetNombres = tokens.length >= 4 ? 2 : 1;
  const nombres: string[] = [];
  let i = 0;
  while (i < tokens.length && nombres.length < targetNombres) {
    const current = tokens[i];
    if (isParticle(current)) {
      // Partícula: se adjunta al siguiente token y cuenta como un solo "nombre"
      // para no dejar apellidos colgando sin su partícula.
      if (i + 1 < tokens.length) {
        nombres.push(`${current} ${tokens[i + 1]}`);
        i += 2;
      } else {
        nombres.push(current);
        i += 1;
      }
    } else {
      nombres.push(current);
      i += 1;
    }
  }

  const apellidos = tokens.slice(i).join(" ");
  return {
    nombres: nombres.join(" "),
    apellidos,
  };
}

/**
 * Combina nombres y apellidos en un único fullName con el formato
 * "Nombres Apellidos". Normaliza espacios.
 */
export function joinFullName(nombres: string, apellidos: string): string {
  return `${nombres.trim()} ${apellidos.trim()}`.trim().replace(/\s+/g, " ");
}
