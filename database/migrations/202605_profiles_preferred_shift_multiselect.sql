-- Migration: allow up to 2 preferred shifts stored as comma-separated values
-- Drops the old single-value CHECK constraint and recreates it with the
-- combined-shift values that the backend PreferredShiftCodec can produce.

ALTER TABLE profiles
    DROP CONSTRAINT IF EXISTS chk_profiles_preferred_shift;

ALTER TABLE profiles
    ADD CONSTRAINT chk_profiles_preferred_shift
        CHECK (preferred_shift IS NULL OR preferred_shift IN (
            'MORNING',
            'AFTERNOON',
            'EVENING',
            'FLEXIBLE',
            'AFTERNOON,MORNING',
            'AFTERNOON,EVENING',
            'EVENING,MORNING'
        ));
