package online.horarios_api.courseoffering.infrastructure.in.web.dto;

import online.horarios_api.courseoffering.domain.model.SectionTeacherCandidate;

import java.util.UUID;

public record SectionTeacherCandidateResponse(
        UUID teacherId,
        double priorityWeight
) {
    public static SectionTeacherCandidateResponse from(SectionTeacherCandidate candidate) {
        return new SectionTeacherCandidateResponse(candidate.teacherId(), candidate.priorityWeight());
    }
}
