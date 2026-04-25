"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Search, X, BookOpen, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/adminApi";
import type { CourseAdmin } from "@/types/admin";

interface ApprovedCoursePickerProps {
  value: string[];
  onChange: (codes: string[]) => void;
  error?: string;
}

export function ApprovedCoursePicker({ value, onChange, error }: ApprovedCoursePickerProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<CourseAdmin[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [detailCourse, setDetailCourse] = React.useState<CourseAdmin | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState<{ code: string; name: string } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [inputRect, setInputRect] = React.useState<DOMRect | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [resolved, setResolved] = React.useState<Record<string, CourseAdmin>>({});
  const attemptedRef = React.useRef<Set<string>>(new Set());

  // Only render portal after mount (SSR safety)
  React.useEffect(() => { setMounted(true); }, []);

  // Resolve existing codes via backend lookup (once per code, no retries)
  React.useEffect(() => {
    const missing = value.filter((code) => !attemptedRef.current.has(code));
    if (missing.length === 0) return;
    missing.forEach((code) => attemptedRef.current.add(code));
    let cancelled = false;
    (async () => {
      try {
        const list = await adminApi.findCoursesByCodes(missing);
        if (cancelled) return;
        const next: Record<string, CourseAdmin> = {};
        for (const c of list) next[c.code] = c;
        if (Object.keys(next).length > 0) setResolved((prev) => ({ ...prev, ...next }));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [value]);

  // Close dropdown on outside click (both input area and portal dropdown)
  React.useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setDropdownOpen(false);
      return;
    }
    setSearching(true);
    // Refresh position each time dropdown opens
    if (containerRef.current) setInputRect(containerRef.current.getBoundingClientRect());
    setDropdownOpen(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await adminApi.searchCourses(trimmed);
        setResults(data.content.filter((c) => !value.includes(c.code)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, value]);

  function addCourse(course: CourseAdmin) {
    if (!value.includes(course.code)) {
      attemptedRef.current.add(course.code);
      setResolved((prev) => ({ ...prev, [course.code]: course }));
      onChange([...value, course.code]);
    }
    setQuery("");
    setResults([]);
    setDropdownOpen(false);
  }

  function requestRemoveCourse(code: string, name: string) {
    setConfirmRemove({ code, name });
  }

  function confirmRemoveCourse() {
    if (!confirmRemove) return;
    onChange(value.filter((c) => c !== confirmRemove.code));
    setConfirmRemove(null);
  }

  const approvedDetails = React.useMemo(
    () => value.map((code) => resolved[code] ?? { code, id: code, name: "", credits: 0, weeklyHours: 0, requiredRoomType: null, isActive: true, prerequisites: [], createdAt: null, updatedAt: null } as CourseAdmin),
    [value, resolved]
  );

  const showDropdown = dropdownOpen && (searching || results.length > 0);

  // Floating dropdown rendered via portal so it's never clipped by modal overflow
  const dropdownPortal =
    mounted && showDropdown && inputRect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: inputRect.bottom + 4,
              left: inputRect.left,
              width: inputRect.width,
              zIndex: 9999,
            }}
            className="rounded-xl border border-input bg-popover shadow-2xl overflow-hidden"
          >
            {searching && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#6B21A8] border-t-transparent" />
                Buscando…
              </div>
            )}
            {!searching && results.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados para &ldquo;{query}&rdquo;</p>
            )}
            {!searching && results.length > 0 && (
              <div className="grid grid-cols-2 gap-2 p-2 max-h-72 overflow-y-auto">
                {results.slice(0, 8).map((course) => (
                  <CourseResultCard
                    key={course.id}
                    course={course}
                    onAdd={() => addCourse(course)}
                    onViewDetail={() => { setDetailCourse(course); setDropdownOpen(false); }}
                  />
                ))}
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div ref={containerRef} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar curso por código o nombre…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (containerRef.current) setInputRect(containerRef.current.getBoundingClientRect());
          }}
          onFocus={() => {
            if (query.trim() && containerRef.current) {
              setInputRect(containerRef.current.getBoundingClientRect());
              setDropdownOpen(true);
            }
          }}
          autoComplete="off"
        />
      </div>

      {dropdownPortal}

      {/* Approved courses list */}
      {approvedDetails.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Aprobados ({approvedDetails.length})
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {approvedDetails.map((course) => (
              <ApprovedCourseCard
                key={course.code}
                course={course}
                onRemove={() => requestRemoveCourse(course.code, course.name || course.code)}
                onViewDetail={() => setDetailCourse(resolved[course.code] ?? null)}
              />
            ))}
          </div>
        </div>
      )}

      {approvedDetails.length === 0 && !query.trim() && (
        <p className="text-xs text-muted-foreground">Ningún curso aprobado registrado.</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <CourseDetailModal
        course={detailCourse}
        onClose={() => setDetailCourse(null)}
      />

      <ConfirmRemoveModal
        confirmRemove={confirmRemove}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={confirmRemoveCourse}
      />
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function CourseResultCard({
  course,
  onAdd,
  onViewDetail,
}: {
  course: CourseAdmin;
  onAdd: () => void;
  onViewDetail: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-input bg-card p-3 text-sm transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-semibold leading-tight text-card-foreground truncate">{course.code}</p>
          <p className="text-xs text-muted-foreground truncate">{course.name}</p>
        </div>
        <button
          type="button"
          onClick={onViewDetail}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-400 transition-colors"
          title="Ver detalles"
        >
          <BookOpen className="h-3.5 w-3.5" />
        </button>
      </div>
      <Button
        type="button"
        size="sm"
        className="h-7 w-full bg-[#6B21A8] text-white hover:bg-[#581C87] text-xs"
        onClick={onAdd}
      >
        <Check className="h-3 w-3" />
        Agregar
      </Button>
    </div>
  );
}

function ApprovedCourseCard({
  course,
  onRemove,
  onViewDetail,
}: {
  course: Pick<CourseAdmin, "code" | "name" | "credits" | "weeklyHours" | "id">;
  onRemove: () => void;
  onViewDetail: () => void;
}) {
  const hasDetails = course.name !== "";
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm dark:border-violet-800/50 dark:bg-violet-950/30">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-semibold leading-tight text-violet-600 dark:text-violet-400 truncate">{course.code}</p>
          {hasDetails && <p className="text-xs text-muted-foreground truncate">{course.name}</p>}
        </div>
        <div className="flex shrink-0 gap-0.5">
          {hasDetails && (
            <button
              type="button"
              onClick={onViewDetail}
              className="rounded-md p-1 text-muted-foreground hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-400 transition-colors"
              title="Ver detalles"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
            title="Quitar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {hasDetails && (
        <p className="text-xs text-muted-foreground">{course.credits} cr · {course.weeklyHours}h/sem</p>
      )}
    </div>
  );
}

function CourseDetailModal({
  course,
  onClose,
}: {
  course: CourseAdmin | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (!course) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [course, onClose]);

  if (!mounted || !course) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: 115 }}
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl bg-background border border-border p-5 shadow-xl"
        style={{ zIndex: 120 }}
        role="dialog"
        aria-modal
        aria-label="Detalles del curso"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Detalles del curso</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <Row label="Código" value={course.code} />
          <Row label="Nombre" value={course.name} />
          <Row label="Créditos" value={String(course.credits)} />
          <Row label="Horas semanales" value={String(course.weeklyHours)} />
          <Row label="Tipo de aula requerida" value={course.requiredRoomType ?? "—"} />
          <Row label="Estado" value={course.isActive ? "Activo" : "Inactivo"} />
          {course.prerequisites.length > 0 && (
            <Row label="Prerrequisitos" value={course.prerequisites.join(", ")} />
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right text-foreground">{value}</span>
    </div>
  );
}

function ConfirmRemoveModal({
  confirmRemove,
  onCancel,
  onConfirm,
}: {
  confirmRemove: { code: string; name: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (!confirmRemove) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmRemove, onCancel]);

  if (!mounted || !confirmRemove) return null;

  const label = `"${confirmRemove.code}${confirmRemove.name && confirmRemove.name !== confirmRemove.code ? ` — ${confirmRemove.name}` : ""}"`;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: 125 }}
        onClick={onCancel}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl bg-background border border-border p-6 shadow-xl"
        style={{ zIndex: 130 }}
        role="alertdialog"
        aria-modal
      >
        <h2 className="text-[17px] font-semibold text-foreground mb-2">Quitar curso aprobado</h2>
        <p className="text-sm leading-relaxed text-muted-foreground mb-6">
          ¿Quitar {label} de los cursos aprobados? El estudiante figurará como si no hubiera aprobado este curso.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Sí, quitar
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
