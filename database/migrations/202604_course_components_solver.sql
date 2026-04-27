CREATE TABLE IF NOT EXISTS course_components (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id           UUID         NOT NULL,
    component_type      VARCHAR(20)  NOT NULL,
    weekly_hours        INTEGER      NOT NULL CHECK (weekly_hours >= 1),
    required_room_type  VARCHAR(100) NOT NULL CHECK (BTRIM(required_room_type) <> ''),
    sort_order          INTEGER      NOT NULL DEFAULT 1 CHECK (sort_order >= 1),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_components_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT chk_course_components_type
        CHECK (component_type IN ('GENERAL', 'THEORY', 'PRACTICE')),
    CONSTRAINT uq_course_components_type UNIQUE (course_id, component_type),
    CONSTRAINT uq_course_components_sort UNIQUE (course_id, sort_order)
);

CREATE TABLE IF NOT EXISTS teacher_course_components (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id          UUID        NOT NULL,
    course_component_id UUID        NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_teacher_course_components_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_course_components_component
        FOREIGN KEY (course_component_id) REFERENCES course_components(id) ON DELETE CASCADE,
    CONSTRAINT uq_teacher_course_components UNIQUE (teacher_id, course_component_id)
);

INSERT INTO course_components (
    course_id, component_type, weekly_hours, required_room_type, sort_order, is_active
)
SELECT c.id, 'GENERAL', c.weekly_hours, c.required_room_type, 1, c.is_active
FROM   courses c
WHERE  NOT EXISTS (
    SELECT 1
    FROM   course_components cc
    WHERE  cc.course_id = c.id
);

INSERT INTO teacher_course_components (teacher_id, course_component_id)
SELECT tc.teacher_id, cc.id
FROM   teacher_courses tc
JOIN   course_components cc ON cc.course_id = tc.course_id
WHERE  cc.is_active = TRUE
ON CONFLICT (teacher_id, course_component_id) DO NOTHING;

ALTER TABLE course_schedule_assignments
    ADD COLUMN IF NOT EXISTS course_component_id UUID;

UPDATE course_schedule_assignments csa
SET    course_component_id = cc.id
FROM   course_components cc
WHERE  csa.course_component_id IS NULL
  AND  cc.course_id = csa.course_id
  AND  cc.component_type = 'GENERAL';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_course_schedule_assignments_component'
    ) THEN
        ALTER TABLE course_schedule_assignments
            ADD CONSTRAINT fk_course_schedule_assignments_component
                FOREIGN KEY (course_component_id) REFERENCES course_components(id) ON DELETE RESTRICT;
    END IF;
END;
$$;

ALTER TABLE course_schedule_assignments
    ALTER COLUMN course_component_id SET NOT NULL;

ALTER TABLE course_assignment_slots
    ADD COLUMN IF NOT EXISTS course_component_id UUID;

UPDATE course_assignment_slots cas
SET    course_component_id = csa.course_component_id
FROM   course_schedule_assignments csa
WHERE  cas.course_component_id IS NULL
  AND  csa.id = cas.course_assignment_id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_course_assignment_slots_component'
    ) THEN
        ALTER TABLE course_assignment_slots
            ADD CONSTRAINT fk_course_assignment_slots_component
                FOREIGN KEY (course_component_id) REFERENCES course_components(id) ON DELETE RESTRICT;
    END IF;
END;
$$;

ALTER TABLE course_assignment_slots
    ALTER COLUMN course_component_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS student_schedule_item_components (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    student_schedule_item_id UUID     NOT NULL,
    course_component_id  UUID         NOT NULL,
    course_assignment_id UUID         NOT NULL,
    item_status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ssic_item
        FOREIGN KEY (student_schedule_item_id) REFERENCES student_schedule_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_ssic_component
        FOREIGN KEY (course_component_id) REFERENCES course_components(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ssic_assignment
        FOREIGN KEY (course_assignment_id) REFERENCES course_schedule_assignments(id) ON DELETE RESTRICT,
    CONSTRAINT uq_ssic_item_component UNIQUE (student_schedule_item_id, course_component_id),
    CONSTRAINT chk_ssic_status CHECK (item_status IN ('ACTIVE', 'REMOVED'))
);

INSERT INTO student_schedule_item_components (
    student_schedule_item_id, course_component_id, course_assignment_id, item_status
)
SELECT ssi.id, csa.course_component_id, ssi.course_assignment_id, ssi.item_status
FROM   student_schedule_items ssi
JOIN   course_schedule_assignments csa ON csa.id = ssi.course_assignment_id
WHERE  ssi.course_assignment_id IS NOT NULL
ON CONFLICT (student_schedule_item_id, course_component_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_course_components_course_id
    ON course_components(course_id);
CREATE INDEX IF NOT EXISTS idx_course_components_active
    ON course_components(course_id, sort_order) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_teacher_course_components_teacher_id
    ON teacher_course_components(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_course_components_component_id
    ON teacher_course_components(course_component_id);
CREATE INDEX IF NOT EXISTS idx_course_schedule_assignments_component_id
    ON course_schedule_assignments(course_component_id);
CREATE INDEX IF NOT EXISTS idx_course_assignment_slots_component_id
    ON course_assignment_slots(course_component_id);
CREATE INDEX IF NOT EXISTS idx_ssic_item_id
    ON student_schedule_item_components(student_schedule_item_id);
CREATE INDEX IF NOT EXISTS idx_ssic_component_id
    ON student_schedule_item_components(course_component_id);
CREATE INDEX IF NOT EXISTS idx_ssic_assignment_id
    ON student_schedule_item_components(course_assignment_id);
