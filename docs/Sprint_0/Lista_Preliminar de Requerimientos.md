# Lista Preliminar de Requerimientos Funcionales y No Funcionales

## 1. Introducción

El presente documento define la lista preliminar de requerimientos del sistema Planner UC, cuyo objetivo es generar automáticamente horarios académicos óptimos en entornos universitarios con currículo flexible.

Los requerimientos se clasifican en funcionales (lo que el sistema debe hacer) y no funcionales (cómo debe comportarse), tomando como base la consigna del proyecto y el estándar ISO/IEC 25010.

---

## 2. Requerimientos Funcionales

- **RF-01 – Gestionar estudiantes**
  El sistema debe permitir registrar, editar, eliminar, listar y buscar estudiantes con sus datos académicos: código, nombre, ciclo, carrera y cursos aprobados.

- **RF-02 – Gestionar docentes**
  El sistema debe permitir registrar, editar, eliminar, listar y buscar docentes con su código, nombre, especialidad y disponibilidad horaria semanal.

- **RF-03 – Gestionar cursos**
  El sistema debe permitir registrar, editar, eliminar, listar y buscar cursos con su código, nombre, créditos, horas semanales, prerrequisitos y tipo de aula requerida.

- **RF-04 – Gestionar aulas**
  El sistema debe permitir registrar, editar, eliminar, listar y buscar aulas con su código, capacidad, tipo y disponibilidad por franja horaria.

- **RF-05 – Validar condiciones académicas del estudiante**
  El sistema debe validar que el estudiante solo pueda acceder a cursos para los cuales cumple los prerrequisitos.

- **RF-06 – Gestionar disponibilidad docente**
  El sistema debe permitir registrar y actualizar la disponibilidad horaria semanal de cada docente.

- **RF-07 – Generar asignaciones horarias de cursos**
  El sistema debe generar automáticamente asignaciones horarias para los cursos, vinculando cada curso con un docente, un aula y una franja horaria compatibles según las restricciones académicas definidas.

- **RF-08 – Validar horario docente**
  El sistema debe validar que las asignaciones horarias generadas no presenten solapamientos de docentes ni de aulas.

- **RF-09 – Gestionar concurrencia en la asignación de recursos académicos**
  El sistema debe reservar temporalmente y bloquear, cuando corresponda, los recursos académicos involucrados en la generación y confirmación de horarios, evitando conflictos por accesos concurrentes.

- **RF-10 – Construir y ajustar horario docente**
  El sistema debe permitir al coordinador construir el horario docente manualmente o partir de una propuesta generada automáticamente, pudiendo realizar ajustes sobre asignaciones, franjas horarias y aulas compatibles antes de su confirmación.

- **RF-11 – Confirmar o cancelar horario docente**
  El sistema debe permitir confirmar un horario docente generado y también cancelarlo, liberando los recursos asociados cuando corresponda.

- **RF-12 – Generar horario del estudiante**
  El sistema debe generar automáticamente una propuesta de horario para el estudiante, seleccionando una combinación válida de secciones según reglas académicas, créditos, vacantes y ausencia de solapamientos.

- **RF-13 – Construir y ajustar horario del estudiante**
  El sistema debe permitir al estudiante construir su horario manualmente o partir de una propuesta generada automáticamente, pudiendo agregar cursos, retirar cursos o cambiar secciones compatibles.

- **RF-14 – Validar restricciones del horario del estudiante**
  El sistema debe validar en tiempo real que el horario del estudiante cumpla con prerrequisitos, límite de créditos, disponibilidad de vacantes y ausencia de solapamientos.

- **RF-15 – Notificar conflictos en la generación o ajuste del horario**
  El sistema debe informar al usuario cuando no sea posible generar o modificar un horario, indicando conflictos relacionados con créditos, prerrequisitos, vacantes o solapamientos.

- **RF-16 – Visualizar horarios**
  El sistema debe permitir visualizar las asignaciones horarias generadas, mostrando para cada curso su sección, docente, aula y franja horaria, tanto en el horario docente como en el horario del estudiante y en el horario general del periodo académico.

- **RF-17 – Exportar horarios**
  El sistema debe permitir exportar los horarios generados en formato PDF o Excel.

- **RF-18 – Gestionar autenticación y acceso**
  El sistema debe permitir iniciar y cerrar sesión, así como restringir el acceso a funcionalidades y datos según los roles Administrador, Coordinador Académico, Docente y Estudiante.

---

## 3. Requerimientos No Funcionales

- **RNF-01 – Tiempo de respuesta general**
  Las operaciones de consulta, registro, edición y visualización deben responder en un máximo de 3 segundos bajo condiciones normales.

- **RNF-02 – Tiempo de generación del horario docente**
  La generación del horario docente debe completarse en un máximo de 30 segundos para escenarios representativos del PMV.

- **RNF-03 – Tiempo de generación del horario del estudiante**
  La generación de una propuesta de horario para el estudiante debe completarse en un máximo de 5 segundos bajo condiciones normales.

- **RNF-04 – Escalabilidad estructural**
  La arquitectura del sistema debe permitir incorporar nuevas entidades, reglas o módulos sin requerir una reestructuración completa.

- **RNF-05 – Escalabilidad de datos**
  El sistema debe operar correctamente con al menos 50 estudiantes, 20 docentes, 30 cursos y 20 aulas sin degradación significativa del rendimiento.

- **RNF-06 – Usabilidad**
  La interfaz debe ser comprensible y operable, permitiendo que un usuario nuevo complete tareas básicas en menos de 5 minutos.

- **RNF-07 – Accesibilidad**
  La interfaz web debe cumplir las pautas WCAG 2.1 nivel AA.

- **RNF-08 – Compatibilidad**
  El sistema debe funcionar correctamente en las versiones actuales de Chrome, Firefox y Edge.

- **RNF-09 – Seguridad de autenticación y autorización**
  El sistema debe usar sesiones seguras o JWT con expiración, almacenar contraseñas con hash seguro e impedir accesos fuera del rol autorizado.

- **RNF-10 – Protección de datos y vulnerabilidades**
  El sistema no debe exponer datos personales o académicos sin autenticación y debe mitigar vulnerabilidades relevantes del OWASP Top 10 aplicables al proyecto.

- **RNF-11 – Concurrencia y consistencia**
  El sistema debe manejar correctamente accesos concurrentes durante la generación y asignación de horarios, evitando inconsistencias, duplicidad de asignaciones y sobreocupación de secciones.

- **RNF-12 – Retroalimentación en tiempo real**
  El sistema debe reflejar inmediatamente cambios en créditos, vacantes y solapamientos durante la construcción o modificación del horario del estudiante.

- **RNF-13 – Consistencia transaccional**
  Las operaciones de reserva, confirmación, liberación y asignación deben ejecutarse de forma transaccional para garantizar la integridad de los datos.

- **RNF-14 – Cobertura de pruebas**
  El sistema debe contar con pruebas unitarias y de integración con una cobertura mínima del 70% en los módulos críticos.