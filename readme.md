<p align="center">
  <img src="https://img.shields.io/badge/Estado-En%20Desarrollo-yellow?style=for-the-badge" alt="Estado"/>
  <img src="https://img.shields.io/badge/Versi%C3%B3n-0.1.0-blue?style=for-the-badge" alt="Versión"/>
  <img src="https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge" alt="Licencia"/>
</p>

<h1 align="center">
  📅 Planner UC
</h1>

<p align="center">
  <strong>Sistema de Generación Óptima de Horarios Académicos</strong>
</p>

<p align="center">
  Sistema web inteligente que genera automáticamente horarios académicos óptimos<br/>
  considerando restricciones académicas, operativas y contextuales,<br/>
  mediante modelado de restricciones <strong>(CSP)</strong> y técnicas de optimización combinatoria.
</p>

---

## 📑 Tabla de Contenidos

- [📌 Descripción](#-descripción)
- [🛠 Tecnologías](#-tecnologías)
- [🧠 Motor de Generación de Horarios (CSP)](#-motor-de-generación-de-horarios-csp)
- [🏗 Arquitectura](#-arquitectura)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [⚙️ Instalación](#️-instalación)
- [▶️ Uso](#️-uso)
- [🔌 API](#-api)
- [👥 Equipo](#-equipo)
- [🤝 Contribución](#-contribución)
- [❓ FAQ](#-faq)
- [📚 Documentación del Proyecto](#-documentación-del-proyecto)
- [📄 Licencia](#-licencia)

---

## 📌 Descripción

**Planner UC** es un sistema web diseñado para estudiantes, docentes y coordinadores académicos que enfrentan dificultades en la planificación de horarios debido a múltiples restricciones y conflictos de disponibilidad.

### Problema que resuelve

La creación manual de horarios académicos es un proceso tedioso, propenso a errores y que consume una cantidad significativa de tiempo. Los conflictos de disponibilidad entre docentes, la capacidad de aulas, los prerrequisitos de cursos y las restricciones de créditos hacen que este proceso sea altamente complejo.

### Solución

Planner UC automatiza la generación de horarios mediante un **motor basado en Constraint Satisfaction Problem (CSP)**, garantizando:

- ✅ **Cero solapamientos** de docentes, aulas y estudiantes
- ✅ **Cumplimiento de prerrequisitos** académicos
- ✅ **Respeto de límites de créditos** (20-22 créditos por período)
- ✅ **Disponibilidad de docentes** según su registro
- ✅ **Capacidad de aulas** no excedida
- ✅ **Distribución equilibrada** de carga horaria

### Alcance del PMV

| Funcionalidad | Descripción |
|:---|:---|
| **Gestión CRUD** | Estudiantes, docentes, cursos y aulas |
| **Generación automática** | Asignación curso-docente-aula-franja sin conflictos |
| **Construcción manual** | Con validación en tiempo real |
| **Visualización** | Grilla semanal (días vs franjas) por estudiante, docente y general |
| **Exportación** | PDF y Excel |
| **Seguridad** | Autenticación con Google OAuth + JWT y control de acceso por roles |

### Roles del Sistema

| Rol | Permisos |
|:---|:---|
| **Administrador** | Gestión completa de entidades |
| **Coordinador Académico** | Generación y confirmación de horarios |
| **Docente** | Visualización de horario asignado |
| **Estudiante** | Selección de cursos y construcción de horario |

---

## 🛠 Tecnologías

<table align="center">
  <tr>
    <td align="center" width="140">
      <a href="https://nextjs.org/">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" width="50" height="50" alt="Next.js"/>
      </a>
      <br/><strong>Next.js</strong>
      <br/><sub>Frontend</sub>
    </td>
    <td align="center" width="140">
      <a href="https://spring.io/projects/spring-boot">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg" width="50" height="50" alt="Spring Boot"/>
      </a>
      <br/><strong>Spring Boot</strong>
      <br/><sub>Backend</sub>
    </td>
    <td align="center" width="140">
      <a href="https://fastapi.tiangolo.com/">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg" width="50" height="50" alt="FastAPI"/>
      </a>
      <br/><strong>FastAPI</strong>
      <br/><sub>Motor CSP</sub>
    </td>
    <td align="center" width="140">
      <a href="https://www.postgresql.org/">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" width="50" height="50" alt="PostgreSQL"/>
      </a>
      <br/><strong>PostgreSQL</strong>
      <br/><sub>Base de Datos</sub>
    </td>
    <td align="center" width="140">
      <a href="https://www.docker.com/">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" width="50" height="50" alt="Docker"/>
      </a>
      <br/><strong>Docker</strong>
      <br/><sub>Contenedores</sub>
    </td>
  </tr>
</table>

### Stack Detallado

| Capa | Tecnología | Descripción |
|:---|:---|:---|
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white) | SPA con React y SSR para el panel de gestión |
| **Backend** | ![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat-square&logo=springboot&logoColor=white) | API REST con arquitectura modular y escalable |
| **Motor CSP** | ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) | Microservicio Python para resolución de restricciones CSP |
| **Base de Datos** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) | BD relacional con soporte transaccional ACID |
| **Acceso a Datos** | ![JPA](https://img.shields.io/badge/Spring_Data_JPA-6DB33F?style=flat-square&logo=spring&logoColor=white) | Spring Data JPA + SQL nativo para máximo rendimiento |
| **Contenedores** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) | Orquestación con Docker Compose |
| **Autenticación** | ![Google](https://img.shields.io/badge/Google_OAuth-4285F4?style=flat-square&logo=google&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) | Login con Google OAuth2 + tokens JWT |
| **Testing** | ![JUnit](https://img.shields.io/badge/JUnit5-25A162?style=flat-square&logo=junit5&logoColor=white) ![pytest](https://img.shields.io/badge/pytest-0A9EDC?style=flat-square&logo=pytest&logoColor=white) | JUnit 5 (backend) + pytest (CSP service) — cobertura ≥ 70% |
| **Control de Versiones** | ![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white) | GitHub como repositorio central |

---

## 🧠 Motor de Generación de Horarios (CSP)

El corazón de Planner UC es su **motor de optimización basado en Constraint Satisfaction Problem (CSP)**, un problema clasificado como **NP-difícil**.

### Variables del Problema

```
┌──────────────────────────────────────────────────────────┐
│                    VARIABLES CSP                         │
├──────────────┬───────────────────────────────────────────┤
│  C (Cursos)  │ Asignaturas disponibles en el período     │
│  D (Docentes)│ Profesores asignables a cursos            │
│  E (Estudian)│ Usuarios que seleccionan cursos           │
│  A (Aulas)   │ Espacios físicos disponibles              │
│  H (Franjas) │ Bloques de tiempo semanales (mín. 2 hrs) │
└──────────────┴───────────────────────────────────────────┘
```

### Restricciones Hard (Obligatorias)

| # | Restricción | Descripción |
|:---:|:---|:---|
| 1 | **Sin solapamiento docente** | Un docente no puede estar en dos lugares al mismo tiempo |
| 2 | **Sin solapamiento de aula** | Un aula no puede tener dos cursos simultáneamente |
| 3 | **Sin solapamiento estudiantil** | Un estudiante no puede tener dos secciones al mismo tiempo |
| 4 | **Prerrequisitos académicos** | Se deben cumplir los prerrequisitos de cada curso |
| 5 | **Límite de créditos** | Máximo 20-22 créditos por período |
| 6 | **Disponibilidad docente** | Respetar la disponibilidad registrada |
| 7 | **Capacidad de aula** | No exceder la capacidad máxima del aula |

### Restricciones Soft (Optimización)

- 📊 Distribución coherente de carga a lo largo de la semana
- ⚖️ Equidad de carga horaria entre docentes

### Rendimiento Esperado

| Operación | Tiempo Máximo | Escenario |
|:---|:---:|:---|
| Generación horario docente | **≤ 30s** | ≤50 est., ≤20 doc., ≤30 cursos, ≤20 aulas |
| Generación horario estudiante | **≤ 5s** | Operación individual |
| Validaciones en tiempo real | **≤ 1s** | Construcción manual de horario |
| Operaciones CRUD | **≤ 3s** | Consulta, registro, edición, visualización |

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│                   Navegador Web                             │
│            (Chrome, Firefox, Edge)                          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Páginas    │  │  Componentes │  │   Estado Global  │   │
│  │  (SSR/CSR)  │  │     React    │  │                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (JSON)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Spring Boot)                      │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐  │
│  │Controllers│  │  Services │  │  Security │  │  DTOs   │  │
│  │ (Rutas)  │  │ (Lógica)  │  │(OAuth2+JWT)│ │(Valid.) │  │
│  └──────────┘  └───────────┘  └───────────┘  └─────────┘  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   📦 Capa de Datos                                   │   │
│  │   ┌─────────────────────┐   ┌───────────────────┐   │   │
│  │   │  Spring Data JPA    │   │  SQL Nativo       │   │   │
│  │   │  (entidades/auth)   │   │  (lógica negocio) │   │   │
│  │   └─────────────────────┘   └───────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────┬─────────────────────────┬────────────────────┘
               │ SQL / JPA               │ HTTP (REST interno)
               ▼                         ▼
                               ┌──────────────────────────┐
                               │  MICROSERVICIO CSP        │
                               │     (FastAPI / Python)    │
                               │  ┌──────────┐ ┌────────┐  │
                               │  │Variables │ │Solver  │  │
                               │  │(C,D,E,A,H)│ │Backtr. │  │
                               │  └──────────┘ └────────┘  │
                               │  Puerto: 8001              │
                               └──────────────┬────────────┘
                                              │
               ┌──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   BASE DE DATOS (PostgreSQL)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Estudiantes│ │ Docentes │  │  Cursos  │  │  Aulas   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Horarios │  │ Franjas  │  │  Roles   │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘

        Todo orquestado con 🐳 Docker Compose
```

### Componentes Principales

| Componente | Tecnología | Puerto | Descripción |
|:---|:---|:---:|:---|
| **Frontend** | Next.js | `3000` | Interfaz de usuario SPA/SSR |
| **Backend** | Spring Boot | `8080` | API REST principal + autenticación |
| **Motor CSP** | FastAPI (Python) | `8001` | Microservicio de generación de horarios |
| **Base de Datos** | PostgreSQL | `5432` | Persistencia de datos |

---

## 📁 Estructura del Proyecto

```
planner-uc/
├── 📄 docker-compose.yml          # Orquestación desarrollo
├── 📄 docker-compose.prod.yml     # Orquestación producción
├── 📄 .env.example                # Variables de entorno
├── 📄 readme.md
│
├── 📂 frontend/                   # Aplicación Next.js
│   ├── 📄 .env.example
│   ├── 📂 src/
│   │   ├── 📂 app/                # App Router (páginas)
│   │   ├── 📂 components/         # Componentes React
│   │   ├── 📂 lib/                # Utilidades y helpers
│   │   └── 📂 services/           # Llamadas a la API
│   └── 📄 package.json
│
├── 📂 backend/                    # Aplicación Spring Boot
│   ├── 📄 .env.example
│   ├── 📄 pom.xml
│   └── 📂 src/main/java/
│       └── 📂 com/planneruc/
│           ├── 📂 auth/           # Google OAuth2 + JWT
│           ├── 📂 students/       # Gestión estudiantes
│           ├── 📂 teachers/       # Gestión docentes
│           ├── 📂 courses/        # Gestión cursos
│           ├── 📂 classrooms/     # Gestión aulas
│           ├── 📂 schedules/      # Orquestación de horarios
│           └── 📂 common/         # Filtros, seguridad, utils
│
├── 📂 csp-service/                # Microservicio FastAPI (Python)
│   ├── 📄 .env.example
│   ├── 📄 requirements.txt
│   ├── 📄 main.py
│   └── 📂 app/
│       ├── 📂 routers/            # Endpoints FastAPI
│       ├── 📂 solver/             # Motor CSP (backtracking + heurísticas)
│       └── 📂 models/             # Esquemas Pydantic
│
└── 📂 docs/                       # Documentación
    ├── 📂 Planificación/
    └── 📂 Sprint_0/
```

---

## ⚙️ Instalación

### Prerrequisitos

| Herramienta | Versión Mínima |
|:---|:---|
| ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white) | 18.x o superior |
| ![Java](https://img.shields.io/badge/Java-21+-ED8B00?style=flat-square&logo=openjdk&logoColor=white) | 21 (LTS) o superior |
| ![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white) | 3.11 o superior |
| ![Docker](https://img.shields.io/badge/Docker-20+-2496ED?style=flat-square&logo=docker&logoColor=white) | 20.x o superior |
| ![Docker Compose](https://img.shields.io/badge/Docker_Compose-2+-2496ED?style=flat-square&logo=docker&logoColor=white) | 2.x o superior |
| ![Git](https://img.shields.io/badge/Git-2.30+-F05032?style=flat-square&logo=git&logoColor=white) | 2.30 o superior |

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/planner-uc.git
cd planner-uc
```

### 2. Configurar variables de entorno

```bash
# En la raíz del proyecto
cp .env.example .env

# En el frontend
cp frontend/.env.example frontend/.env

# En el backend
cp backend/.env.example backend/.env

# En el microservicio CSP
cp csp-service/.env.example csp-service/.env
```

### 3. Levantar con Docker Compose (Recomendado)

```bash
# Desarrollo
docker compose up -d

# Producción
docker compose -f docker-compose.prod.yml up -d
```

### 4. Instalación manual (sin Docker)

```bash
# Backend (Spring Boot)
cd backend
./mvnw spring-boot:run

# Microservicio CSP (FastAPI)
cd csp-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

### 5. Verificar instalación

| Servicio | URL |
|:---|:---|
| Frontend | [http://localhost:3000](http://localhost:3000) |
| Backend API | [http://localhost:8080/api](http://localhost:8080/api) |
| Documentación API (Swagger - Spring) | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) |
| Motor CSP (FastAPI) | [http://localhost:8001](http://localhost:8001) |
| Documentación CSP (Swagger - FastAPI) | [http://localhost:8001/docs](http://localhost:8001/docs) |

---

## ▶️ Uso

### Flujo Principal

```
1. 🔐 Iniciar sesión con credenciales asignadas
2. 📋 Registrar entidades (estudiantes, docentes, cursos, aulas)
3. 🧠 Ejecutar el motor de generación de horarios
4. 👁️ Visualizar el horario generado en la grilla semanal
5. ✏️ Ajustar manualmente si es necesario (con validación en tiempo real)
6. 📥 Exportar a PDF o Excel
```

### Scripts Disponibles

#### Backend (Spring Boot)

```bash
./mvnw spring-boot:run                  # Modo desarrollo
./mvnw spring-boot:run -Pprod           # Modo producción
./mvnw test                             # Ejecutar tests unitarios
./mvnw verify                           # Tests de integración
./mvnw test jacoco:report               # Cobertura de tests
```

#### Microservicio CSP (FastAPI)

```bash
cd csp-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001   # Modo desarrollo
uvicorn main:app --port 8001            # Modo producción
pytest                                  # Ejecutar tests
```

#### Frontend (Next.js)

```bash
npm run dev           # Modo desarrollo
npm run build         # Build de producción
npm run start         # Iniciar producción
npm run lint          # Linting
npm run test          # Ejecutar tests
```

---

## 🔌 API

La API REST sigue los estándares RESTful con autenticación JWT.

### Endpoints Principales

| Método | Endpoint | Descripción | Rol Requerido |
|:---:|:---|:---|:---|
| `GET` | `/api/auth/google` | Iniciar sesión con Google | Público |
| `GET` | `/api/auth/google/callback` | Callback de Google OAuth | Público |
| `GET` | `/api/students` | Listar estudiantes | Admin, Coord. |
| `GET` | `/api/teachers` | Listar docentes | Admin, Coord. |
| `GET` | `/api/courses` | Listar cursos | Todos |
| `GET` | `/api/classrooms` | Listar aulas | Admin, Coord. |
| `POST` | `/api/schedules/generate` | Generar horario automático | Coordinador |
| `GET` | `/api/schedules/:id` | Obtener horario generado | Todos |
| `POST` | `/api/schedules/validate` | Validar asignación manual | Estudiante |
| `GET` | `/api/schedules/export/pdf` | Exportar horario a PDF | Todos |
| `GET` | `/api/schedules/export/excel` | Exportar horario a Excel | Todos |

### Ejemplo de Petición

```bash
# Login con Google (redirige al navegador)
# GET http://localhost:8080/api/auth/google

# Generar horario (autenticado con token JWT obtenido tras Google OAuth)
curl -X POST http://localhost:8080/api/schedules/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"periodId": "2026-I"}'
```

### Respuesta Ejemplo

```json
{
  "status": "success",
  "data": {
    "scheduleId": "sch-001",
    "period": "2026-I",
    "generatedAt": "2026-04-10T15:30:00Z",
    "conflicts": 0,
    "assignments": [
      {
        "course": "Algoritmos II",
        "teacher": "Prof. García",
        "classroom": "Lab-301",
        "timeSlot": "Lunes 08:00-10:00"
      }
    ]
  }
}
```

---

## 👥 Equipo

<table align="center">
  <tr>
    <td align="center" width="180">
      <strong>Jhann Pier Tapia De La Cruz</strong>
      <br/>
      <sub>🎯 Gerente de Proyecto</sub>
      <br/>
      <sub>Planificación, coordinación y seguimiento</sub>
    </td>
    <td align="center" width="180">
      <strong>Taquiri Rojas Phol Edwin</strong>
      <br/>
      <sub>⚙️ Desarrollador Backend</sub>
      <br/>
      <sub>API REST, lógica de negocio, CSP</sub>
    </td>
    <td align="center" width="180">
      <strong>Kevin Mendez Roca</strong>
      <br/>
      <sub>🧪 QA / Tester</sub>
      <br/>
      <sub>Pruebas unitarias e integración</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="180">
      <strong>Brayan Pedro Condor Aliaga</strong>
      <br/>
      <sub>🎨 Desarrollador Frontend</sub>
      <br/>
      <sub>Interfaz SPA, vistas, integración API</sub>
    </td>
    <td align="center" width="180">
      <strong>Daniel Gamarra Moreno</strong>
      <br/>
      <sub>🎓 Patrocinador Académico</sub>
      <br/>
      <sub>Taller de Proyectos 2</sub>
    </td>
    
  </tr>
</table>

---

## 🤝 Contribución

### Metodología

Este proyecto utiliza **Scrum** con sprints de 1-2 semanas.

### Flujo de Trabajo

```bash
# 1. Crear rama desde develop
git checkout -b feature/nombre-funcionalidad develop

# 2. Desarrollar y hacer commits con mensajes descriptivos
git commit -m "feat(module): descripción del cambio"

# 3. Push de la rama
git push origin feature/nombre-funcionalidad

# 4. Crear Pull Request hacia develop
```

### Convención de Commits

| Prefijo | Uso |
|:---|:---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Documentación |
| `test` | Pruebas |
| `refactor` | Refactorización |
| `chore` | Tareas de mantenimiento |

### Definition of Done

- ✅ Código commiteado en la rama correspondiente
- ✅ Pruebas unitarias pasando
- ✅ Code review realizado por al menos un par
- ✅ Validación funcional en entorno de desarrollo
- ✅ Documentación actualizada si aplica

---

## ❓ FAQ

<details>
<summary><strong>¿Qué es CSP y por qué se usa para generar horarios?</strong></summary>

CSP (Constraint Satisfaction Problem) es un paradigma de modelado matemático donde un problema se define mediante variables, dominios y restricciones. Es ideal para la generación de horarios porque permite expresar restricciones complejas (solapamientos, disponibilidad, capacidades) de forma natural y aplicar técnicas de búsqueda inteligente (backtracking con heurísticas) para encontrar soluciones válidas.
</details>

<details>
<summary><strong>¿Cuánto tiempo tarda en generar un horario?</strong></summary>

Para el escenario base (≤50 estudiantes, ≤20 docentes, ≤30 cursos, ≤20 aulas), la generación de horarios docentes tarda **≤ 30 segundos** y la generación de horarios individuales de estudiantes tarda **≤ 5 segundos**.
</details>

<details>
<summary><strong>¿Qué navegadores son compatibles?</strong></summary>

Chrome, Firefox y Edge en sus versiones actuales. El sistema cumple con WCAG 2.1 Nivel AA para accesibilidad.
</details>

<details>
<summary><strong>¿Se puede usar sin Docker?</strong></summary>

Sí. Necesitarás Node.js 18+ y PostgreSQL instalados localmente. Consulta la sección de [instalación manual](#4-instalación-manual-sin-docker).
</details>

<details>
<summary><strong>¿El sistema soporta múltiples instituciones?</strong></summary>

No en el PMV actual. El soporte multi-institución y multi-sede está fuera del alcance de esta versión.
</details>

---

## 📊 Métricas de Calidad

| Atributo | Métrica | Objetivo |
|:---|:---|:---:|
| **Rendimiento** | Operaciones generales (P95) | ≤ 3s |
| **Escalabilidad** | Nueva entidad/regla sin reestructuración | ✅ |
| **Usabilidad** | Tiempo primer uso (registro + vista) | ≤ 5 min |
| **Accesibilidad** | WCAG 2.1 Nivel AA | ✅ |
| **Seguridad** | Mitigación OWASP Top 10 | ✅ |
| **Concurrencia** | Cero duplicados bajo carga (≤5 usuarios) | ✅ |
| **Transaccionalidad** | Commit/rollback completo | ✅ |
| **Testing** | Cobertura en módulos críticos | ≥ 70% |

---

## � Documentación del Proyecto

### 📂 Planificación

| Documento | Descripción |
|:---|:---|
| [Requerimientos Funcionales y No Funcionales](docs/Planificación/Requerimientos_Funcionales_y_No_Funcionales.md) | Listado detallado de requerimientos del sistema |
| [Backlog Detallado del Producto](docs/Planificación/01%20Backlog%20Detallado%20del%20Producto.xlsx) | Product backlog con historias de usuario |
| [Presupuesto del Proyecto](docs/Planificación/04%20Presupuesto%20del%20Proyecto.xls) | Estimación y desglose de costos |
| [Registro de Riesgos](docs/Planificación/05%20Registro%20de%20Riesgos.xls) | Identificación y plan de mitigación de riesgos |

### 📂 Sprint 0

| Documento | Descripción |
|:---|:---|
| [Project Charter](docs/Sprint_0/Project_Charter.md) | Acta de constitución del proyecto |
| [Declaración de la Visión del Proyecto](docs/Sprint_0/Declaración_de_la_visión_del_proyecto.md) | Visión y objetivos del proyecto |
| [Declaración del Equipo del Proyecto](docs/Sprint_0/Declaración_del_equipo_del_proyecto.md) | Integrantes, roles y responsabilidades |
| [Documento Inicial del Proyecto](docs/Sprint_0/Documento_inicial_proyecto.md) | Descripción general inicial |
| [Lista Preliminar de Requerimientos](docs/Sprint_0/Lista_Preliminar%20de%20Requerimientos.md) | Requerimientos identificados en Sprint 0 |
| [Registro de Supuestos y Restricciones](docs/Sprint_0/Registro_de_supuestos_y_restricciones.md) | Supuestos y restricciones del proyecto |
| [Selección de Enfoque del Proyecto](docs/Sprint_0/Seleccion_enfoque_proyecto.md) | Justificación del enfoque metodológico |

---

## �📄 Licencia

Este proyecto está bajo la licencia **MIT**.

```
MIT License

Copyright (c) 2026 Planner UC Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<p align="center">
  Hecho con ❤️ por el equipo <strong>Planner UC</strong> — Taller de Proyectos 2, 2026
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT"/>
  <img src="https://img.shields.io/badge/Google_OAuth-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google OAuth"/>
</p>
