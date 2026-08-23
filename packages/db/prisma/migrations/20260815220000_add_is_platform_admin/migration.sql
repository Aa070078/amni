-- Add platform-admin flag to users (M6-003).
ALTER TABLE "users" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
