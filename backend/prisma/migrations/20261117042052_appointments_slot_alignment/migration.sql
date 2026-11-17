-- R2 depends on slots being aligned: the partial unique index only blocks identical instants,
-- so a misaligned 14:15 booking could coexist with 14:00 and double-book the single room.
-- Every appointment must start exactly on a 30-minute boundary (:00 or :30, zero seconds).
-- Epoch-based, so it holds in any time zone whose offset is a multiple of 30 minutes (Brazil: -03:00).
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_slot_alignment_check"
  CHECK (EXTRACT(EPOCH FROM "scheduled_at") % 1800 = 0);
