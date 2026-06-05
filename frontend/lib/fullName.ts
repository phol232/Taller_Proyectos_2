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


export function joinFullName(nombres: string, apellidos: string): string {
  return `${nombres.trim()} ${apellidos.trim()}`.trim().replace(/\s+/g, " ");
}
