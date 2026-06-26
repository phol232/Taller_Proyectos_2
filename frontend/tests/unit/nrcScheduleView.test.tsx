import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NrcScheduleView from "@/components/schedule/student/NrcScheduleView";
import type { StudentPendingCourse } from "@/types/studentSchedule";

const course: StudentPendingCourse = {
  courseId: "course-1",
  courseCode: "INF-101",
  courseName: "Programación I",
  courseCycle: 1,
  courseCredits: 4,
  courseWeeklyHours: 4,
  requiredComponents: 1,
  prerequisites: [],
  sections: [
    {
      sectionId: "section-1",
      nrc: "NRC-001",
      sectionNumber: 1,
      availableVacancies: 10,
      components: [
        {
          assignmentId: "assignment-1",
          courseComponentId: "component-1",
          componentType: "THEORY",
          componentWeeklyHours: 4,
          teacherId: "teacher-1",
          teacherCode: "DOC-01",
          teacherName: "Docente Uno",
          slots: [
            {
              slotId: "slot-1",
              timeSlotId: "timeslot-1",
              dayOfWeek: "MONDAY",
              startTime: "07:00",
              endTime: "08:30",
              classroomId: "classroom-1",
              classroomCode: "A-101",
              classroomName: "Aula 101",
            },
          ],
        },
      ],
    },
  ],
};

describe("NrcScheduleView", () => {
  it("renderiza la grilla semanal del NRC", () => {
    const section = course.sections[0];
    render(<NrcScheduleView course={course} section={section} />);

    expect(screen.getByText("INF-101")).toBeInTheDocument();
    expect(screen.getByText(/programación i/i)).toBeInTheDocument();
    expect(screen.getAllByText(/lun/i).length).toBeGreaterThan(0);
  });
});
