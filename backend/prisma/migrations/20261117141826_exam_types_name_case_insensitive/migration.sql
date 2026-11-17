-- Exam type names are unique regardless of case ("Mamografia" = "mamografia"). The existing
-- exam_types_name_key compares the exact text, so two concurrent creations differing only in case
-- would both pass an application check. This expression index makes the database the guard.
CREATE UNIQUE INDEX "exam_types_name_lower_key" ON "exam_types" (lower("name"));
