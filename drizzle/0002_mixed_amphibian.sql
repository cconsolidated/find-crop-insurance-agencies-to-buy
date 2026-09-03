CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"person_id" uuid,
	"source" text NOT NULL,
	"source_key" text NOT NULL,
	"aip_code" text,
	"county_code" text,
	"county_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"normalized_address" text NOT NULL,
	"address_line_1" text,
	"address_line_2" text,
	"city" text NOT NULL,
	"state" text DEFAULT 'TX' NOT NULL,
	"postal_code" text,
	"phone" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"from_stage" text,
	"to_stage" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "succession_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"owner_name" text,
	"owner_age_band" text,
	"succession_score" integer DEFAULT 0 NOT NULL,
	"owner_operated_score" integer DEFAULT 0 NOT NULL,
	"confidence_score" integer DEFAULT 0 NOT NULL,
	"risk_score" integer DEFAULT 50 NOT NULL,
	"summary" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "county_premiums" ADD COLUMN "stale" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offices" ADD CONSTRAINT "offices_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "succession_assessments" ADD CONSTRAINT "succession_assessments_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listings_source_key_idx" ON "listings" USING btree ("source","source_key");--> statement-breakpoint
CREATE INDEX "listings_agency_idx" ON "listings" USING btree ("agency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offices_agency_address_idx" ON "offices" USING btree ("agency_id","normalized_address");--> statement-breakpoint
CREATE INDEX "succession_assessments_agency_idx" ON "succession_assessments" USING btree ("agency_id");