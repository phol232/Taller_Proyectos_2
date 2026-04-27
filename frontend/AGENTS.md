# AGENTS.md — Frontend (`frontend/`)

> Lee este archivo completo antes de generar o modificar cualquier línea de código bajo `frontend/`. Aplica encima de las reglas globales definidas en `AGENTS.md` de la raíz del monorepo.

---

## 1. Stack y versiones

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI lib | React 19 |
| Lenguaje | TypeScript estricto |
| Package manager | pnpm |
| Estilos | Tailwind CSS v4 + `tw-animate-css` |
| Componentes UI | shadcn/ui + `@base-ui/react` + `lucide-react` |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` |
| Estado cliente | Zustand v5 (estado simple, no lógica) |
| Estado servidor | SWR |
| HTTP | Axios (instancia única en `frontend/lib/api.ts`) |
| Notificaciones | `sonner` |
| Theming | `next-themes` |
| Export | `exceljs`, `jspdf`, `jspdf-autotable` |
| Tests | Vitest + Testing Library + jsdom |

No actualices versiones de manera oportunista.

---

## 2. Punto de partida obligatorio

Antes de tocar el frontend:

1. Lee la raíz `AGENTS.md`.
2. Identifica si tu cambio toca `app/`, `components/`, `hooks/`, `lib/`, `store/`, `types/` o `tests/`.
3. Revisa un patrón ya implementado en una feature similar antes de inventar uno nuevo.
4. Revisa `frontend/design.md`, `frontend/PLAN_DE_TRABAJO.md` y `frontend/components.json` si vas a crear UI.
5. Si el cambio implica una nueva ruta o endpoint, valida primero contra el backend real (`http://localhost:8080/api`) o, en su defecto, contra `frontend/lib/api.ts`.

No asumas endpoints que no existan.

---

## 3. Estructura de carpetas

```
frontend/
├── app/                # Next.js App Router (layouts, pages, route groups (app)/(auth))
├── components/         # UI: admin/, layout/, schedule/, shared/, ui/
├── hooks/              # Hooks de cliente (data fetching, dominio, UI)
├── lib/                # Lógica utilitaria, clientes API, validators, helpers
│   ├── api.ts          # ÚNICA instancia Axios configurada
│   ├── adminApi.ts
│   ├── profileApi.ts
│   ├── sessionRecovery.ts
│   ├── fullName.ts
│   ├── i18n/
│   ├── schedule/
│   ├── utils.ts
│   └── validators/
├── public/             # Assets estáticos
├── store/              # Zustand stores (auth, schedule, ui, notifications)
├── tests/              # setup.ts y unit/
├── types/              # Tipos compartidos del dominio
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── vitest.config.ts
```

No crees carpetas paralelas para una misma responsabilidad. Si dudas, busca dónde vive lo equivalente.

---

## 4. Reglas absolutas (frontend)

- **TypeScript strict**: nunca uses `any`. Usa `unknown` o tipados explícitos.
- **Axios único**: prohibido crear `axios.create(...)` fuera de `lib/api.ts`. Todo cliente de feature reutiliza esa instancia.
- **Tokens**: nunca uses `localStorage` ni `sessionStorage` para tokens. La sesión real vive en cookies `httpOnly` del backend.
- **Stores**: Zustand solo guarda estado simple (auth user básico, UI flags, notificaciones, snapshot del schedule actual). La lógica vive en hooks o en `lib/`.
- **Server data**: usa SWR para data fetching del backend. No metas resultados de SWR en Zustand salvo necesidad concreta documentada.
- **App Router**: respeta `app/(app)`, `app/(auth)`, layouts y `not-found.tsx` existentes.
- **Sin lógica en `components/ui/`**: esa carpeta es shadcn/ui adaptado. La lógica de dominio va en `components/<feature>/` o `hooks/`.
- **Sin `console.log` residual**: usa loggers utilitarios o elimínalos antes de mergear.
- **Sin secrets en el cliente**: nada de `process.env.*` privados sin prefijo `NEXT_PUBLIC_*` que se filtre al bundle.
- **Sin URLs hardcodeadas**: usa la instancia Axios + variables de entorno.
- **Sin código que asuma el solver CSP en Java**: vive en otro microservicio.

---

## 5. App Router (`app/`)

