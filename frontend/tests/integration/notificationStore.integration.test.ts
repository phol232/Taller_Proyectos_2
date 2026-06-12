import { beforeEach, describe, expect, it } from "vitest";
import { useNotificationStore } from "@/store/notification.store";
import type { Conflict } from "@/types/schedule";

const makeConflict = (type: Conflict["type"] = "overlap_teacher"): Conflict => ({
  type,
  message: `Conflicto de tipo ${type}`,
  resource: "resource-1",
  timeSlot: { day: "MONDAY", startTime: "07:00", endTime: "08:30" },
});

describe("notificationStore — integración", () => {
  beforeEach(() => {
    useNotificationStore.setState({
      conflicts: [],
      systemNotifications: [
        { id: "welcome", kind: "welcome", read: false },
        { id: "schedule", kind: "schedule", read: false },
        { id: "security", kind: "security", read: true },
      ],
    });
  });

  describe("estado inicial", () => {
    it("conflicts está vacío por defecto", () => {
      expect(useNotificationStore.getState().conflicts).toEqual([]);
    });

    it("systemNotifications tiene tres notificaciones iniciales", () => {
      const { systemNotifications } = useNotificationStore.getState();
      expect(systemNotifications).toHaveLength(3);
    });

    it("la notificación de seguridad está marcada como leída inicialmente", () => {
      const security = useNotificationStore.getState().systemNotifications.find(
        (n) => n.kind === "security",
      );
      expect(security?.read).toBe(true);
    });
  });

  describe("addConflict", () => {
    it("agrega un conflicto a la lista", () => {
      const conflict = makeConflict("overlap_teacher");
      useNotificationStore.getState().addConflict(conflict);

      expect(useNotificationStore.getState().conflicts).toHaveLength(1);
      expect(useNotificationStore.getState().conflicts[0]).toEqual(conflict);
    });

    it("acumula múltiples conflictos", () => {
      useNotificationStore.getState().addConflict(makeConflict("overlap_teacher"));
      useNotificationStore.getState().addConflict(makeConflict("overlap_classroom"));
      useNotificationStore.getState().addConflict(makeConflict("credits_exceeded"));

      expect(useNotificationStore.getState().conflicts).toHaveLength(3);
    });

    it("preserva conflictos existentes al agregar uno nuevo", () => {
      const first = makeConflict("overlap_teacher");
      const second = makeConflict("no_vacancy");

      useNotificationStore.getState().addConflict(first);
      useNotificationStore.getState().addConflict(second);

      const conflicts = useNotificationStore.getState().conflicts;
      expect(conflicts[0]).toEqual(first);
      expect(conflicts[1]).toEqual(second);
    });

    it("puede agregar conflictos de todos los tipos soportados", () => {
      const types: Conflict["type"][] = [
        "overlap_teacher",
        "overlap_classroom",
        "overlap_student",
        "credits_exceeded",
        "prerequisite_missing",
        "no_vacancy",
        "no_solution",
      ];

      for (const type of types) {
        useNotificationStore.getState().addConflict(makeConflict(type));
      }

      expect(useNotificationStore.getState().conflicts).toHaveLength(types.length);
    });
  });

  describe("clearConflicts", () => {
    it("vacía la lista de conflictos", () => {
      useNotificationStore.getState().addConflict(makeConflict());
      useNotificationStore.getState().addConflict(makeConflict());

      useNotificationStore.getState().clearConflicts();

      expect(useNotificationStore.getState().conflicts).toEqual([]);
    });

    it("no lanza si se llama sin conflictos activos", () => {
      expect(() => useNotificationStore.getState().clearConflicts()).not.toThrow();
    });

    it("no afecta las systemNotifications al limpiar conflictos", () => {
      useNotificationStore.getState().addConflict(makeConflict());
      useNotificationStore.getState().clearConflicts();

      expect(useNotificationStore.getState().systemNotifications).toHaveLength(3);
    });
  });

  describe("markAllNotificationsRead", () => {
    it("marca todas las notificaciones del sistema como leídas", () => {
      useNotificationStore.getState().markAllNotificationsRead();

      const all = useNotificationStore.getState().systemNotifications;
      expect(all.every((n) => n.read)).toBe(true);
    });

    it("mantiene la cantidad de notificaciones del sistema igual", () => {
      useNotificationStore.getState().markAllNotificationsRead();

      expect(useNotificationStore.getState().systemNotifications).toHaveLength(3);
    });

    it("preserva los ids y kinds de las notificaciones", () => {
      useNotificationStore.getState().markAllNotificationsRead();

      const all = useNotificationStore.getState().systemNotifications;
      expect(all.find((n) => n.id === "welcome")?.kind).toBe("welcome");
      expect(all.find((n) => n.id === "schedule")?.kind).toBe("schedule");
      expect(all.find((n) => n.id === "security")?.kind).toBe("security");
    });

    it("es idempotente — marcar dos veces no cambia el resultado", () => {
      useNotificationStore.getState().markAllNotificationsRead();
      useNotificationStore.getState().markAllNotificationsRead();

      expect(useNotificationStore.getState().systemNotifications.every((n) => n.read)).toBe(true);
    });
  });
});
