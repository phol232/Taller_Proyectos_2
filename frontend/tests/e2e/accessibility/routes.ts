import type { Role } from '../helpers/auth.helper';

/** Rutas públicas, accesibles sin sesión. */
export const PUBLIC_ROUTES: string[] = ['/login', '/forgot-password'];

/** Rutas por rol, según la navegación real de cada uno (components/layout/Sidebar.tsx). */
export const ROLE_ROUTES: Record<Role, string[]> = {
  student: [
    '/student',
    '/student/my-schedule',
    '/student/schedule/generate',
    '/student/schedule/builder',
    '/student/schedule/preview',
    '/profile',
    '/settings',
  ],
  coordinator: [
    '/coordinator',
    '/coordinator/schedule/generate',
    '/coordinator/schedule/builder',
    '/coordinator/schedule/confirm',
    '/coordinator/teacher-availability',
    '/schedules/view',
    '/profile',
    '/settings',
  ],
  teacher: [
    '/dashboard',
    '/profile',
    '/settings',
  ],
  admin: [
    '/admin',
    '/admin/users',
    '/admin/students',
    '/admin/courses',
    '/admin/teachers',
    '/admin/classrooms',
    '/admin/facultades',
    '/admin/academic-periods',
    '/admin/schedule/generate',
    '/admin/schedule/builder',
    '/admin/schedule/confirm',
    '/admin/schedule/view',
    '/schedules/view',
    '/profile',
    '/settings',
  ],
};
