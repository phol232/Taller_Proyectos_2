"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { CrudPageLayout } from "@/components/admin/CrudPageLayout";
import { FiltersPopover } from "@/components/admin/FiltersPopover";
import { SelectField } from "@/components/admin/SelectField";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { adminApi, getApiErrorMessage } from "@/lib/adminApi";
import { courseOfferingSchema } from "@/lib/validators/course-offering.schema";
import { toastError, toastSuccess } from "@/lib/utils";
import type {
  AcademicPeriodAdmin,
  CourseAdmin,
  CourseOfferingAdmin,
  SectionTeacherCandidate,
  TeacherAdmin,
} from "@/types/admin";

type CourseSectionDraft = {
  sectionCode: string;
  vacancyLimit: number;
  status: "DRAFT" | "ACTIVE" | "CANCELLED";
  teacherCandidates: SectionTeacherCandidate[];
};

type CourseOfferingFormState = {
  academicPeriodId: string;
  courseId: string;
  expectedEnrollment: number;
  status: "DRAFT" | "ACTIVE" | "CANCELLED";
  sections: CourseSectionDraft[];
};

function createEmptySection(): CourseSectionDraft {
  return {
    sectionCode: "",
    vacancyLimit: 30,
    status: "DRAFT",
    teacherCandidates: [],
  };
}

function createEmptyForm(): CourseOfferingFormState {
  return {
    academicPeriodId: "",
    courseId: "",
    expectedEnrollment: 0,
    status: "DRAFT",
    sections: [],
  };
}

