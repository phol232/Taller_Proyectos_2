import api from "@/lib/api";
import type {
  AcademicPeriodAdmin,
  ApiErrorResponse,
  CarreraAdmin,
  ClassroomAdmin,
  CreateUserInput,
  CourseAdmin,
  CourseOfferingAdmin,
  CourseOfferingUpsertInput,
  FacultadAdmin,
  PagedResult,
  StudentAdmin,
  TeacherAdmin,
  UserAdmin,
} from "@/types/admin";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const maybeAxios = error as {
    response?: {
      data?: ApiErrorResponse;
    };
    message?: string;
  };

  return maybeAxios.response?.data?.message ?? maybeAxios.message ?? fallback;
}

export const adminApi = {
  listUsers: async (page = 1) =>
    (await api.get<PagedResult<UserAdmin>>("/api/users", { params: { page, pageSize: 12 } })).data,
  searchUsers: async (query: string, page = 1) =>
    (await api.get<PagedResult<UserAdmin>>("/api/users/search", { params: { q: query, page, pageSize: 12 } })).data,
  createUser: async (payload: CreateUserInput) =>
    (await api.post<UserAdmin>("/api/users", payload)).data,
  activateUser: async (id: string) =>
    (await api.post<UserAdmin>(`/api/users/${id}/activate`)).data,
  deactivateUser: async (id: string) =>
    (await api.post<UserAdmin>(`/api/users/${id}/deactivate`)).data,

  listCourses: async (page = 1, pageSize = 12) =>
    (await api.get<PagedResult<CourseAdmin>>("/api/courses", { params: { page, pageSize } })).data,
  searchCourses: async (query: string, page = 1, pageSize = 12) =>
    (await api.get<PagedResult<CourseAdmin>>("/api/courses/search", { params: { q: query, page, pageSize } })).data,
  createCourse: async (payload: Partial<CourseAdmin>) =>
    (await api.post<CourseAdmin>("/api/courses", payload)).data,
  updateCourse: async (id: string, payload: Partial<CourseAdmin>) =>
    (await api.put<CourseAdmin>(`/api/courses/${id}`, payload)).data,
  deactivateCourse: async (id: string) => api.post(`/api/courses/${id}/deactivate`),
  deleteCourse: async (id: string) => api.delete(`/api/courses/${id}`),

  listTeachers: async (page = 1) =>
    (await api.get<PagedResult<TeacherAdmin>>("/api/teachers", { params: { page, pageSize: 12 } })).data,
  searchTeachers: async (query: string, page = 1) =>
    (await api.get<PagedResult<TeacherAdmin>>("/api/teachers/search", { params: { q: query, page, pageSize: 12 } })).data,
  createTeacher: async (payload: Partial<TeacherAdmin>) =>
    (await api.post<TeacherAdmin>("/api/teachers", payload)).data,
  updateTeacher: async (id: string, payload: Partial<TeacherAdmin>) =>
    (await api.put<TeacherAdmin>(`/api/teachers/${id}`, payload)).data,
  deactivateTeacher: async (id: string) => api.post(`/api/teachers/${id}/deactivate`),
  deleteTeacher: async (id: string) => api.delete(`/api/teachers/${id}`),

  listClassrooms: async (page = 1) =>
    (await api.get<PagedResult<ClassroomAdmin>>("/api/classrooms", { params: { page, pageSize: 12 } })).data,
  searchClassrooms: async (query: string, page = 1) =>
    (await api.get<PagedResult<ClassroomAdmin>>("/api/classrooms/search", { params: { q: query, page, pageSize: 12 } })).data,
  createClassroom: async (payload: Partial<ClassroomAdmin>) =>
    (await api.post<ClassroomAdmin>("/api/classrooms", payload)).data,
  updateClassroom: async (id: string, payload: Partial<ClassroomAdmin>) =>
    (await api.put<ClassroomAdmin>(`/api/classrooms/${id}`, payload)).data,
  deactivateClassroom: async (id: string) => api.post(`/api/classrooms/${id}/deactivate`),
  deleteClassroom: async (id: string) => api.delete(`/api/classrooms/${id}`),

  listStudents: async (page = 1) =>
    (await api.get<PagedResult<StudentAdmin>>("/api/students", { params: { page, pageSize: 12 } })).data,
  searchStudents: async (query: string, page = 1) =>
    (await api.get<PagedResult<StudentAdmin>>("/api/students/search", { params: { q: query, page, pageSize: 12 } })).data,
  createStudent: async (payload: Partial<StudentAdmin>) =>
    (await api.post<StudentAdmin>("/api/students", payload)).data,
  updateStudent: async (id: string, payload: Partial<StudentAdmin>) =>
    (await api.put<StudentAdmin>(`/api/students/${id}`, payload)).data,
  deactivateStudent: async (id: string) => api.post(`/api/students/${id}/deactivate`),
  deleteStudent: async (id: string) => api.delete(`/api/students/${id}`),

  listAcademicPeriods: async () =>
    (await api.get<AcademicPeriodAdmin[]>("/api/academic-periods")).data,
  searchAcademicPeriods: async (query: string) =>
    (await api.get<AcademicPeriodAdmin[]>("/api/academic-periods/search", { params: { q: query } })).data,
  createAcademicPeriod: async (payload: Partial<AcademicPeriodAdmin>) =>
    (await api.post<AcademicPeriodAdmin>("/api/academic-periods", payload)).data,
  updateAcademicPeriod: async (id: string, payload: Partial<AcademicPeriodAdmin>) =>
    (await api.put<AcademicPeriodAdmin>(`/api/academic-periods/${id}`, payload)).data,
  deactivateAcademicPeriod: async (id: string) => api.post(`/api/academic-periods/${id}/deactivate`),
  deleteAcademicPeriod: async (id: string) => api.delete(`/api/academic-periods/${id}`),

  listCourseOfferings: async () =>
    (await api.get<CourseOfferingAdmin[]>("/api/course-offerings")).data,
  searchCourseOfferings: async (query: string) =>
    (await api.get<CourseOfferingAdmin[]>("/api/course-offerings/search", { params: { q: query } })).data,
  createCourseOffering: async (payload: CourseOfferingUpsertInput) =>
    (await api.post<CourseOfferingAdmin>("/api/course-offerings", payload)).data,
  updateCourseOffering: async (id: string, payload: CourseOfferingUpsertInput) =>
    (await api.put<CourseOfferingAdmin>(`/api/course-offerings/${id}`, payload)).data,
  cancelCourseOffering: async (id: string) => api.post(`/api/course-offerings/${id}/cancel`),
  deleteCourseOffering: async (id: string) => api.delete(`/api/course-offerings/${id}`),

  listCatalogFacultades: async () =>
    (await api.get<FacultadAdmin[]>("/api/catalog/facultades")).data,
  listCatalogCarreras: async (facultadId?: string) =>
    (await api.get<CarreraAdmin[]>("/api/catalog/carreras", {
      params: facultadId ? { facultadId } : undefined,
    })).data,

  // Admin: incluye inactivas
  listAllFacultades: async () =>
    (await api.get<FacultadAdmin[]>("/api/catalog/facultades/all")).data,
  listAllCarrerasByFacultad: async (facultadId: string) =>
    (await api.get<CarreraAdmin[]>(`/api/catalog/facultades/${facultadId}/carreras/all`)).data,

  createFacultad: async (payload: { code: string; name: string; isActive?: boolean }) =>
    (await api.post<FacultadAdmin>("/api/catalog/facultades", payload)).data,
  updateFacultad: async (
    id: string,
    payload: { code: string; name: string; isActive: boolean },
  ) =>
    (await api.put<FacultadAdmin>(`/api/catalog/facultades/${id}`, payload)).data,
  deactivateFacultad: async (id: string) =>
    api.post(`/api/catalog/facultades/${id}/deactivate`),
  deleteFacultad: async (id: string) =>
    api.delete(`/api/catalog/facultades/${id}`),

  createCarrera: async (payload: {
    facultadId: string;
    code: string | null;
    name: string;
    isActive?: boolean;
  }) => (await api.post<CarreraAdmin>("/api/catalog/carreras", payload)).data,
  updateCarrera: async (
    id: string,
    payload: {
      facultadId: string;
      code: string | null;
      name: string;
      isActive: boolean;
    },
  ) =>
    (await api.put<CarreraAdmin>(`/api/catalog/carreras/${id}`, payload)).data,
  deactivateCarrera: async (id: string) =>
    api.post(`/api/catalog/carreras/${id}/deactivate`),
  deleteCarrera: async (id: string) =>
    api.delete(`/api/catalog/carreras/${id}`),
};