- Usa Server Components por defecto. Marca `"use client"` solo cuando lo justifique (estado, efectos, eventos del DOM, librerías que requieren window).
- Layouts en `app/.../layout.tsx`. Páginas en `page.tsx`.
- Rutas autenticadas viven bajo `app/(app)/`. Rutas de login/registro/recuperación bajo `app/(auth)/`.
- Errores y not-found: respeta `app/not-found.tsx` y crea `error.tsx` por route group cuando agregues secciones complejas.
- Datos en server components: `fetch` con cache adecuado (`no-store` cuando depende de cookies del usuario).
- No mezcles llamadas de cliente con SSR del mismo dato; elige uno.

---

## 6. Estilos (Tailwind v4 + shadcn/ui)

- Tailwind v4 está activo. Configuración en `postcss.config.mjs` y `globals.css`.
- Usa utilidades de Tailwind directamente. Evita CSS modules salvo casos puntuales.
- Para combinar clases condicionales: `clsx` y/o `tailwind-merge` (`cn(...)` en `lib/utils.ts`).
- Clases en orden razonable (layout → spacing → tipografía → color → estado → animación).
- Componentes shadcn agregados se versionan en `components/ui/`.
- Themes: `next-themes` controla light/dark. No reimplementes el toggle.
- Animaciones: usa `tw-animate-css` o transiciones nativas de Tailwind. No introduzcas `framer-motion` sin acuerdo.

---

## 7. Forms y validación

- React Hook Form + Zod siempre.
- Schema Zod por formulario en `lib/validators/`.
- Resolver: `@hookform/resolvers/zod`.
- Mensajes de error en español, claros, accionables.
- Nunca confíes solo en validación del frontend. El backend re-valida.

Patrón:

```ts
const schema = z.object({ ... });
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({ resolver: zodResolver(schema) });
```

---

## 8. Data fetching

### 8.1 SWR

- Usa SWR para datos del backend.
- Keys estables y predecibles (idealmente la URL relativa).
- `keepPreviousData: true` cuando aplique para listados.
- Mutaciones: `mutate(key)` después de la acción.
- Revalida en `focus` solo donde tenga sentido.

### 8.2 Axios (`lib/api.ts`)

- Instancia única, con `baseURL` desde variable de entorno (`NEXT_PUBLIC_API_BASE_URL` o equivalente).
- `withCredentials: true` para que las cookies `httpOnly` viajen.
- Interceptor de errores centralizado (401 → recovery, 403 → mensaje, etc.).
- Helpers de feature (`adminApi.ts`, `profileApi.ts`) consumen esa instancia, nunca crean otra.

### 8.3 Tipado de respuestas

- Define tipos en `types/` o junto al cliente de la feature. Evita `any` en respuestas.
- Si el backend cambia un payload, actualiza el tipo en el mismo PR.

---

## 9. Stores Zustand (`store/`)

Stores existentes:
- `auth.store.ts` — usuario básico tras login (id, role, displayName).
- `notification.store.ts`
- `schedule.store.ts`
- `ui.store.ts`

Reglas:

- Una responsabilidad por store.
- No metas funciones complejas; expón acciones que solo mutan estado.
- La lógica (validar, fetch, transformar) vive en hooks o `lib/`.
- No persistas tokens. La sesión es server-side.
- Si necesitas persistir UI (tema, idioma), usa `persist` de Zustand contra `localStorage` solo para estado **no sensible**.

---

## 10. Hooks (`hooks/`)

- Empiezan con `use*`.
- Un hook = un caso de uso (ej. `useAuth`, `useExport`, `useConflictDetector`).
- Si un hook crece, divídelo en helpers privados, pero sigue exportando una API limpia.
- No accedan a `process.env` directamente; pásalos por configuración o usen helpers de `lib/`.

---

## 11. Internacionalización

- Strings visibles en español por defecto.
- Si el módulo ya está i18n, usa el sistema en `lib/i18n/`. No introduzcas otra librería sin acuerdo.
- No hardcodees strings dentro de `components/ui/`.

---

## 12. Tests

### 12.1 Configuración real

`vitest.config.ts`:

- Environment: `jsdom`.
- Globals: true.
- Setup: `./tests/setup.ts`.
- Cobertura provider: `v8`.
- Cobertura incluye: `lib/schedule/**`, `lib/validators/**`, `hooks/**`, `store/**`.
- Thresholds: 70% líneas, branches, funciones, statements.

### 12.2 Reglas

