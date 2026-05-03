# Especificación y Enfoque de Desarrollo - Planner UC
---

## Tabla de Contenidos

1. [Para qué sirve este documento](#para-qué-sirve-este-documento)
2. [Cómo se especifican los casos de uso](#cómo-se-especifican-los-casos-de-uso)
3. [Reglas para agentes de IA](#reglas-para-agentes-de-ia)
4. [Estructura de especificaciones](#estructura-de-especificaciones)
5. [Flujo de trabajo obligatorio](#flujo-de-trabajo-obligatorio)
6. [Criterios de validación](#criterios-de-validación)
7. [Aplicación por capa](#aplicación-por-capa)
8. [Plantillas](#plantillas)
9. [Especificaciones activas](#especificaciones-activas)

---

## Para qué sirve este documento

Este documento define **cómo el equipo especifica los casos de uso** en el proyecto Planner UC mediante un enfoque estructurado que garantiza claridad en los criterios de validación.

**Enfoque del equipo:**

El equipo especifica los casos de uso mediante **especificaciones formales** que sirven como soporte conceptual antes de implementar. Cada caso de uso se documenta en `.kiro/specs/{feature-name}/` con tres componentes:

1. **requirements.md** - Define QUÉ debe hacer el sistema (requisitos funcionales, no funcionales, criterios de aceptación)
2. **design.md** - Define CÓMO lo va a hacer técnicamente (arquitectura, modelo de datos, APIs)
3. **tasks.md** - Define el plan de implementación paso a paso

**Garantía de claridad en criterios de validación:**

Cada especificación incluye criterios de validación verificables:
- **Criterios de aceptación** con checkboxes verificables
- **Propiedades de corrección** que el sistema debe mantener siempre
- **Estrategia de validación** con pruebas específicas por capa
- **Checklists de completitud** antes, durante y después de implementar

**Regla principal para agentes de IA:** Ningún agente puede escribir código de una funcionalidad nueva sin antes crear o leer su especificación en `.kiro/specs/{feature-name}/`.

**Capas del sistema:**
- **Frontend:** Next.js + React + TypeScript
- **Backend:** Java + Spring Boot + Arquitectura Hexagonal
- **Base de datos:** PostgreSQL + PL/pgSQL
- **Solver CSP:** FastAPI + Python (solo diseño, no implementado)

---

## Cómo se especifican los casos de uso

El equipo especifica cada caso de uso mediante un proceso estructurado que garantiza claridad y validación sistemática.

### Proceso de especificación

#### 1. Identificación del caso de uso

Antes de especificar, se identifica:
- **Tipo:** ¿Es una funcionalidad nueva (Feature) o corrección de bug (Bugfix)?
- **Alcance:** ¿Qué capas del sistema afecta? (Frontend, Backend, Base de datos)
- **Prioridad:** ¿Es crítico, importante u opcional?
- **Dependencias:** ¿Qué otros casos de uso o módulos requiere?

#### 2. Definición de requisitos (requirements.md)

Se documenta **QUÉ** debe hacer el sistema:

**Requisitos funcionales:**
- Capacidades específicas que el sistema debe proveer
- Cada requisito tiene criterios de aceptación verificables
- Formato: "El sistema debe permitir [acción] para [usuario] con [condiciones]"

**Ejemplo:**
```markdown
### RF-1: Crear horario académico
**Descripción:** El sistema debe permitir a un administrador crear un nuevo 
horario académico para un período académico específico.

**Criterios de aceptación:**
- [ ] El horario se crea con nombre, período académico y estado inicial "borrador"
- [ ] El sistema valida que el período académico existe
- [ ] El sistema genera un UUID único para el horario
- [ ] El horario se persiste en la base de datos
- [ ] El sistema retorna el ID del horario creado
```

**Requisitos no funcionales:**
- Rendimiento, seguridad, usabilidad, escalabilidad
- Cada requisito tiene métrica y criterio medible
- Formato: "[Categoría]: El sistema debe [característica] medido por [métrica] con criterio [valor]"

**Ejemplo:**
```markdown
### RNF-1: Tiempo de respuesta
**Categoría:** Rendimiento
**Descripción:** La creación de un horario debe ser rápida
**Métrica:** Tiempo de respuesta del endpoint POST /api/schedules
**Criterio:** < 200ms en el percentil 95
```

**Propiedades de corrección:**
- Invariantes que el sistema SIEMPRE debe cumplir
- Se expresan como condiciones lógicas verificables
- Se validan mediante Property-Based Testing o constraints de BD

**Ejemplo:**
```markdown
### Propiedad 1: Unicidad de nombre por período
**Descripción:** No pueden existir dos horarios con el mismo nombre 
en el mismo período académico.

**Expresión formal:** 
∀ h1, h2 ∈ Horarios: 
  (h1.nombre == h2.nombre ∧ h1.periodo_id == h2.periodo_id) → h1.id == h2.id

**Validación:** 
- Constraint UNIQUE en BD: (academic_period_id, name)
- Prueba unitaria que intenta crear duplicados
```

#### 3. Diseño técnico (design.md)

Se documenta **CÓMO** el sistema va a implementar los requisitos:

**Arquitectura de alto nivel:**
- Componentes involucrados (qué módulos se crean o modifican)
- Flujo de datos (cómo viaja la información entre capas)
- Integraciones (qué sistemas externos se conectan)

**Diseño de bajo nivel:**
- **Base de datos:** Tablas, funciones PL/pgSQL, índices, constraints
- **Backend - Dominio:** Entidades, puertos (interfaces), reglas de negocio
- **Backend - Aplicación:** Casos de uso, DTOs, lógica de orquestación
- **Backend - Infraestructura:** Repositorios, controllers, configuración
- **Frontend:** Tipos TypeScript, componentes React, páginas, validaciones

**Estrategia de validación:**
- Qué se prueba a nivel unitario
- Qué se prueba a nivel de integración
- Qué propiedades se verifican con PBT
- Qué flujos se prueban end-to-end

#### 4. Plan de implementación (tasks.md)

Se documenta el **plan de ejecución** paso a paso:

**Estructura de tareas:**
- Organizadas por fases (Base de datos → Backend → Frontend → Validación)
- Ordenadas por dependencias (no se puede hacer B sin A)
- Marcadas como requeridas `- [ ]` u opcionales `- [ ]*`
- Con criterios de completitud claros

**Ejemplo:**
```markdown
### Fase 1: Base de Datos
- [ ] 1.1 Crear tabla `schedules` en `database/schema.sql`
- [ ] 1.2 Crear función `create_schedule()` en `database/functions/`
- [ ] 1.3 Crear índice en `academic_period_id`
- [ ] 1.4 Crear constraint UNIQUE en (academic_period_id, name)

### Fase 2: Backend - Dominio
- [ ] 2.1 Crear entidad `Schedule` en `domain/model/Schedule.java`
- [ ] 2.2 Definir puerto `CreateScheduleUseCase` en `domain/port/in/`
- [ ] 2.3 Definir puerto `ScheduleRepository` en `domain/port/out/`
```

### Garantía de claridad en criterios de validación

El equipo garantiza claridad mediante:

#### 1. Criterios de aceptación verificables

Cada requisito funcional tiene criterios que se pueden verificar con un SÍ o NO:

✅ **Bueno:** "El sistema retorna HTTP 201 con el ID del horario creado"  
❌ **Malo:** "El sistema funciona correctamente"

✅ **Bueno:** "El endpoint responde en < 200ms en el percentil 95"  
❌ **Malo:** "El sistema es rápido"

#### 2. Propiedades de corrección formales

Las propiedades se expresan como condiciones lógicas que se pueden programar:

```markdown
Propiedad: "Un profesor no puede estar en dos lugares al mismo tiempo"

Expresión formal:
∀ horario H, ∀ profesor P, ∀ bloques B1, B2 ∈ H:
  (B1.profesor == P ∧ B2.profesor == P ∧ B1.dia == B2.dia) 
  → B1.hora_inicio ≠ B2.hora_inicio

Validación:
- Property-Based Testing: Generar 1000 horarios aleatorios y verificar
- Constraint en BD: Trigger que valida antes de INSERT
- Prueba unitaria: Intentar asignar profesor a bloques solapados
```

#### 3. Estrategia de validación por capa

Cada capa tiene criterios específicos de validación:

| Capa | Qué se valida | Cómo se valida |
|------|---------------|----------------|
| **Base de datos** | Funciones ejecutan correctamente, constraints se respetan | Pruebas de funciones PL/pgSQL, pruebas de integración |
| **Backend - Dominio** | Reglas de negocio se cumplen, entidades son válidas | Pruebas unitarias con JUnit |
| **Backend - Aplicación** | Casos de uso ejecutan correctamente | Pruebas unitarias con mocks |
| **Backend - Infraestructura** | APIs responden según contrato, BD se actualiza | Pruebas de integración con RestAssured |
| **Frontend** | Componentes renderizan, formularios validan | React Testing Library, Playwright |

#### 4. Checklists de completitud

Antes de marcar un caso de uso como completado, se verifica:

**Checklist de implementación:**
- [ ] Todas las tareas requeridas están completadas
- [ ] Todas las pruebas pasan (unitarias + integración + E2E)
- [ ] Todos los criterios de aceptación se cumplen
- [ ] Todas las propiedades de corrección se mantienen
- [ ] No hay regresiones en funcionalidad existente
- [ ] La documentación está actualizada

### Ejemplo completo: Caso de uso "Crear Horario"

**Ubicación:** `.kiro/specs/create-schedule/`

**requirements.md:**
- RF-1: Crear horario con nombre, período y estado
- RF-2: Validar que el período académico existe
- RNF-1: Tiempo de respuesta < 200ms
- Propiedad 1: Unicidad de nombre por período
- Criterios de aceptación: 5 criterios verificables

**design.md:**
- Tabla `schedules` con campos y constraints
- Función PL/pgSQL `create_schedule()`
- Entidad de dominio `Schedule`
- Caso de uso `CreateScheduleService`
- Controller `POST /api/schedules`
- Componente React `ScheduleForm`
- Estrategia de validación: 4 niveles de pruebas

**tasks.md:**
- 7 fases con 25 tareas
- Orden: BD → Dominio → Aplicación → Infraestructura → Frontend → Validación → Docs
- Cada tarea con criterio de completitud

**Resultado:** Caso de uso completamente especificado con criterios claros de validación antes de escribir una sola línea de código.

---

## Reglas para agentes de IA

### Regla 1: Lee antes de escribir código

Antes de implementar cualquier funcionalidad:

1. **Busca si existe un spec:** Revisa `.kiro/specs/{feature-name}/`
2. **Si existe:** Lee `requirements.md`, `design.md` y `tasks.md` completos
3. **Si no existe:** Crea el spec primero siguiendo las plantillas de este documento
4. **Nunca asumas:** Si no hay spec, no inventes la solución

### Regla 2: Sigue el orden de implementación

**Orden obligatorio por capa:**

```
1. Base de datos (schema.sql + funciones PL/pgSQL)
2. Backend - Dominio (entidades + puertos)
3. Backend - Aplicación (casos de uso + DTOs)
4. Backend - Infraestructura (repositorios + controllers)
5. Frontend (tipos + componentes + páginas)
6. Pruebas (unitarias + integración + E2E)
```

**Nunca implementes frontend sin backend. Nunca implementes backend sin base de datos.**

### Regla 3: Valida lo que implementas

Después de escribir código:

1. **Ejecuta las pruebas** correspondientes a la capa
2. **Verifica los criterios de aceptación** del spec
3. **Comprueba que no rompiste nada** (regresiones)
4. **Actualiza el spec** si cambiaste algo del diseño

### Regla 4: Respeta las reglas de arquitectura

**Backend:**
- Arquitectura hexagonal: `infrastructure -> application -> domain`
- Dominio NO depende de infrastructure ni frameworks
- Controllers NO acceden directo a repositorios
- Usa funciones PL/pgSQL para operaciones de BD (excepto módulo `auth`)

**Frontend:**
- Única instancia Axios en `frontend/lib/api.ts`
- Sesión en cookies del backend, NO en Zustand
- Stores Zustand solo para estado simple
- Respeta App Router de Next.js

**Base de datos:**
- `hibernate.ddl-auto=none` - NO modificar esquema desde ORM
- Todo DDL en `database/`
- Lógica de negocio en funciones PL/pgSQL, NO en Java

**Referencias:** Ver `AGENTS.md` raíz, `backend/AGENTS.md`, `frontend/AGENTS.md`

---

## Estructura de especificaciones

**Ubicación:** `.kiro/specs/{feature-name}/`

**Archivos obligatorios:**

```
.kiro/specs/
└── {feature-name}/
    ├── .config.kiro       # Configuración (tipo: feature/bugfix, workflow)
    ├── requirements.md    # QUÉ debe hacer el sistema
    ├── design.md         # CÓMO lo va a hacer técnicamente
    └── tasks.md          # Plan de implementación paso a paso
```

**Tipos de spec:**

| Tipo | Cuándo usarlo | Ejemplo |
|------|---------------|---------|
| **Feature** | Funcionalidad nueva que no existe | Generación de horarios, gestión de restricciones |
| **Bugfix** | Algo está roto o funciona mal | Corrección de conflictos, validación incorrecta |

**Workflows disponibles:**

- **Requirements-First:** Requisitos → Diseño → Tareas (cuando sabes QUÉ pero no CÓMO)
- **Design-First:** Diseño → Requisitos → Tareas (cuando sabes CÓMO pero necesitas formalizar QUÉ)

---

## Flujo de trabajo obligatorio

### Cuando te piden implementar una funcionalidad nueva

**Paso 1: Verifica si existe el spec**

```bash
# Busca en .kiro/specs/{nombre-funcionalidad}/
ls .kiro/specs/
```

**Paso 2a: Si NO existe el spec**

1. Crea la estructura de carpetas
2. Crea `requirements.md` usando la plantilla de este documento
3. Crea `design.md` usando la plantilla de este documento
4. Crea `tasks.md` usando la plantilla de este documento
5. **Espera aprobación del usuario antes de implementar**

**Paso 2b: Si SÍ existe el spec**

1. Lee `requirements.md` completo
2. Lee `design.md` completo
3. Lee `tasks.md` completo
4. Implementa siguiendo el orden de tareas

**Paso 3: Implementa siguiendo el orden de capas**

```
1. database/schema.sql          → Crea tablas
2. database/functions/          → Crea funciones PL/pgSQL
3. backend/.../domain/model/    → Crea entidades de dominio
4. backend/.../domain/port/     → Define puertos (interfaces)
5. backend/.../application/     → Implementa casos de uso
6. backend/.../infrastructure/  → Implementa adaptadores
7. frontend/types/              → Define tipos TypeScript
8. frontend/components/         → Crea componentes React
9. frontend/app/                → Crea páginas
```

**Paso 4: Valida cada capa**

```bash
# Base de datos
# (ejecuta pruebas de funciones PL/pgSQL si existen)

# Backend
cd backend/horarios_api
./gradlew test

# Frontend
cd frontend
pnpm test
```

**Paso 5: Marca tareas como completadas**

Actualiza `tasks.md` cambiando `- [ ]` a `- [x]` en las tareas terminadas.

### Cuando te piden corregir un bug

**Paso 1: Crea un bugfix spec**

1. Identifica la condición del bug (qué está fallando)
2. Crea `.kiro/specs/{bug-name}/requirements.md` describiendo:
   - Comportamiento actual (incorrecto)
   - Comportamiento esperado (correcto)
   - Pasos para reproducir
   - Condición que debe cumplirse para considerar el bug resuelto

**Paso 2: Diseña la solución**

Crea `design.md` explicando:
- Dónde está el problema (qué capa, qué archivo)
- Qué hay que cambiar
- Cómo validar que se corrigió

**Paso 3: Implementa y valida**

1. Escribe una prueba que falle (reproduce el bug)
2. Corrige el código
3. Verifica que la prueba pasa
4. Verifica que no rompiste nada más

---

## Criterios de validación

### Checklist antes de implementar

Antes de escribir código, verifica:

- [ ] Existe `requirements.md` con requisitos claros
- [ ] Existe `design.md` con diseño técnico completo
- [ ] Existe `tasks.md` con plan de implementación
- [ ] Entiendes qué capas vas a tocar
- [ ] Leíste el `AGENTS.md` de cada capa afectada

### Checklist durante la implementación

Mientras escribes código:

- [ ] Sigues el orden de tareas de `tasks.md`
- [ ] Respetas la arquitectura hexagonal (backend)
- [ ] No modificas esquema desde ORM (`hibernate.ddl-auto=none`)
- [ ] Usas funciones PL/pgSQL para operaciones de BD
- [ ] No hardcodeas secrets ni URLs
- [ ] Escribes pruebas para lo que implementas

### Checklist al terminar

Antes de marcar como completado:

- [ ] Todas las pruebas pasan
- [ ] No hay regresiones (no rompiste nada existente)
- [ ] Los criterios de aceptación del spec se cumplen
- [ ] Actualizaste `tasks.md` marcando tareas completadas
- [ ] Documentaste decisiones importantes si las hubo

### Property-Based Testing (PBT)

**Cuándo usar PBT:**
- Lógica compleja del solver CSP
- Validación de restricciones académicas
- Algoritmos de asignación
- Detección de conflictos

**Ejemplo de propiedad:**

```
Propiedad: "No hay conflictos de horario para un profesor"

Para todo horario generado:
  Para todo profesor P:
    Para todo par de bloques (B1, B2) asignados a P:
      Si B1.dia == B2.dia:
        Entonces B1.hora_inicio != B2.hora_inicio
```

**Herramientas:**
- Backend Java: jqwik o QuickTheories
- Solver Python: Hypothesis
- Frontend: fast-check (si aplica)

---

## Aplicación por capa

### Frontend (Next.js + React + TypeScript)

**Qué especificar:**
- Componentes de UI y su comportamiento
- Validación de formularios (esquemas Zod)
- Flujos de usuario (navegación, estados)
- Integración con APIs del backend

**Qué validar:**
- Componentes renderizan correctamente
- Formularios validan datos antes de enviar
- Estado se mantiene consistente
- Accesibilidad básica (WCAG)

**Herramientas:**
- Jest + React Testing Library (pruebas unitarias)
- Playwright (pruebas E2E)
- Zod (validación de esquemas)

**Comandos:**
```bash
cd frontend
pnpm test              # Ejecuta pruebas
pnpm test:coverage     # Cobertura
pnpm lint              # Linter
```

**Reglas críticas:**
- Lee `frontend/AGENTS.md` antes de tocar frontend
- Única instancia Axios en `frontend/lib/api.ts`
- No uses `any`, usa `unknown` o tipos explícitos
- Sesión en cookies del backend, NO en Zustand

### Backend (Java + Spring Boot + Arquitectura Hexagonal)

**Qué especificar:**
- Casos de uso y lógica de negocio
- Endpoints REST y sus contratos
- Modelo de dominio y reglas de negocio
- Integración con base de datos

**Qué validar:**
- Casos de uso ejecutan correctamente
- APIs responden según contrato
- Reglas de negocio se cumplen
- Transacciones funcionan correctamente

**Herramientas:**
- JUnit 5 + Mockito (pruebas unitarias)
- Spring Boot Test (pruebas de integración)
- RestAssured (pruebas de API)
- JaCoCo (cobertura)

**Comandos:**
```bash
cd backend/horarios_api
./gradlew test                    # Ejecuta pruebas
./gradlew test jacocoTestReport   # Cobertura
./gradlew bootRun                 # Ejecuta app
```

**Arquitectura obligatoria:**
```
infrastructure -> application -> domain

domain/
  ├── model/        # Entidades de dominio
  └── port/
      ├── in/       # Interfaces de entrada (casos de uso)
      └── out/      # Interfaces de salida (repositorios)

application/
  ├── usecase/      # Implementación de casos de uso
  └── dto/          # Objetos de transferencia

infrastructure/
  ├── in/web/       # Controllers REST
  ├── out/
  │   ├── persistence/  # Repositorios
  │   └── security/     # Seguridad
  └── config/       # Configuración Spring
```

**Reglas críticas:**
- Lee `backend/AGENTS.md` antes de tocar backend
- Dominio NO depende de infrastructure
- Controllers NO acceden directo a repositorios
- Usa funciones PL/pgSQL para operaciones de BD (excepto `auth`)
- `hibernate.ddl-auto=none` siempre

### Base de Datos (PostgreSQL + PL/pgSQL)

**Qué especificar:**
- Esquema de tablas y relaciones
- Funciones PL/pgSQL para lógica de negocio
- Índices necesarios para rendimiento
- Constraints de integridad

**Qué validar:**
- Funciones ejecutan correctamente
- Constraints se respetan
- Queries tienen buen rendimiento
- Integridad referencial se mantiene

**Herramientas:**
- pgTAP (pruebas de BD)
- EXPLAIN ANALYZE (análisis de rendimiento)
- Pruebas de integración desde backend

**Ubicación:**
```
database/
  ├── schema.sql       # DDL: CREATE TABLE, ALTER TABLE
  ├── functions/       # Funciones PL/pgSQL
  ├── migrations/      # Cambios de esquema
  └── triggers/        # Triggers si son necesarios
```

**Reglas críticas:**
- TODO cambio de esquema va en `database/`
- NO modificar esquema desde ORM
- Lógica de negocio en funciones PL/pgSQL, NO en Java
- Usa `TIMESTAMPTZ` para fechas
- Usa `UUID` con `gen_random_uuid()`
- Declara índices explícitos para FKs y búsquedas frecuentes

### Solver CSP (FastAPI + Python - en diseño)

**Estado actual:** Solo existe diseño en `docs/Planificación/Diseno_Microservicio_Solver_CSP.md`

**NO implementado aún. No generes código que asuma que existe.**

**Cuando se implemente, especificar:**
- Algoritmos de resolución de restricciones
- Modelado de problemas CSP
- APIs de generación de horarios
- Optimización y heurísticas

**Herramientas futuras:**
- pytest + Hypothesis (PBT en Python)
- Pruebas de rendimiento
- Validación de restricciones

---

## Plantillas

### Plantilla: requirements.md

```markdown
# Requisitos: {Nombre de la Funcionalidad}

## Descripción General
[Qué se va a construir y por qué es necesario]

## Contexto
[Problema que resuelve, usuarios afectados, situación actual]

## Requisitos Funcionales

### RF-1: [Nombre del requisito]
**Descripción:** [Qué debe hacer el sistema]

**Criterios de aceptación:**
- [ ] [Criterio verificable 1]
- [ ] [Criterio verificable 2]
- [ ] [Criterio verificable 3]

### RF-2: [Siguiente requisito]
...

## Requisitos No Funcionales

### RNF-1: [Nombre]
**Categoría:** [Rendimiento | Seguridad | Usabilidad | Escalabilidad]  
**Descripción:** [Qué característica debe tener]  
**Métrica:** [Cómo se mide]  
**Criterio:** [Valor objetivo, ej: "< 200ms", "> 95% uptime"]

## Restricciones
- [Limitación técnica o de negocio 1]
- [Limitación técnica o de negocio 2]

## Propiedades de Corrección
[Invariantes que el sistema SIEMPRE debe cumplir]

### Propiedad 1: [Nombre]
**Descripción:** [Expresión lógica o descripción precisa]  
**Validación:** [Cómo se verifica: PBT, prueba unitaria, constraint de BD]

**Ejemplo:**
```
Propiedad: "Un profesor no puede estar en dos lugares al mismo tiempo"
Descripción: Para todo horario, para todo profesor P, 
             no existen dos bloques B1 y B2 donde:
             B1.profesor == P && B2.profesor == P && 
             B1.dia == B2.dia && B1.hora_inicio == B2.hora_inicio
Validación: Property-Based Testing en solver + constraint en BD
```

## Dependencias
- [Módulo o funcionalidad que debe existir antes]
- [Tabla o función de BD requerida]

## Fuera de Alcance
- [Qué NO se incluye en esta especificación]
```

### Plantilla: design.md

```markdown
# Diseño Técnico: {Nombre de la Funcionalidad}

## Arquitectura de Alto Nivel

### Componentes Involucrados
[Lista de módulos/capas que se van a modificar o crear]

**Ejemplo:**
- Frontend: Página de gestión de horarios
- Backend: Módulo `schedule` (casos de uso + dominio)
- Base de datos: Tablas `schedules`, `schedule_blocks`

### Flujo de Datos
[Diagrama o descripción de cómo fluye la información]

**Ejemplo:**
```
Usuario → Frontend (formulario) 
       → Backend API (/api/schedules POST)
       → Caso de uso CreateSchedule
       → Función PL/pgSQL create_schedule()
       → BD (INSERT en schedules)
       → Respuesta al usuario
```

## Diseño de Bajo Nivel

### Base de Datos

#### Tablas Nuevas
```sql
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_period_id UUID NOT NULL REFERENCES academic_periods(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedules_period ON schedules(academic_period_id);
```

#### Funciones PL/pgSQL
```sql
CREATE OR REPLACE FUNCTION create_schedule(
    p_academic_period_id UUID,
    p_name VARCHAR,
    p_status VARCHAR
) RETURNS UUID AS $$
DECLARE
    v_schedule_id UUID;
BEGIN
    INSERT INTO schedules (academic_period_id, name, status)
    VALUES (p_academic_period_id, p_name, p_status)
    RETURNING id INTO v_schedule_id;
    
    RETURN v_schedule_id;
END;
$$ LANGUAGE plpgsql;
```

### Backend - Dominio

#### Entidades
```java
// domain/model/Schedule.java
public class Schedule {
    private UUID id;
    private UUID academicPeriodId;
    private String name;
    private ScheduleStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    
    // Constructor, getters, validaciones de dominio
}
```

#### Puertos de Entrada
```java
// domain/port/in/CreateScheduleUseCase.java
public interface CreateScheduleUseCase {
    UUID createSchedule(CreateScheduleCommand command);
}
```

#### Puertos de Salida
```java
// domain/port/out/ScheduleRepository.java
public interface ScheduleRepository {
    UUID save(Schedule schedule);
    Optional<Schedule> findById(UUID id);
}
```

### Backend - Aplicación

#### Casos de Uso
```java
// application/usecase/CreateScheduleService.java
@Service
public class CreateScheduleService implements CreateScheduleUseCase {
    private final ScheduleRepository repository;
    
    @Override
    public UUID createSchedule(CreateScheduleCommand command) {
        // Lógica del caso de uso
    }
}
```

#### DTOs
```java
// application/dto/CreateScheduleCommand.java
public record CreateScheduleCommand(
    UUID academicPeriodId,
    String name,
    String status
) {}
```

### Backend - Infraestructura

#### Repositorios
```java
// infrastructure/out/persistence/ScheduleJdbcRepository.java
@Repository
public class ScheduleJdbcRepository implements ScheduleRepository {
    private final JdbcTemplate jdbcTemplate;
    
    @Override
    public UUID save(Schedule schedule) {
        // Llama a función PL/pgSQL create_schedule()
    }
}
```

#### Controllers
```java
// infrastructure/in/web/ScheduleController.java
@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {
    private final CreateScheduleUseCase createScheduleUseCase;
    
    @PostMapping
    public ResponseEntity<UUID> createSchedule(@RequestBody CreateScheduleRequest request) {
        // Llama al caso de uso
    }
}
```

### Frontend

#### Tipos TypeScript
```typescript
// frontend/types/schedule.ts
export interface Schedule {
  id: string;
  academicPeriodId: string;
  name: string;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleStatus = 'draft' | 'published' | 'archived';
```

#### Componentes
```typescript
// frontend/components/schedule/ScheduleForm.tsx
export function ScheduleForm() {
  // Formulario con validación Zod
}
```

#### Páginas
```typescript
// frontend/app/schedules/new/page.tsx
export default function NewSchedulePage() {
  // Página de creación de horario
}
```

## Estrategia de Validación

### Pruebas Unitarias
- **Backend:** Casos de uso con repositorios mockeados
- **Frontend:** Componentes con React Testing Library

### Pruebas de Integración
- **Backend:** Controllers + BD real (testcontainers)
- **Frontend:** Flujos completos con Playwright

### Property-Based Testing
[Si aplica, qué propiedades se van a verificar]

## Consideraciones

### Rendimiento
[Índices necesarios, caching, optimizaciones]

### Seguridad
[Validaciones, autorización, sanitización]

### Decisiones de Diseño
[Decisiones importantes y por qué se tomaron]
```

### Plantilla: tasks.md

```markdown
# Plan de Implementación: {Nombre de la Funcionalidad}

## Resumen
[Breve descripción del plan]

## Tareas

### Fase 1: Base de Datos
- [ ] 1.1 Crear tablas en `database/schema.sql`
- [ ] 1.2 Crear funciones PL/pgSQL en `database/functions/`
- [ ] 1.3 Crear índices necesarios
- [ ] 1.4 Escribir pruebas de funciones (si aplica)

### Fase 2: Backend - Dominio
- [ ] 2.1 Crear entidades en `domain/model/`
- [ ] 2.2 Definir puertos de entrada en `domain/port/in/`
- [ ] 2.3 Definir puertos de salida en `domain/port/out/`
- [ ] 2.4 Escribir pruebas unitarias de dominio

### Fase 3: Backend - Aplicación
- [ ] 3.1 Implementar casos de uso en `application/usecase/`
- [ ] 3.2 Crear DTOs en `application/dto/`
- [ ] 3.3 Escribir pruebas unitarias de casos de uso

### Fase 4: Backend - Infraestructura
- [ ] 4.1 Implementar repositorios en `infrastructure/out/persistence/`
- [ ] 4.2 Implementar controllers en `infrastructure/in/web/`
- [ ] 4.3 Configurar beans en `infrastructure/config/`
- [ ] 4.4 Escribir pruebas de integración

### Fase 5: Frontend
- [ ] 5.1 Crear tipos en `frontend/types/`
- [ ] 5.2 Implementar componentes en `frontend/components/`
- [ ] 5.3 Crear páginas en `frontend/app/`
- [ ] 5.4 Implementar stores Zustand (si es necesario)
- [ ] 5.5 Escribir pruebas de componentes

### Fase 6: Validación
- [ ] 6.1 Pruebas de integración backend-database
- [ ] 6.2 Pruebas de integración frontend-backend
- [ ] 6.3 Pruebas E2E de flujos completos
- [ ] 6.4 Validación de propiedades de corrección (PBT si aplica)
- [ ] 6.5 Verificación de criterios de aceptación

### Fase 7: Documentación
- [ ] 7.1 Actualizar documentación técnica
- [ ] 7.2 Documentar decisiones de diseño
- [ ] 7.3 Actualizar README si es necesario

## Tareas Opcionales
- [ ]* [Tarea opcional 1]
- [ ]* [Tarea opcional 2]

## Notas
[Notas importantes sobre la implementación]
```

---

## Especificaciones activas

Esta sección lista todas las especificaciones del proyecto.

**Ubicación:** `.kiro/specs/`

### En Desarrollo
[Ninguna actualmente]

### Completadas
[Ninguna actualmente]

### Planificadas
[Ninguna actualmente]

---

## Mantenimiento de este documento

**Actualiza este archivo cuando:**
- Cambien las reglas de arquitectura del proyecto
- Se agreguen nuevas herramientas de validación
- Se modifiquen las plantillas de especificación
- Se agreguen nuevas capas o módulos al sistema

**Responsable:** Equipo de desarrollo  
**Frecuencia:** Cuando sea necesario

---

## Referencias

- `AGENTS.md` (raíz) - Reglas globales del proyecto
- `backend/AGENTS.md` - Reglas específicas de backend
- `frontend/AGENTS.md` - Reglas específicas de frontend
- `docs/Revisiones/Revision_Arquitectura_Backend.md` - Decisiones de arquitectura
- `docs/Planificación/Diseno_Microservicio_Solver_CSP.md` - Diseño del solver
- `docs/Planificación/Requerimientos_Funcionales_y_No_Funcionales.md` - Requisitos del sistema