export default function CourseOfferingsPage() {
  const [offerings, setOfferings] = useState<CourseOfferingAdmin[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriodAdmin[]>([]);
  const [courses, setCourses] = useState<CourseAdmin[]>([]);
  const [teachers, setTeachers] = useState<TeacherAdmin[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseOfferingAdmin | null>(null);
  const [form, setForm] = useState<CourseOfferingFormState>(() => createEmptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [lifecycleFilter, setLifecycleFilter] = useState<"all" | "DRAFT" | "ACTIVE" | "CANCELLED">("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  const [confirmCancel, setConfirmCancel] = useState<CourseOfferingAdmin | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CourseOfferingAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void loadDependencies();
  }, []);

  useEffect(() => {
    void loadOfferings(query);
  }, [query]);

  async function loadDependencies() {
    try {
      const [periodData, courseData, teacherData] = await Promise.all([
        adminApi.listAcademicPeriods(),
        adminApi.listCourses(),
        adminApi.listTeachers(),
      ]);
      setPeriods(periodData);
      setCourses(courseData);
      setTeachers(teacherData);
    } catch (error) {
      toastError("No se pudieron cargar dependencias", getApiErrorMessage(error, "Intenta nuevamente."));
    }
  }

  async function loadOfferings(search: string) {
    setLoading(true);
    try {
      const data = search.trim()
        ? await adminApi.searchCourseOfferings(search.trim())
        : await adminApi.listCourseOfferings();
      setOfferings(data);
    } catch (error) {
      toastError("No se pudieron cargar las ofertas", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(createEmptyForm());
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(offering: CourseOfferingAdmin) {
    setEditing(offering);
    setForm({
      academicPeriodId: offering.academicPeriodId,
      courseId: offering.courseId,
      expectedEnrollment: offering.expectedEnrollment,
      status: offering.status,
      sections: offering.sections.map((section) => ({
        sectionCode: section.sectionCode,
        vacancyLimit: section.vacancyLimit,
        status: section.status,
        teacherCandidates: section.teacherCandidates,
      })),
    });
    setErrors({});
    setDialogOpen(true);
  }

  function addSection() {
    setForm((prev) => ({ ...prev, sections: [...prev.sections, createEmptySection()] }));
  }

  function updateSection(index: number, patch: Partial<CourseSectionDraft>) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, current) =>
        current === index ? { ...section, ...patch } : section
      ),
    }));
  }

  function removeSection(index: number) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, current) => current !== index),
    }));
  }

  function addCandidate(sectionIndex: number) {
    updateSection(sectionIndex, {
      teacherCandidates: [
        ...form.sections[sectionIndex].teacherCandidates,
        { teacherId: "", priorityWeight: 1 },
      ],
    });
  }

  function updateCandidate(sectionIndex: number, candidateIndex: number, patch: Partial<SectionTeacherCandidate>) {
    updateSection(sectionIndex, {
      teacherCandidates: form.sections[sectionIndex].teacherCandidates.map((candidate, current) =>
        current === candidateIndex ? { ...candidate, ...patch } : candidate
      ),
    });
  }

  function removeCandidate(sectionIndex: number, candidateIndex: number) {
    updateSection(sectionIndex, {
      teacherCandidates: form.sections[sectionIndex].teacherCandidates.filter((_, current) => current !== candidateIndex),
    });
  }

  async function handleSubmit() {
    const result = courseOfferingSchema.safeParse(form);
    if (!result.success) {
      setErrors(flattenErrors(result.error));
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await adminApi.updateCourseOffering(editing.id, result.data);
        toastSuccess("Oferta actualizada");
      } else {
        await adminApi.createCourseOffering(result.data);
        toastSuccess("Oferta creada");
      }
      setDialogOpen(false);
      setForm(createEmptyForm());
      await loadOfferings(query);
    } catch (error) {
      toastError("No se pudo guardar la oferta", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(offering: CourseOfferingAdmin) {
    setActionLoading(true);
    try {
      await adminApi.cancelCourseOffering(offering.id);
      toastSuccess("Oferta desactivada");
      setConfirmCancel(null);
      await loadOfferings(query);
    } catch (error) {
      toastError("No se pudo desactivar la oferta", getApiErrorMessage(error, "Intenta nuevamente."));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(offering: CourseOfferingAdmin) {
    setActionLoading(true);
    try {
      await adminApi.deleteCourseOffering(offering.id);
      toastSuccess("Oferta eliminada");
      setConfirmDelete(null);
      await loadOfferings(query);
    } catch (error) {
      toastError(
        "No se pudo eliminar la oferta",
        getApiErrorMessage(error, "Tiene asignaciones o matrículas. Considera desactivarla.")
      );
    } finally {
      setActionLoading(false);
    }
  }

  const filtered = useMemo(
    () =>
      offerings.filter((o) => {
        if (lifecycleFilter !== "all" && o.status !== lifecycleFilter) return false;
        if (periodFilter !== "all" && o.academicPeriodId !== periodFilter) return false;
        return true;
      }),
    [offerings, lifecycleFilter, periodFilter]
  );

  const activeFiltersCount = (lifecycleFilter !== "all" ? 1 : 0) + (periodFilter !== "all" ? 1 : 0);

  function clearFilters() {
    setLifecycleFilter("all");
    setPeriodFilter("all");
  }

  function resolvePeriodName(id: string) {
    return periods.find((period) => period.id === id)?.code ?? id;
  }

  function resolveCourseName(id: string) {
    const course = courses.find((entry) => entry.id === id);
    return course ? `${course.code} · ${course.name}` : id;
  }

  return (
    <>
    <CrudPageLayout
      title="Ofertas de cursos"
      description="Gestiona la apertura de cursos por período, secciones y docentes candidatos."
      data={filtered}
      getRowId={(offering) => offering.id}
      isLoading={loading}
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Buscar..."
      dialogOpen={dialogOpen}
      onDialogOpenChange={setDialogOpen}
      dialogTitle={editing ? "Editar oferta de curso" : "Nueva oferta de curso"}
      dialogDescription="Define el período, curso, secciones y candidatos docentes."
      onCreate={openCreate}
      onSubmit={handleSubmit}
      isSubmitting={submitting}
      filters={
        <FiltersPopover
          activeCount={activeFiltersCount}
          statusFilter="all"
          onStatusChange={() => {}}
          onClear={clearFilters}
          extraFilters={
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#171717]">Etapa</label>
                <SelectField
                  value={lifecycleFilter}
                  onChange={(v) => setLifecycleFilter(v as "all" | "DRAFT" | "ACTIVE" | "CANCELLED")}
                  options={[
                    { value: "all", label: "Todas" },
                    { value: "DRAFT", label: "Borrador" },
                    { value: "ACTIVE", label: "Activa" },
                    { value: "CANCELLED", label: "Cancelada" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#171717]">Período</label>
                <SelectField
                  value={periodFilter}
                  onChange={setPeriodFilter}
                  options={[
                    { value: "all", label: "Todos" },
                    ...periods.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
                  ]}
                />
              </div>
            </>
          }
        />
      }
      columns={[
        {
          key: "period",
          label: "Período",
          sortable: true,
          sortAccessor: (o) => resolvePeriodName(o.academicPeriodId),
          render: (offering) => resolvePeriodName(offering.academicPeriodId),
        },
        {
          key: "course",
          label: "Curso",
          sortable: true,
          sortAccessor: (o) => resolveCourseName(o.courseId),
          render: (offering) => resolveCourseName(offering.courseId),
        },
        {
          key: "enrollment",
          label: "Matrícula",
          sortable: true,
          sortAccessor: (o) => o.expectedEnrollment,
          render: (offering) => offering.expectedEnrollment,
        },
        {
          key: "status",
          label: "Estado",
          sortable: true,
          sortAccessor: (o) => o.status,
          render: (offering) => offering.status,
        },
        {
          key: "sections",
          label: "Secciones",
          render: (offering) =>
            offering.sections.length ? offering.sections.map((section) => section.sectionCode).join(", ") : "—",
        },
        {
          key: "actions",
          label: "Acciones",
          render: (offering) => (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(offering)}>
                Editar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmCancel(offering)}>
                Desactivar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(offering)}>
                Eliminar
              </Button>
            </div>
          ),
        },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#171717]">Detalles de la oferta</h3>
          <FormField label="Período académico" error={errors.academicPeriodId}>
            <SelectField
              value={form.academicPeriodId}
              onChange={(v) => setForm((prev) => ({ ...prev, academicPeriodId: v }))}
              placeholder="Selecciona un período"
              options={periods.map((period) => ({
                value: period.id,
                label: `${period.code} · ${period.name}`,
              }))}
            />
          </FormField>
          <FormField label="Curso" error={errors.courseId}>
            <SelectField
              value={form.courseId}
              onChange={(v) => setForm((prev) => ({ ...prev, courseId: v }))}
              placeholder="Selecciona un curso"
              options={courses.map((course) => ({
                value: course.id,
                label: `${course.code} · ${course.name}`,
              }))}
            />
          </FormField>
          <FormField label="Matrícula esperada" error={errors.expectedEnrollment}>
            <Input type="number" value={form.expectedEnrollment} onChange={(event) => setForm((prev) => ({ ...prev, expectedEnrollment: Number(event.target.value) }))} />
          </FormField>
          <FormField label="Estado" error={errors.status}>
            <SelectField
              value={form.status}
              onChange={(v) => setForm((prev) => ({ ...prev, status: v as CourseOfferingFormState["status"] }))}
              options={[
                { value: "DRAFT", label: "DRAFT" },
                { value: "ACTIVE", label: "ACTIVE" },
                { value: "CANCELLED", label: "CANCELLED" },
              ]}
            />
          </FormField>
        </div>

        <div className="space-y-4">
          {errors.sections && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors.sections}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#171717]">Secciones</h3>
              <p className="text-xs text-gray-400">Registra vacantes y docentes candidatos por sección.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addSection}>
              Agregar
            </Button>
          </div>

          {form.sections.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-400">
              Sin secciones registradas.
            </div>
          )}

          {form.sections.map((section, sectionIndex) => (
            <div key={`${section.sectionCode}-${sectionIndex}`} className="rounded-xl border border-gray-100 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Código">
                  <Input value={section.sectionCode} onChange={(event) => updateSection(sectionIndex, { sectionCode: event.target.value })} />
                </FormField>
                <FormField label="Vacantes">
                  <Input type="number" value={section.vacancyLimit} onChange={(event) => updateSection(sectionIndex, { vacancyLimit: Number(event.target.value) })} />
                </FormField>
                <FormField label="Estado">
                  <SelectField
                    value={section.status}
                    onChange={(v) => updateSection(sectionIndex, { status: v as CourseSectionDraft["status"] })}
                    options={[
                      { value: "DRAFT", label: "DRAFT" },
                      { value: "ACTIVE", label: "ACTIVE" },
                      { value: "CANCELLED", label: "CANCELLED" },
                    ]}
                  />
                </FormField>
                <div className="flex items-end">
                  <Button type="button" size="sm" variant="destructive" onClick={() => removeSection(sectionIndex)}>
                    Quitar sección
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Docentes candidatos</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => addCandidate(sectionIndex)}>
                    Agregar docente
                  </Button>
                </div>

                {errors[`sections.${sectionIndex}.teacherCandidates`] && (
                  <p className="text-sm text-red-600">
                    {errors[`sections.${sectionIndex}.teacherCandidates`]}
                  </p>
                )}

                {section.teacherCandidates.length === 0 && (
                  <p className="text-sm text-gray-400">Sin docentes candidatos.</p>
                )}

                {section.teacherCandidates.map((candidate, candidateIndex) => (
                  <div key={`${candidate.teacherId}-${candidateIndex}`} className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
                    <SelectField
                      value={candidate.teacherId}
                      onChange={(v) => updateCandidate(sectionIndex, candidateIndex, { teacherId: v })}
                      placeholder="Selecciona un docente"
                      options={teachers.map((teacher) => ({
                        value: teacher.id,
                        label: `${teacher.code} · ${teacher.fullName}`,
                      }))}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      value={candidate.priorityWeight}
                      onChange={(event) => updateCandidate(sectionIndex, candidateIndex, { priorityWeight: Number(event.target.value) })}
                    />
                    <Button type="button" size="sm" variant="destructive" onClick={() => removeCandidate(sectionIndex, candidateIndex)}>
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CrudPageLayout>

      <ConfirmDialog
        open={!!confirmCancel}
        onOpenChange={(open) => !open && setConfirmCancel(null)}
        title="Desactivar oferta"
        description={`¿Desactivar esta oferta? Se marcará como CANCELLED y no estará disponible.`}
        confirmLabel="Desactivar"
        onConfirm={() => confirmCancel && handleCancel(confirmCancel)}
        isLoading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Eliminar oferta"
        description={`Esta acción es permanente. La oferta será eliminada definitivamente. Si tiene matrículas o asignaciones, no podrá eliminarse.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        isLoading={actionLoading}
      />
    </>
  );
}

function flattenErrors(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((accumulator, issue) => {
    const key = issue.path.join(".");
    if (key && !accumulator[key]) {
      accumulator[key] = issue.message;
    }
    return accumulator;
  }, {});
}
