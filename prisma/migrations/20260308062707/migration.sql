-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('PARTICIPANT_TO_ORGANIZER', 'ORGANIZER_TO_PARTICIPANT');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "phone" TEXT,
    "profile_img_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "role" TEXT NOT NULL DEFAULT 'USER',
    "login_method" TEXT DEFAULT 'EMAIL',
    "last_login_at" TIMESTAMP(3),
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locations" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "user_id" BIGINT,
    "name" TEXT NOT NULL,
    "country_code" TEXT,
    "area_1" TEXT,
    "area_2" TEXT,
    "area_3" TEXT,
    "postal_code" TEXT,
    "address_1" TEXT,
    "address_2" TEXT,
    "address_3" TEXT,
    "formatted_address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_posts" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "author_user_id" BIGINT NOT NULL,
    "author_type" TEXT NOT NULL,
    "category_id" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "shelter_name" TEXT NOT NULL,
    "area_1" TEXT,
    "area_2" TEXT,
    "area_3" TEXT,
    "postal_code" TEXT,
    "address_1" TEXT,
    "address_2" TEXT,
    "address_3" TEXT,
    "formatted_address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECRUITING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "volunteer_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_time_slots" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "volunteer_post_id" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "max_participants" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "volunteer_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_post_items" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "volunteer_post_id" BIGINT NOT NULL,
    "item_id" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "volunteer_post_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_applications" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "volunteer_post_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "applicant_name" VARCHAR(50),
    "applicant_phone" VARCHAR(20),
    "attended" BOOLEAN,
    "is_notified_allowed" BOOLEAN DEFAULT true,
    "is_attention_agreed" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "volunteer_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_application_cancellations" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "application_id" BIGINT NOT NULL,
    "reason" TEXT,
    "cancelled_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_application_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_time_slots" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "volunteer_application_id" BIGINT NOT NULL,
    "volunteer_time_slot_id" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmark_groups" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bookmark_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 1,
    "bookmark_group_id" BIGINT NOT NULL,
    "volunteer_post_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_groups" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "avg_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "total_hearts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reputation_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "reputation_group_id" BIGINT NOT NULL,
    "writer_id" BIGINT NOT NULL,
    "volunteer_post_id" BIGINT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "review_type" "ReviewType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_bucket" (
    "id" BIGSERIAL NOT NULL,
    "guid" VARCHAR(40) NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'NONE',
    "entity" TEXT NOT NULL,
    "entity_column" TEXT NOT NULL,
    "entity_guid" TEXT,
    "path" TEXT NOT NULL,
    "origin_filename" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "ext" TEXT NOT NULL,
    "encoding" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "is_used" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "file_bucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_guid_key" ON "users"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE INDEX "user_status_index" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_guid_key" ON "accounts"("guid");

-- CreateIndex
CREATE INDEX "account_user_id_index" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_id_key" ON "accounts"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_locations_guid_key" ON "user_locations"("guid");

-- CreateIndex
CREATE INDEX "user_location_user_id_index" ON "user_locations"("user_id");

-- CreateIndex
CREATE INDEX "user_location_area_index" ON "user_locations"("area_1", "area_2", "area_3");

-- CreateIndex
CREATE UNIQUE INDEX "categories_guid_key" ON "categories"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "category_type_index" ON "categories"("type");

-- CreateIndex
CREATE INDEX "category_name_index" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_posts_guid_key" ON "volunteer_posts"("guid");

-- CreateIndex
CREATE INDEX "volunteer_post_author_user_id_index" ON "volunteer_posts"("author_user_id");

-- CreateIndex
CREATE INDEX "volunteer_post_category_id_index" ON "volunteer_posts"("category_id");

-- CreateIndex
CREATE INDEX "volunteer_post_status_index" ON "volunteer_posts"("status");

-- CreateIndex
CREATE INDEX "volunteer_post_date_range_index" ON "volunteer_posts"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "volunteer_post_area_index" ON "volunteer_posts"("area_1", "area_2", "area_3");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_time_slots_guid_key" ON "volunteer_time_slots"("guid");

-- CreateIndex
CREATE INDEX "volunteer_time_slot_volunteer_post_id_index" ON "volunteer_time_slots"("volunteer_post_id");

-- CreateIndex
CREATE INDEX "volunteer_time_slot_date_index" ON "volunteer_time_slots"("date");

-- CreateIndex
CREATE INDEX "volunteer_time_slot_status_index" ON "volunteer_time_slots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "items_guid_key" ON "items"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "items_name_key" ON "items"("name");

-- CreateIndex
CREATE INDEX "item_type_index" ON "items"("type");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_post_items_guid_key" ON "volunteer_post_items"("guid");

-- CreateIndex
CREATE INDEX "volunteer_post_item_volunteer_post_id_index" ON "volunteer_post_items"("volunteer_post_id");

-- CreateIndex
CREATE INDEX "volunteer_post_item_item_id_index" ON "volunteer_post_items"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_post_items_volunteer_post_id_item_id_key" ON "volunteer_post_items"("volunteer_post_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_applications_guid_key" ON "volunteer_applications"("guid");

-- CreateIndex
CREATE INDEX "volunteer_application_user_id_index" ON "volunteer_applications"("user_id");

-- CreateIndex
CREATE INDEX "volunteer_application_volunteer_post_id_index" ON "volunteer_applications"("volunteer_post_id");

-- CreateIndex
CREATE INDEX "volunteer_application_status_index" ON "volunteer_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_applications_user_id_volunteer_post_id_key" ON "volunteer_applications"("user_id", "volunteer_post_id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_application_cancellations_guid_key" ON "volunteer_application_cancellations"("guid");

-- CreateIndex
CREATE INDEX "volunteer_application_cancellation_application_id_index" ON "volunteer_application_cancellations"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_time_slots_guid_key" ON "application_time_slots"("guid");

-- CreateIndex
CREATE INDEX "application_time_slot_volunteer_application_id_index" ON "application_time_slots"("volunteer_application_id");

-- CreateIndex
CREATE INDEX "application_time_slot_volunteer_time_slot_id_index" ON "application_time_slots"("volunteer_time_slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_time_slots_volunteer_application_id_volunteer_t_key" ON "application_time_slots"("volunteer_application_id", "volunteer_time_slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookmark_groups_guid_key" ON "bookmark_groups"("guid");

-- CreateIndex
CREATE INDEX "bookmark_group_user_id_index" ON "bookmark_groups"("user_id");

-- CreateIndex
CREATE INDEX "bookmark_group_category_index" ON "bookmark_groups"("category");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_guid_key" ON "bookmarks"("guid");

-- CreateIndex
CREATE INDEX "bookmark_bookmark_group_id_index" ON "bookmarks"("bookmark_group_id");

-- CreateIndex
CREATE INDEX "bookmark_volunteer_post_id_index" ON "bookmarks"("volunteer_post_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_bookmark_group_id_volunteer_post_id_key" ON "bookmarks"("bookmark_group_id", "volunteer_post_id");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_groups_guid_key" ON "reputation_groups"("guid");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_groups_user_id_key" ON "reputation_groups"("user_id");

-- CreateIndex
CREATE INDEX "reputation_group_user_id_index" ON "reputation_groups"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_guid_key" ON "reviews"("guid");

-- CreateIndex
CREATE INDEX "review_reputation_group_id_index" ON "reviews"("reputation_group_id");

-- CreateIndex
CREATE INDEX "review_writer_id_index" ON "reviews"("writer_id");

-- CreateIndex
CREATE INDEX "review_volunteer_post_id_index" ON "reviews"("volunteer_post_id");

-- CreateIndex
CREATE UNIQUE INDEX "file_bucket_guid_key" ON "file_bucket"("guid");

-- CreateIndex
CREATE INDEX "file_bucket_entity_guid_index" ON "file_bucket"("entity_guid");

-- CreateIndex
CREATE INDEX "file_bucket_entity_column_index" ON "file_bucket"("entity_column");

-- CreateIndex
CREATE INDEX "file_bucket_entity_guid_and_column_index" ON "file_bucket"("entity_guid", "entity_column");
