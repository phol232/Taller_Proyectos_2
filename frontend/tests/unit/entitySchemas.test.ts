import { describe, expect, it } from "vitest";
import { classroomSchema } from "@/lib/validators/classroom.schema";
import { courseSchema, courseComponentSchema } from "@/lib/validators/course.schema";
import { studentSchema } from "@/lib/validators/student.schema";
import { teacherSchema } from "@/lib/validators/teacher.schema";

describe("classroomSchema", () => {
  const valid = { code: "A-101", name: "Aula 101", capacity: 30, type: "LABORATORY", isActive: true };

  it("acepta un aula válida", () => {
    expect(classroomSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza código vacío", () => {
    expect(classroomSchema.safeParse({ ...valid, code: "" }).success).toBe(false);
  });

  it("rechaza capacidad menor a 1", () => {
    expect(classroomSchema.safeParse({ ...valid, capacity: 0 }).success).toBe(false);
  });

  it("rechaza capacidad no numérica", () => {
    expect(classroomSchema.safeParse({ ...valid, capacity: "treinta" }).success).toBe(false);
  });

  it("aplica isActive=true por defecto", () => {
    const { isActive, ...rest } = valid;
    const result = classroomSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isActive).toBe(true);
  });
});

describe("courseComponentSchema", () => {
  const valid = {
    componentType: "GENERAL" as const,
    weeklyHours: 3,
    requiredRoomType: "LABORATORY",
    sortOrder: 1,
    isActive: true,
  };

  it("acepta un componente válido", () => {
    expect(courseComponentSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza tipo de componente inválido", () => {
    expect(courseComponentSchema.safeParse({ ...valid, componentType: "OTHER" }).success).toBe(false);
  });

  it("rechaza horas semanales menores a 0.1", () => {
    expect(courseComponentSchema.safeParse({ ...valid, weeklyHours: 0 }).success).toBe(false);
  });

  it("rechaza orden menor a 1", () => {
    expect(courseComponentSchema.safeParse({ ...valid, sortOrder: 0 }).success).toBe(false);
  });
});

describe("courseSchema", () => {
  const validComponent = {
    componentType: "GENERAL" as const,
    weeklyHours: 3,
    requiredRoomType: "LABORATORY",
    sortOrder: 1,
    isActive: true,
  };
  const valid = {
    code: "INF-101",
    name: "Introducción a la Programación",
    cycle: 1,
    credits: 3,
    requiredCredits: 0,
    weeklyHours: 3,
    requiredRoomType: "LABORATORY",
    isActive: true,
    components: [validComponent],
    prerequisites: [],
  };

  it("acepta un curso válido con un componente GENERAL", () => {
    expect(courseSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza créditos no enteros", () => {
    expect(courseSchema.safeParse({ ...valid, credits: 3.5 }).success).toBe(false);
  });

  it("rechaza créditos fuera de rango", () => {
    expect(courseSchema.safeParse({ ...valid, credits: 7 }).success).toBe(false);
  });

  it("rechaza ciclo fuera de rango", () => {
    expect(courseSchema.safeParse({ ...valid, cycle: 11 }).success).toBe(false);
  });

  it("rechaza sin componentes", () => {
    expect(courseSchema.safeParse({ ...valid, components: [] }).success).toBe(false);
  });

  it("rechaza mezclar GENERAL con THEORY/PRACTICE", () => {
    const result = courseSchema.safeParse({
      ...valid,
      components: [
        validComponent,
        { ...validComponent, componentType: "THEORY", sortOrder: 2 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza más de un componente GENERAL", () => {
    const result = courseSchema.safeParse({
      ...valid,
      components: [validComponent, { ...validComponent, sortOrder: 2 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza tipos de componente repetidos", () => {
    const theory = { ...validComponent, componentType: "THEORY" as const };
    const result = courseSchema.safeParse({
      ...valid,
      components: [theory, { ...theory, sortOrder: 2 }],
    });
    expect(result.success).toBe(false);
  });

  it("acepta THEORY y PRACTICE combinados sin GENERAL", () => {
    const result = courseSchema.safeParse({
      ...valid,
      components: [
        { ...validComponent, componentType: "THEORY" },
        { ...validComponent, componentType: "PRACTICE", sortOrder: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("studentSchema", () => {
  const valid = {
    code: "E-001",
    fullName: "Ana García",
    cycle: 3,
    creditLimit: 22,
    isActive: true,
    approvedCourses: [],
  };

  it("acepta un estudiante válido sin campos opcionales", () => {
    expect(studentSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta userId vacío como string literal", () => {
    expect(studentSchema.safeParse({ ...valid, userId: "" }).success).toBe(true);
  });

  it("rechaza userId con formato inválido", () => {
    expect(studentSchema.safeParse({ ...valid, userId: "no-es-uuid" }).success).toBe(false);
  });

  it("rechaza ciclo menor a 1", () => {
    expect(studentSchema.safeParse({ ...valid, cycle: 0 }).success).toBe(false);
  });

  it("rechaza límite de créditos menor a 1", () => {
    expect(studentSchema.safeParse({ ...valid, creditLimit: 0 }).success).toBe(false);
  });

  it("rechaza nombre demasiado corto", () => {
    expect(studentSchema.safeParse({ ...valid, fullName: "A" }).success).toBe(false);
  });
});

describe("teacherSchema", () => {
  const valid = {
    code: "D-001",
    fullName: "Carlos Pérez",
    specialty: "Matemáticas",
    isActive: true,
    courseCodes: [],
    courseComponentIds: [],
  };

  it("acepta un docente válido", () => {
    expect(teacherSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza especialidad demasiado corta", () => {
    expect(teacherSchema.safeParse({ ...valid, specialty: "A" }).success).toBe(false);
  });

  it("rechaza courseComponentIds con valores no-UUID", () => {
    expect(teacherSchema.safeParse({ ...valid, courseComponentIds: ["no-es-uuid"] }).success).toBe(false);
  });

  it("acepta userId nulo", () => {
    expect(teacherSchema.safeParse({ ...valid, userId: null }).success).toBe(true);
  });
});
