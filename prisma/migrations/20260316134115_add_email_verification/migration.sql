-- AlterTable
ALTER TABLE "volunteer_applications" ADD COLUMN     "attendance_status" VARCHAR(20);

-- AlterTable
ALTER TABLE "volunteer_posts" ADD COLUMN     "activity_images" JSONB,
ADD COLUMN     "thumbnail_image_url" VARCHAR(512);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_verification_email_index" ON "email_verifications"("email");