- Todo nuevo hook con lógica importante lleva test.
- Todo schema Zod relevante lleva test.
- Componentes con interacción (modales, forms críticos) llevan test con Testing Library + `@testing-library/user-event`.
- No tests con timers reales sin `vi.useFakeTimers()`.
- No mockees Next.js a menos que sea imprescindible. Mejor extraer la lógica testeable a hooks puros o `lib/`.

### 12.3 Estructura

```
tests/
├── setup.ts
└── unit/
    ├── hooks/
    ├── lib/
    └── store/
```

### 12.4 Comandos

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

---

## 13. Comandos útiles

```bash
cd frontend

pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm test:coverage
pnpm build
```

Variables de entorno típicas (`frontend/.env.local`):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
NEXT_PUBLIC_SOLVER_WS_BASE_URL=ws://localhost:8090
```

Nunca commitees `.env.local`. Solo `.env.example` con valores ficticios.

---

## 14. ESLint y TypeScript

- ESLint: configuración en `eslint.config.mjs`. No la sobrescribas sin acuerdo.
- `pnpm lint` debe pasar antes de mergear.
- `tsc` debe pasar (`pnpm build` también lo ejecuta).
- Errores de tipo no se silencian con `@ts-ignore`. Usa `@ts-expect-error` con razón explícita o tipa correctamente.
- `any` está prohibido. Usa `unknown` y narrow cuando hace falta.

---

## 15. Accesibilidad

- Usa primitives accesibles de `@base-ui/react` o shadcn/ui.
- `aria-*` correctos en componentes interactivos custom.
- Contraste suficiente (Tailwind ya ayuda; no rompas el sistema de tokens del tema).
- Foco visible. No quites `:focus-visible` con `outline-none` salvo que reemplaces el indicador.

---

## 16. Performance

- Server Components por defecto reducen JS al cliente.
- No metas componentes pesados en `app/layout.tsx` global salvo necesidad.
- `next/image` para imágenes.
- Carga diferida (`dynamic(import(...), { ssr: false })`) para componentes pesados de cliente.
- SWR `keepPreviousData` para listados con paginación.

---

## 17. Seguridad

- Cookies `httpOnly` del backend. El frontend no las toca.
- Nunca expongas en el bundle secrets, claves API, tokens, ni URLs internas no públicas.
- Sanitiza inputs HTML si tu UI renderiza markdown o contenido del usuario.
- No uses `dangerouslySetInnerHTML` sin sanitización explícita.
- Cuidado con redirecciones: valida siempre destinos provenientes del backend o querystring.

---

## 18. Solver CSP en el frontend

- El solver es un microservicio separado.
- El frontend lo consume vía:
  - REST a través del backend Java o de la URL pública del solver.
  - WebSockets para progreso de runs y cambios de inputs en tiempo real.
- Endpoints típicos esperados (no asumas que existen, valida contra código real):
  - `POST /api/solver/run`
  - `GET  /api/solver/runs/{id}`
  - `WS   /api/solver/ws/runs/{id}`
  - `WS   /api/solver/ws/inputs`
- Maneja reconexiones y backoff en WebSockets.
- No persistas resultados crudos en localStorage.

---

## 19. Commits

```
feat(scope): ...
fix(scope): ...
refactor(scope): ...
docs(scope): ...
test(scope): ...
chore(scope): ...
```

`scope` típicos en frontend: `auth`, `admin`, `schedule`, `ui`, `hooks`, `lib`, `tests`, `ci`.

---

## 20. Idioma y estilo

- Código fuente: inglés.
- Comentarios internos en el código: español.
- Mensajes visibles al usuario: español, salvo módulos i18n con varios idiomas.
- Componentes: `PascalCase.tsx`. Hooks: `useThing.ts`. Helpers: `camelCase.ts`.
- Una responsabilidad por archivo.
- Imports absolutos con alias `@/` (configurado en `tsconfig.json` y `vitest.config.ts`).

---

## 21. Mantenimiento de este archivo

Actualiza este `frontend/AGENTS.md` cuando cambien:

- la versión mayor de Next.js, React o TypeScript,
- las reglas de Axios, SWR o Zustand,
- la política de testing o cobertura,
- la estructura del App Router o de las carpetas raíz,
- el flujo de autenticación cookie-based o el contrato con el backend.

Mantén este archivo y la raíz `AGENTS.md` consistentes. Si chocan, gana la regla más restringida.
