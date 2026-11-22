-- Enforce tenant consistency for contact tags and consent records at the database boundary.
CREATE UNIQUE INDEX "Contact_id_organizationId_key" ON "Contact"("id", "organizationId");
CREATE UNIQUE INDEX "ContactTag_id_organizationId_key" ON "ContactTag"("id", "organizationId");

ALTER TABLE "ContactTagAssignment" ADD COLUMN "organizationId" TEXT;
UPDATE "ContactTagAssignment" AS assignment
SET "organizationId" = contact."organizationId"
FROM "Contact" AS contact
WHERE assignment."contactId" = contact."id";
ALTER TABLE "ContactTagAssignment" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "ContactTagAssignment"
  ADD CONSTRAINT "ContactTagAssignment_contactId_organizationId_fkey"
  FOREIGN KEY ("contactId", "organizationId")
  REFERENCES "Contact"("id", "organizationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContactTagAssignment"
  ADD CONSTRAINT "ContactTagAssignment_tagId_organizationId_fkey"
  FOREIGN KEY ("tagId", "organizationId")
  REFERENCES "ContactTag"("id", "organizationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsentRecord"
  ADD CONSTRAINT "ConsentRecord_contactId_organizationId_fkey"
  FOREIGN KEY ("contactId", "organizationId")
  REFERENCES "Contact"("id", "organizationId")
  ON DELETE CASCADE ON UPDATE CASCADE;
