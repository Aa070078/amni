CREATE TYPE "ProductRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'SALES', 'INVENTORY', 'MEMBER');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISABLED', 'EXPIRED');
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

ALTER TABLE "memberships"
  ADD COLUMN "productRole" "ProductRole" NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "memberships"
SET "productRole" = CASE
  WHEN "platformRole" IN ('OWNER', 'ADMIN') THEN 'ADMIN'::"ProductRole"
  ELSE 'MEMBER'::"ProductRole"
END;

ALTER TABLE "invitations"
  ADD COLUMN "productRole" "ProductRole" NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "firstName" VARCHAR(80) NOT NULL DEFAULT 'Invited',
  ADD COLUMN "lastName" VARCHAR(80);

ALTER TABLE "subscriptions"
  ADD COLUMN "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY';

CREATE INDEX "memberships_companyId_status_idx" ON "memberships"("companyId", "status");
CREATE INDEX "invitations_companyId_status_idx" ON "invitations"("companyId", "status");
