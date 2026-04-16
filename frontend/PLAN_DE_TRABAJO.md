# Plan de Trabajo — Frontend · Planner UC

> **Proyecto:** Planner UC — Sistema de Generación Óptima de Horarios Académicos  
> **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui  
> **Arquitectura obligatoria:** SPA estricta (Single Page Application)  
> **Fecha de elaboración:** 13 de abril de 2026

---

## Índice

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Principios de Arquitectura SPA](#2-principios-de-arquitectura-spa-estrictos)
3. [Sistema de Diseño](#3-sistema-de-diseño)
4. [Estructura de Carpetas](#4-estructura-de-carpetas)
5. [Módulos y Páginas](#5-módulos-y-páginas)
6. [Componentes Compartidos](#6-componentes-compartidos)
7. [Gestión de Estado y Datos](#7-gestión-de-estado-y-datos)
8. [Seguridad Frontend](#8-seguridad-frontend)
9. [Accesibilidad y Compatibilidad](#9-accesibilidad-y-compatibilidad)
10. [Plan de Fases](#10-plan-de-fases)
11. [Criterios de Aceptación Técnicos](#11-criterios-de-aceptación-técnicos)
12. [Configuración Inicial del Proyecto](#12-configuración-inicial-del-proyecto)

---

## 1. Stack Tecnológico

| Capa | Tecnología | Versión mínima | Justificación |
|---|---|---|---|
| Framework | **Next.js** (App Router) | 14.x | SSR/CSR híbrido, routing nativo, compatible con SPA |
| Lenguaje | **TypeScript** | 5.x | Tipado estricto; reduce errores en validaciones en tiempo real |
| Estilos | **Tailwind CSS** | 3.4.x | Sistema de utilidades alineado con el spacing de 8px del design system |
| Componentes | **shadcn/ui** | latest | Componentes accesibles (Radix UI), totalmente personalizables vía Tailwind |
| Formularios | **React Hook Form + Zod** | RHF 7.x / Zod 3.x | Validación ≤1 s en tiempo real, tipado de esquemas |
| HTTP Client | **Axios** o **fetch nativo + SWR** | SWR 2.x | Deduplicación automática de requests, revalidación, evita waterfalls |
| Gestión de Estado Global | **Zustand** | 4.x | Liviano, sin boilerplate; suficiente para roles, sesión y estado de horarios |
| Autenticación | **JWT** almacenado en `httpOnly` cookie | — | Mitigación XSS; expiración ≤ 8 horas (RNF seguridad) |
| Exportación | **jsPDF + xlsx** | — | RF-17: exportar horarios a PDF y Excel en ≤ 5 s |
| Fuentes | **Geist / next/font** | — | Sistema tipográfico del design system; cargado con `next/font` para rendimiento |
| Testing | **Vitest + React Testing Library** | Vitest 1.x | Cobertura ≥ 70% en módulos críticos (RNF mantenibilidad) |
| Linter/Formatter | **ESLint + Prettier** | — | Consistencia de código |

---

## 2. Principios de Arquitectura SPA Estrictos

El sistema **debe ser una SPA**: no hay recargas de página completa en ningún flujo de usuario.

### Reglas obligatorias

1. **Routing client-side exclusivo.** Toda la navegación ocurre mediante `next/navigation` (`useRouter`, `<Link>`). Ningún `<a href>` sin el componente `<Link>` de Next.js.
2. **Una sola shell de aplicación.** El layout raíz (`app/layout.tsx`) monta la estructura permanente (navbar, sidebar, toasts). Las rutas cargan únicamente el contenido central vía slots de React.
3. **Sin recargas en operaciones CRUD.** Tras crear, editar o eliminar, el estado local/global se actualiza con mutación optimista; la tabla/lista se actualiza sin refresh.
4. **Transiciones de vista suaves.** Usar `<Suspense>` boundaries con skeletons para cargas asíncronas. Duración: 150–300 ms (guideline de animación del design system).
5. **Validación en tiempo real en el cliente.** Las restricciones de horario (créditos, prerrequisitos, solapamientos, vacantes) se validan en ≤ 1 s mediante lógica local + confirmación API, sin navegar a otra página.
6. **Estado persistente entre rutas.** El estado de formularios en borrador y la sesión del usuario sobreviven a la navegación. Usar Zustand con `persist` middleware para datos de sesión.
7. **Carga diferida de módulos pesados.** `jsPDF`, `xlsx` y el módulo de grilla de horario se importan con `next/dynamic` + `{ ssr: false }` para no bloquear el bundle inicial.

---

## 3. Sistema de Diseño

Basado íntegramente en `design.md` (Vercel Design System — Geist).

### 3.1 Paleta de colores — `tailwind.config.ts`

```ts
colors: {
  // Escala neutra (primarios)
  'vercel-black':   '#171717',  // Texto principal, headings
  'pure-white':     '#ffffff',  // Fondo de página y cards
  'true-black':     '#000000',  // Contextos de consola/código

  // Acentos de flujo de trabajo
  'develop-blue':   '#0a72ef',  // Workflow: Desarrollar
  'preview-pink':   '#de1d8d',  // Workflow: Preview / alerta
  'ship-red':       '#ff5b4f',  // Workflow: Confirmar / producción

  // Escala de grises
  'gray-900':  '#171717',
  'gray-600':  '#4d4d4d',
  'gray-500':  '#666666',
  'gray-400':  '#808080',
  'gray-100':  '#ebebeb',
  'gray-50':   '#fafafa',

  // Interactivos
  'link-blue':  '#0072f5',
  'focus-blue': 'hsla(212, 100%, 48%, 1)',
  'badge-bg':   '#ebf5ff',
  'badge-text': '#0068d6',
}
```

### 3.2 Tipografía — `layout.tsx`

```tsx
import { Geist, Geist_Mono } from 'next/font/google'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
```

| Rol UI | Clase Tailwind equivalente | Tamaño | Peso | Letter-spacing |
|---|---|---|---|---|
| Hero / Título página | `text-5xl font-semibold` | 48px | 600 | `-[2.88px]` |
| Heading sección | `text-4xl font-semibold` | 40px | 600 | `-[2.4px]` |
| Título card / modal | `text-2xl font-semibold` | 24px | 600 | `-[0.96px]` |
| Body estándar UI | `text-base font-normal` | 16px | 400 | normal |
| Navegación / labels | `text-sm font-medium` | 14px | 500 | normal |
| Código / mono | `font-mono text-base` | 16px | 400 | normal |
| Badge / caption | `text-xs font-medium` | 12px | 500 | normal |

### 3.3 Sombras y bordes (shadow-as-border)

Definir en `globals.css`:

```css
.card-border   { box-shadow: rgba(0,0,0,0.08) 0px 0px 0px 1px; }
.card-elevated { box-shadow: rgba(0,0,0,0.08) 0px 0px 0px 1px,
                             rgba(0,0,0,0.04) 0px 2px 2px,
                             rgba(0,0,0,0.04) 0px 8px 8px -8px,
                             #fafafa 0px 0px 0px 1px; }
.ring-border   { box-shadow: rgb(235,235,235) 0px 0px 0px 1px; }
```

> **No usar `border` de Tailwind** para contenedores principales. Usar las clases `.card-border` / `.card-elevated` para consistencia con el design system.

### 3.4 Espaciado

- Unidad base: **8px** → `gap-2`, `p-2` = 8px.
- Salto notable en el design system: de `16px` a `32px` (no usar `20px`/`24px` como espaciados principales).
- Padding secciones: `py-20` (80px) a `py-28` (112px).

### 3.5 Radius

| Contexto | Clase |
|---|---|
| Botón / input estándar | `rounded` (6px) |
| Card estándar | `rounded-lg` (8px) |
| Card destacada / imagen | `rounded-xl` (12px) |
| Badge / pill | `rounded-full` |

---

## 4. Estructura de Carpetas

```
frontend/
├── app/                            # Next.js App Router (SPA shell)
│   ├── layout.tsx                  # Shell raíz: fuentes, providers, toasts, navbar
│   ├── page.tsx                    # Redirect a /login o /dashboard
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx            # RF-18: Login con JWT
│   ├── (app)/                      # Layout con sidebar + navbar autenticado
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Home por rol
│   │   ├── admin/
│   │   │   ├── students/           # RF-01: CRUD Estudiantes
│   │   │   ├── teachers/           # RF-02: CRUD Docentes
│   │   │   ├── courses/            # RF-03: CRUD Cursos
│   │   │   └── classrooms/         # RF-04: CRUD Aulas
│   │   ├── coordinator/
│   │   │   ├── schedule/
│   │   │   │   ├── generate/       # RF-07: Generar horario docente
│   │   │   │   ├── builder/        # RF-10: Construir/ajustar horario
│   │   │   │   └── confirm/        # RF-11: Confirmar/cancelar horario
│   │   │   └── teacher-availability/ # RF-06: Disponibilidad docente
│   │   ├── student/
│   │   │   ├── schedule/
│   │   │   │   ├── generate/       # RF-12: Generar horario estudiante
│   │   │   │   └── builder/        # RF-13: Construir/ajustar horario
│   │   │   └── my-schedule/        # RF-16: Visualizar mi horario
│   │   └── schedules/
│   │       └── view/               # RF-16: Vista general de horarios
│
├── components/
│   ├── ui/                         # shadcn/ui components (auto-generados)
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── PageShell.tsx
│   ├── schedule/
│   │   ├── WeeklyGrid.tsx          # RF-16: Grilla semanal días × franjas
│   │   ├── ScheduleBlock.tsx       # Bloque individual en la grilla
│   │   ├── ConflictBadge.tsx       # RF-15: Indicador de conflicto
│   │   └── ExportButton.tsx        # RF-17: Trigger de exportación
│   ├── forms/
│   │   ├── StudentForm.tsx         # RF-01
│   │   ├── TeacherForm.tsx         # RF-02
│   │   ├── CourseForm.tsx          # RF-03
│   │   ├── ClassroomForm.tsx       # RF-04
│   │   └── AvailabilityGrid.tsx    # RF-06: Grid de disponibilidad docente
│   └── shared/
│       ├── DataTable.tsx           # Tabla reutilizable con filtros
│       ├── ConfirmDialog.tsx       # Modal de confirmación destructiva
│       ├── LoadingSkeleton.tsx     # Skeletons para estados de carga
│       └── RoleGuard.tsx           # Guard de acceso por rol (RF-18)
│
├── hooks/
│   ├── useAuth.ts                  # JWT session, role, logout
│   ├── useScheduleValidation.ts    # RF-14: Validación ≤1 s en tiempo real
│   ├── useConflictDetector.ts      # RF-15: Detección de solapamientos local
│   └── useExport.ts                # RF-17: jsPDF + xlsx (lazy loaded)
│
├── lib/
│   ├── api.ts                      # Cliente Axios con interceptors JWT
│   ├── validators/
│   │   ├── student.schema.ts       # Zod schemas RF-01
│   │   ├── teacher.schema.ts       # Zod schemas RF-02
│   │   ├── course.schema.ts        # Zod schemas RF-03
│   │   └── classroom.schema.ts     # Zod schemas RF-04
│   ├── schedule/
│   │   ├── overlap.ts              # Lógica de detección de solapamientos
│   │   ├── credits.ts              # Validación de créditos RF-13/14
│   │   └── prerequisites.ts       # Validación de prerrequisitos RF-05/14
│   └── utils.ts
│
├── store/
│   ├── auth.store.ts               # Zustand: sesión, rol, JWT
│   ├── schedule.store.ts           # Zustand: horario en borrador
│   └── notification.store.ts      # Zustand: toasts/alertas RF-15
│
├── types/
│   ├── entities.ts                 # Student, Teacher, Course, Classroom
│   ├── schedule.ts                 # Assignment, TimeSlot, WeeklySchedule
│   └── auth.ts                     # User, Role, JWTPayload
│
├── styles/
│   └── globals.css                 # Design tokens, shadow classes, focus ring
│
├── public/
│   └── fonts/                      # Geist (si se sirve localmente)
│
├── tests/
│   ├── unit/
│   │   ├── overlap.test.ts
│   │   ├── credits.test.ts
│   │   └── prerequisites.test.ts
│   └── integration/
│       ├── auth.test.tsx
│       └── schedule-builder.test.tsx
│
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── components.json                 # shadcn/ui config
```

---

## 5. Módulos y Páginas

### 5.1 Autenticación — RF-18

**Ruta:** `/login`  
**Rol:** Todos

| Elemento | Especificación |
|---|---|
| Formulario | Email + Password con React Hook Form + Zod |
| Submit | Deshabilitar botón durante petición (loading state) |
| Respuesta exitosa | Guardar JWT en cookie `httpOnly` vía API Route Next.js; redirigir a `/dashboard` |
| Error 401 | Toast error "Credenciales inválidas" — nunca exponer detalles técnicos |
| JWT expirado | Interceptor Axios: detecta 401, limpia sesión, redirige a `/login` sin recarga |
| Guard | `RoleGuard` en `(app)/layout.tsx` verifica JWT antes de renderizar cualquier ruta protegida |

---

### 5.2 Gestión de Entidades (Admin) — RF-01 al RF-04

**Rutas:** `/admin/students`, `/admin/teachers`, `/admin/courses`, `/admin/classrooms`

**Patrón común para cada módulo:**

```
[Listado con DataTable]  ←→  [Drawer / Dialog: Create/Edit Form]
         ↓ ConfirmDialog para Delete
```

| Elemento | Especificación |
|---|---|
| `DataTable` | Columnas ordenables, buscador por código y nombre, paginación client-side |
| Formulario crear/editar | `Sheet` (slide-over) de shadcn/ui; no navega a nueva página (SPA) |
| Validación | Zod + React Hook Form; error inline bajo cada campo; no bloquea UI |
| Operaciones CRUD | Mutación optimista: tabla actualiza inmediatamente, rollback si falla API |
| Respuesta | Toast de éxito/error en ≤ 3 s |
| Eliminación | `ConfirmDialog` modal antes de DELETE |
| Prerrequisitos en Cursos | Selector multi-select con autocompletar de cursos existentes (RF-03) |
| Disponibilidad Docente | Grid de 5 días × franjas horarias con toggle de disponibilidad (RF-06) |

---

### 5.3 Generación y Gestión del Horario Docente (Coordinador) — RF-07 al RF-11

**Rutas:** `/coordinator/schedule/generate`, `/coordinator/schedule/builder`, `/coordinator/schedule/confirm`

#### Generación Automática — RF-07

| Elemento | Especificación |
|---|---|
| Trigger | Botón "Generar Horario" con estado de carga + spinner |
| Polling / SSE | Si la API es asíncrona (> 5 s), implementar polling cada 2 s o EventSource para progreso |
| Loading state | Skeleton de grilla durante los ≤ 30 s del motor CSP |
| Resultado exitoso | Navega (SPA) a `/coordinator/schedule/builder` con horario en borrador cargado en store |
| Sin solución | Toast/banner con lista de conflictos identificados (RF-15) |

#### Constructor Manual — RF-10

| Elemento | Especificación |
|---|---|
| Interfaz | `WeeklyGrid` interactiva: drag-and-drop o selección de franjas |
| Validación en tiempo real | Al seleccionar cualquier combinación curso+docente+aula+franja: `useConflictDetector` verifica solapamientos en ≤ 1 s; muestra `ConflictBadge` inline |
| Opciones compatibles | El panel de asignación filtra automáticamente docentes disponibles, aulas disponibles y franjas libres para el cursor seleccionado |
| Estado borrador | Cambios se guardan solo en `schedule.store` hasta confirmar explícitamente |

#### Confirmar / Cancelar — RF-11

| Elemento | Especificación |
|---|---|
| Confirmar | `ConfirmDialog` → POST API → si 200: toast éxito + estado "confirmado" en store |
| Cancelar | `ConfirmDialog` destructivo → DELETE borrador → estado "cancelado" |
| Post-confirmación | Horario confirmado es read-only; botón "Editar" requiere cancelar primero |

---

### 5.4 Horario del Estudiante — RF-12 al RF-14

**Rutas:** `/student/schedule/generate`, `/student/schedule/builder`, `/student/my-schedule`

#### Generación Automática — RF-12

| Elemento | Especificación |
|---|---|
| Selector de cursos | Lista de cursos disponibles (prerrequisitos cumplidos, vacantes > 0); checkbox multi-select |
| Trigger | "Generar Propuesta" → resultado en ≤ 5 s |
| Loading | Skeleton de la grilla semanal durante generación |
| Propuesta | Se carga en `WeeklyGrid` modo preview; botón "Aceptar" o "Ajustar manualmente" |

#### Constructor Manual — RF-13 + RF-14

| Elemento | Especificación |
|---|---|
| Agregar curso | Selector con filtro; al seleccionar sección se ejecuta `useScheduleValidation` |
| Validación instantánea (≤ 1 s) | 1. Prerrequisitos pendientes → mensaje con lista de faltantes |
| | 2. Límite de créditos → badge "X / 22 créditos" actualizado en tiempo real |
| | 3. Vacantes agotadas → sección deshabilitada con tooltip |
| | 4. Solapamiento → franja resaltada en rojo con mensaje de conflicto |
| Retirar curso | Click en bloque de la grilla → `ConfirmDialog` → remove del store |
| Estado del horario | Indicador de créditos acumulados visible permanentemente en la barra superior del módulo |

---

### 5.5 Visualización y Exportación — RF-16 + RF-17

**Componente:** `WeeklyGrid` — reutilizado en todos los módulos de horario.

#### WeeklyGrid

```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│          │  Lunes   │  Martes  │ Miércoles│  Jueves  │ Viernes  │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ 08-10    │ MAT-101  │          │ MAT-101  │          │          │
│          │ Prof. X  │          │ Prof. X  │          │          │
│          │ A-201    │          │ A-201    │          │          │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ 10-12    │          │ FIS-101  │          │ FIS-101  │          │
│          │          │ Prof. Y  │          │ Prof. Y  │          │
│          │          │ B-101    │          │ B-101    │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

| Propiedad | Detalle |
|---|---|
| Cada bloque muestra | Nombre del curso · Sección · Docente · Aula (RF-16) |
| Conflicto | Borde rojo + `ConflictBadge` sobre el bloque |
| Carga | Skeleton animado; contenido en ≤ 3 s |
| Vista responsive | Scroll horizontal en mobile; mínimo 44px por celda (touch target) |

#### Exportación — RF-17

| Formato | Librería | Implementación |
|---|---|---|
| PDF | `jsPDF` + `jspdf-autotable` | Tabla de asignaciones: código, nombre, sección, docente, aula, franja por día |
| Excel | `xlsx` (SheetJS) | Hoja con misma estructura; colores de columna según acento del flujo |
| Trigger | `ExportButton` dropdown con opciones PDF / Excel |
| Loading | Import dinámico con `next/dynamic`; spinner mientras se genera el archivo |
| Tiempo objetivo | ≤ 5 s para el escenario base del PMV |

---

## 6. Componentes Compartidos

### DataTable

- Basado en `Table` de shadcn/ui
- Props: `columns`, `data`, `searchKeys`, `isLoading`
- Búsqueda client-side por código o nombre
- Paginación de 10/25/50 filas
- Columna de acciones: Editar (ícono lápiz) + Eliminar (ícono basurero rojo)
- Estado vacío: ilustración + CTA "Agregar primer registro"

### ConfirmDialog

- Basado en `AlertDialog` de shadcn/ui
- Props: `title`, `description`, `onConfirm`, `variant: 'default' | 'destructive'`
- Botón destructivo usa color `ship-red` (`#ff5b4f`)
- Se deshabilita durante la petición API

### LoadingSkeleton

- Variantes: `table`, `grid`, `form`, `card`
- Animación `animate-pulse` de Tailwind
- Reserva el espacio del contenido (evita layout shift — guideline `content-jumping`)

### RoleGuard

```tsx
// Redirige a /login sin recarga si no autenticado
// Retorna HTTP 403 visual si el rol no tiene permisos para esa ruta
<RoleGuard allowedRoles={['admin', 'coordinator']}>
  {children}
</RoleGuard>
```

### Notification / Toast

- Basado en `Sonner` (recomendado con shadcn/ui) o `toast` nativo de shadcn
- 4 variantes: `success`, `error`, `warning`, `info`
- `error` siempre incluye descripción específica del conflicto (RF-15) — nunca mensaje genérico
- Duración: 5 s para error; 3 s para éxito

---

## 7. Gestión de Estado y Datos

### Stores Zustand

```ts
// auth.store.ts
interface AuthState {
  user: User | null
  role: Role | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

// schedule.store.ts
interface ScheduleState {
  draft: WeeklySchedule | null         // Borrador en edición
  status: 'idle' | 'draft' | 'confirmed' | 'cancelled'
  setDraft: (schedule: WeeklySchedule) => void
  updateAssignment: (assignment: Assignment) => void
  clearDraft: () => void
}

// notification.store.ts
interface NotificationState {
  conflicts: Conflict[]
  addConflict: (c: Conflict) => void
  clearConflicts: () => void
}
```

### Cliente API — `lib/api.ts`

```ts
// Interceptor request: adjunta JWT desde cookie
// Interceptor response: detecta 401 → logout + redirect /login
//                       detecta 403 → toast "Sin permisos para esta acción"
//                       detecta 409 → toast con mensaje de conflicto de recurso (RF-09)
```

### Estrategia de fetching (anti-waterfalls)

- Usar `Promise.all()` para peticiones independientes en paralelo (guideline `async-parallel`)
- Usar SWR para datos que se re-consultan (listas de entidades)
- Usar `React.cache()` o `next/cache` en Server Components donde aplique
- Suspense boundaries con skeleton en cada módulo para streaming

---

## 8. Seguridad Frontend

| Amenaza OWASP | Mitigación implementada en frontend |
|---|---|
| **XSS** | No usar `dangerouslySetInnerHTML`. Toda salida de datos del servidor se renderiza como texto en React (escape automático). Sanitizar con `DOMPurify` si se recibe HTML externo. |
| **CSRF** | JWT almacenado en cookie `httpOnly; Secure; SameSite=Strict`. No accesible desde JS. Las mutations incluyen el JWT en `Authorization: Bearer` header, no en cookies de sesión. |
| **Inyección** | Toda entrada de formulario pasa por Zod antes de enviarse. No se construyen queries en frontend. |
| **Exposición de datos sensibles** | No loguear tokens ni datos personales en `console`. Variables de entorno con prefijo `NEXT_PUBLIC_` solo para datos no sensibles. |
| **Control de acceso roto** | `RoleGuard` en cada layout de módulo. La verificación real de permisos ocurre en el backend; el guard frontend es UX, no seguridad. |
| **Error messages** | Los errores nunca exponen stack traces, códigos de error internos ni estructura de la API al usuario final. |

---

## 9. Accesibilidad y Compatibilidad

### WCAG 2.1 AA (RNF obligatorio)

| Componente crítico | Requisito |
|---|---|
| Navegación principal | Ratio de contraste ≥ 4.5:1; todos los ítems navegables con teclado (`Tab`); `aria-current="page"` en ítem activo |
| Formularios | `<label>` asociado a cada campo (`for`/`htmlFor`); mensajes de error con `aria-describedby`; campos requeridos con `aria-required` |
| WeeklyGrid | Celdas con `role="gridcell"`, `aria-label` con descripción completa del bloque; navegable con teclas de flecha |
| Modales / Dialogs | Focus trap dentro del modal; `aria-modal="true"`; cierre con `Escape` |
| Botones de acción | Mínimo 44×44px; `aria-label` en botones de solo ícono |
| Focus ring | `outline: 2px solid hsla(212, 100%, 48%, 1)` en todos los elementos interactivos (color del design system) |

> shadcn/ui + Radix UI cumplen la gran mayoría de estos requisitos por defecto. Verificar con **axe DevTools** o **Lighthouse** al fin de cada iteración.

### Compatibilidad de navegadores (RNF obligatorio)

- Chrome, Firefox, Edge — versiones actuales — Windows y macOS
- No usar APIs experimentales sin polyfill
- Probar cada módulo en los tres navegadores antes de cerrar iteración

### Rendimiento

| Métrica | Objetivo |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5 s |
| CLS (Cumulative Layout Shift) | < 0.1 (usar `LoadingSkeleton` con dimensiones fijas) |
| Operaciones generales | ≤ 3 s (P95) — RNF de rendimiento |
| Validaciones en tiempo real | ≤ 1 s — RF-13/14 |
| Exportación PDF/Excel | ≤ 5 s — RF-17 |
| Bundle inicial | < 200 KB (JS comprimido) — split agresivo con `next/dynamic` |

---

## 10. Plan de Fases

### Fase 0 — Configuración del Proyecto (Semana 1)

**Objetivo:** Proyecto funcionando, design system aplicado, infraestructura lista.

| Tarea | Responsable | Criterio de done |
|---|---|---|
| `npx create-next-app@latest` con TypeScript + Tailwind | Frontend | Proyecto arranca sin errores |
| `npx shadcn@latest init` — configurar tema Vercel | Frontend | `components.json` configurado; `globals.css` con design tokens |
| Configurar paleta de colores en `tailwind.config.ts` | Frontend | Todos los tokens de `design.md` disponibles como clases |
| Instalar Geist vía `next/font` | Frontend | Fuente aplicada en `layout.tsx` |
| Configurar clases de sombra (`.card-border`, `.card-elevated`) en `globals.css` | Frontend | Clases disponibles globalmente |
| Configurar `lib/api.ts` con interceptors JWT | Frontend | Interceptor detecta 401 y redirige |
| Configurar Zustand stores (auth, schedule, notification) | Frontend | Stores tipados, `persist` en auth |
| Estructura de carpetas completa (vacía) | Frontend | Árbol de carpetas creado |
| ESLint + Prettier + Vitest configurados | Frontend | `npm run lint` y `npm test` sin errores |
| `RoleGuard` y layout `(app)` con shell SPA | Frontend | Navegación entre rutas sin recarga |

---

### Fase 1 — Autenticación y CRUD Base (Semanas 2–3)

**Objetivo:** Login funcional + gestión completa de las 4 entidades académicas.

| Tarea | RF | Criterio de done |
|---|---|---|
| Página `/login` con formulario Zod | RF-18 | Login exitoso guarda JWT; 401 muestra toast de error |
| `RoleGuard` protege rutas `(app)` | RF-18 | Acceso directo a ruta protegida → redirect `/login` |
| Interceptor 401/403 en `api.ts` | RF-18 | JWT expirado → logout automático; 403 → toast |
| `DataTable` + `StudentForm` — CRUD Estudiantes | RF-01 | Create/Edit/Delete + toast; tabla se actualiza sin recarga |
| `DataTable` + `TeacherForm` — CRUD Docentes | RF-02 | Ídem; validación unicidad de código |
| `DataTable` + `CourseForm` — CRUD Cursos | RF-03 | Selector prerrequisitos multi-select; validación de referencia inválida |
| `DataTable` + `ClassroomForm` — CRUD Aulas | RF-04 | Capacidad > 0 validada; tipos de aula |
| `AvailabilityGrid` — Disponibilidad Docente | RF-06 | Grid 5×N con toggle; guardado persiste |
| `LoadingSkeleton` en todos los DataTable | RNF | Sin layout shift durante carga |
| Pruebas unitarias: schemas Zod de las 4 entidades | RNF | Cobertura ≥ 70% en validadores |

---

### Fase 2 — Horario Docente (Semanas 4–5)

**Objetivo:** Coordinador puede generar, construir y confirmar el horario docente.

| Tarea | RF | Criterio de done |
|---|---|---|
| `WeeklyGrid` (read-only) — visualización básica | RF-16 | Grilla 5 días × franjas; cada bloque muestra curso, sección, docente, aula |
| Página `/coordinator/schedule/generate` | RF-07 | Botón genera; polling/SSE para progreso; skeleton durante ≤30 s |
| Resultado de generación cargado en store | RF-07 | Asignaciones en `schedule.store`; sin recarga de página |
| `WeeklyGrid` (editable) — constructor de horario | RF-10 | Selección de ranura abre panel de asignación |
| `useConflictDetector` — validación ≤ 1 s | RF-08/10 | Al seleccionar combo inválido: `ConflictBadge` visible en < 1 s |
| Panel de opciones compatibles | RF-10 | Docentes/aulas/franjas filtrados dinámicamente por disponibilidad |
| Página `/coordinator/schedule/confirm` | RF-11 | `ConfirmDialog` → confirma → estado "confirmado" en store + API |
| Toast de conflictos descriptivo | RF-15 | Mensaje incluye tipo + recurso + franja — nunca genérico |
| Pruebas unitarias: `overlap.ts` | RNF | Cobertura ≥ 70%; casos de borde: franja contigua, solapamiento parcial |

---

### Fase 3 — Horario del Estudiante (Semanas 6–7)

**Objetivo:** Estudiante puede generar y construir su horario con validación en tiempo real.

| Tarea | RF | Criterio de done |
|---|---|---|
| Selector de cursos disponibles (con filtro de prerrequisitos) | RF-05/12 | Solo muestra cursos con prerrequisitos cumplidos y vacantes > 0 |
| Página `/student/schedule/generate` | RF-12 | Genera en ≤ 5 s; propuesta en WeeklyGrid preview |
| `useScheduleValidation` — validación completa en tiempo real | RF-14 | Los 4 tipos de restricción validan en ≤ 1 s tras cada acción |
| Indicador de créditos acumulados | RF-13/14 | Badge "X / 22 créditos" actualizado en cada agregado/retiro |
| Agregar/retirar curso sin recarga | RF-13 | Grilla actualiza inmediatamente; rollback si API falla |
| Mensajes de error específicos por tipo de restricción | RF-15 | Cada tipo tiene su propio mensaje con detalle del conflicto |
| Página `/student/my-schedule` — horario confirmado | RF-16 | WeeklyGrid read-only; carga en ≤ 3 s |
| Pruebas unitarias: `credits.ts` + `prerequisites.ts` | RNF | Cobertura ≥ 70% |

---

### Fase 4 — Exportación, Pulido y Accesibilidad (Semana 8)

**Objetivo:** RF-17 funcional, WCAG 2.1 AA verificado, compatibilidad cross-browser.

| Tarea | RF/RNF | Criterio de done |
|---|---|---|
| `ExportButton` con importación dinámica (`next/dynamic`) | RF-17 | Módulos jsPDF/xlsx no en bundle inicial |
| Exportar a PDF — horario docente y estudiante | RF-17 | PDF con todos los campos requeridos generado en ≤ 5 s |
| Exportar a Excel | RF-17 | Hoja con estructura correcta; descarga automática |
| Auditoría Lighthouse / axe en nav + formularios + WeeklyGrid | RNF WCAG | Score accesibilidad ≥ 90; cero violaciones críticas AA |
| Prueba cross-browser: Chrome + Firefox + Edge | RNF | Sin errores de renderizado ni funcionalidad en los 3 navegadores |
| Responsive final: WeeklyGrid en mobile | RNF | Scroll horizontal; touch targets ≥ 44px |
| Prueba de rendimiento: todas las operaciones ≤ 3 s | RNF | Medición con DevTools Network throttling "Fast 3G" |
| Review de seguridad: XSS, CSRF, exposición de datos | RNF OWASP | Checklist OWASP sin hallazgos críticos |

---

### Fase 5 — Integración, Testing Final y Entrega (Semana 9)

**Objetivo:** Sistema integrado con el backend, pruebas de integración pasando, documentación lista.

| Tarea | Criterio de done |
|---|---|
| Integración completa con API REST del backend | Todos los módulos consumen endpoints reales |
| Prueba de concurrencia UI: RF-09 | Dos pestañas intentan asignar mismo recurso → una falla con mensaje correcto |
| Suite de pruebas de integración: auth + schedule builder | Cobertura ≥ 70% en flujos críticos |
| Variables de entorno documentadas (`.env.example`) | `NEXT_PUBLIC_API_URL` y demás variables documentadas |
| Build de producción sin errores ni warnings | `next build` exitoso; `next start` funcional |
| Dockerfile frontend listo para `docker-compose` | Imagen construye y sirve en puerto correcto |
| README frontend con instrucciones de setup | `npm install` + `npm run dev` documentados |

---

## 11. Criterios de Aceptación Técnicos

Cada feature se considera **done** cuando cumple **todos** los siguientes criterios:

### Funcional

- [ ] Implementa 100% del comportamiento descrito en el RF correspondiente
- [ ] Validaciones inline con mensajes descriptivos (nunca error genérico)
- [ ] Toast de éxito y error en cada operación persistente
- [ ] Sin recargas de página completa en ningún flujo (SPA estricta)
- [ ] Estado de carga visible (spinner o skeleton) en toda operación asíncrona

### UX / Diseño

- [ ] Paleta y tokens del `design.md` aplicados correctamente
- [ ] Tipografía Geist con letter-spacing según jerarquía definida
- [ ] Shadow-as-border en containers (no `border` tradicional en cards principales)
- [ ] Spacing base 8px; saltos desde 16px a 32px sin 20px/24px intermedios
- [ ] Radius correcto por contexto (6px botón, 8px card, 12px featured, full pill)
- [ ] Animaciones/transiciones 150–300 ms en micro-interacciones

### Rendimiento

- [ ] Operaciones generales: respuesta ≤ 3 s (P95)
- [ ] Validaciones en tiempo real: ≤ 1 s
- [ ] Bundle inicial: librerías pesadas cargadas con `next/dynamic`
- [ ] Sin layout shift (CLS < 0.1) gracias a skeletons con dimensiones reservadas

### Accesibilidad

- [ ] Contraste ≥ 4.5:1 en texto normal
- [ ] Focus ring visible en todos los elementos interactivos
- [ ] `aria-label` en botones de solo ícono
- [ ] Formularios con `label` asociado y `aria-describedby` en errores
- [ ] Navegación por teclado completa en módulos de nav, formularios y WeeklyGrid

### Seguridad

- [ ] No `dangerouslySetInnerHTML` sin sanitización
- [ ] JWT en cookie `httpOnly; Secure; SameSite=Strict`
- [ ] Mensajes de error sin información técnica interna
- [ ] `RoleGuard` en todas las rutas protegidas

### Testing

- [ ] Cobertura ≥ 70% en módulos de validación: `overlap.ts`, `credits.ts`, `prerequisites.ts`, auth
- [ ] Pruebas pasan en CI sin errores

---

## 12. Configuración Inicial del Proyecto

### Comandos de setup

```bash
# 1. Crear proyecto Next.js
npx create-next-app@latest planner-uc-frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd planner-uc-frontend

# 2. Inicializar shadcn/ui
npx shadcn@latest init
# Seleccionar: Default style, zinc base color, CSS variables = yes

# 3. Instalar componentes shadcn necesarios
npx shadcn@latest add button input label form select dialog sheet alert-dialog table badge toast card separator

# 4. Dependencias adicionales
npm install zustand swr axios zod react-hook-form @hookform/resolvers
npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom

# 5. Exportación (lazy)
npm install jspdf jspdf-autotable xlsx

# 6. Fuentes Geist (si no están incluidas en next/font/google)
npm install geist
```

### `next.config.ts` mínimo

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Seguridad: headers HTTP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
```

### `components.json` — shadcn/ui

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Variables de entorno — `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Planner UC
# JWT_SECRET nunca va al frontend
```

---

## Resumen de RFs cubiertos por el frontend

| RF | Módulo / Componente frontend |
|---|---|
| RF-01 | `/admin/students` + `StudentForm` + `DataTable` |
| RF-02 | `/admin/teachers` + `TeacherForm` + `DataTable` |
| RF-03 | `/admin/courses` + `CourseForm` (selector prerrequisitos) |
| RF-04 | `/admin/classrooms` + `ClassroomForm` |
| RF-05 | `useScheduleValidation` — validación de prerrequisitos |
| RF-06 | `AvailabilityGrid` — `/admin/teachers` |
| RF-07 | `/coordinator/schedule/generate` — polling / SSE |
| RF-08 | `useConflictDetector` — validación solapamientos |
| RF-09 | Interceptor 409 + toast de conflicto de recurso |
| RF-10 | `WeeklyGrid` editable + panel de opciones compatibles |
| RF-11 | `/coordinator/schedule/confirm` + `ConfirmDialog` |
| RF-12 | `/student/schedule/generate` |
| RF-13 | `/student/schedule/builder` + `useScheduleValidation` |
| RF-14 | `useScheduleValidation` — 4 tipos de restricción ≤ 1 s |
| RF-15 | Toast descriptivo + `ConflictBadge` + `notification.store` |
| RF-16 | `WeeklyGrid` (read-only) — `/schedules/view`, `/student/my-schedule` |
| RF-17 | `ExportButton` + `useExport` (jsPDF + xlsx) |
| RF-18 | `/login` + `RoleGuard` + interceptors JWT |
