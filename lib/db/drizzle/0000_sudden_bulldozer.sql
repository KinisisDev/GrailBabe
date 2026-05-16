CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"tier" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text,
	"subscription_interval" text,
	"subscription_current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"screenname" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text DEFAULT 'US',
	"lat" real,
	"lng" real,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"screenname_changed_at" timestamp with time zone,
	"former_screenname" text,
	"former_screenname_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"category" text NOT NULL,
	"condition" text NOT NULL,
	"purchase_price" numeric(12, 2),
	"current_value" numeric(12, 2),
	"purchase_date" date,
	"notes" text,
	"photos" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"sku" text,
	"favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_item_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vault_item_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"storage_path" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grail_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"target_price" numeric(12, 2),
	"notes" text,
	"image_url" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"acquired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"requester_id" text,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"condition" text NOT NULL,
	"asking_price" numeric(12, 2),
	"photos" text[] DEFAULT '{}' NOT NULL,
	"kind" text DEFAULT 'trade' NOT NULL,
	"wanted_items" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"completion_confirmed_by_poster" boolean DEFAULT false NOT NULL,
	"completion_confirmed_by_requester" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"vault_item_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"trade_id" integer NOT NULL,
	"reviewer_id" text NOT NULL,
	"reviewed_user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_reviews_trade_reviewer_uniq" UNIQUE("trade_id","reviewer_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"category" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"reaction" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_votes" (
	"post_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"value" integer NOT NULL,
	CONSTRAINT "post_votes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"item_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_a" text NOT NULL,
	"participant_b" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vault_item_images" ADD CONSTRAINT "vault_item_images_vault_item_id_collection_items_id_fk" FOREIGN KEY ("vault_item_id") REFERENCES "public"."collection_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_reviews" ADD CONSTRAINT "trade_reviews_trade_id_trade_posts_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trade_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_screenname_lower_uniq" ON "user_profiles" USING btree (lower("screenname"));--> statement-breakpoint
CREATE INDEX "collection_items_user_idx" ON "collection_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "collection_items_category_idx" ON "collection_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "vault_item_images_vault_item_idx" ON "vault_item_images" USING btree ("vault_item_id");--> statement-breakpoint
CREATE INDEX "vault_item_images_user_idx" ON "vault_item_images" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vault_item_images_one_primary_idx" ON "vault_item_images" USING btree ("vault_item_id") WHERE "vault_item_images"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "price_snapshots_item_idx" ON "price_snapshots" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "grail_user_idx" ON "grail_list_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trade_user_idx" ON "trade_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trade_status_idx" ON "trade_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trade_requester_idx" ON "trade_posts" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "trade_vault_item_idx" ON "trade_posts" USING btree ("vault_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_active_vault_item_uniq" ON "trade_posts" USING btree ("user_id","vault_item_id") WHERE "trade_posts"."vault_item_id" is not null and "trade_posts"."status" in ('open', 'pending');--> statement-breakpoint
CREATE INDEX "trade_reviews_reviewed_idx" ON "trade_reviews" USING btree ("reviewed_user_id");--> statement-breakpoint
CREATE INDEX "trade_reviews_trade_idx" ON "trade_reviews" USING btree ("trade_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_reactions_user_post_uniq" ON "post_reactions" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "post_replies_post_idx" ON "post_replies" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_votes_post_idx" ON "post_votes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "activity_user_idx" ON "activity_events" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_pair_uniq" ON "conversations" USING btree ("participant_a","participant_b");