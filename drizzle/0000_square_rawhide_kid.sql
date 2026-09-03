CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"city" text NOT NULL,
	"county_code" text,
	"county_name" text,
	"state" text DEFAULT 'TX' NOT NULL,
	"postal_code" text,
	"latitude" double precision,
	"longitude" double precision,
	"phone" text,
	"email" text,
	"website" text,
	"owner_name" text,
	"owner_age_band" text,
	"office_count" integer DEFAULT 1 NOT NULL,
	"agent_count" integer DEFAULT 1 NOT NULL,
	"staff_low" integer DEFAULT 1 NOT NULL,
	"staff_base" integer DEFAULT 2 NOT NULL,
	"staff_high" integer DEFAULT 3 NOT NULL,
	"estimated_premium_low" double precision DEFAULT 0 NOT NULL,
	"estimated_premium_base" double precision DEFAULT 0 NOT NULL,
	"estimated_premium_high" double precision DEFAULT 0 NOT NULL,
	"estimated_revenue" double precision DEFAULT 0 NOT NULL,
	"estimated_ebitda" double precision DEFAULT 0 NOT NULL,
	"estimated_sde" double precision DEFAULT 0 NOT NULL,
	"succession_score" integer DEFAULT 0 NOT NULL,
	"opportunity_score" integer DEFAULT 0 NOT NULL,
	"confidence_score" integer DEFAULT 0 NOT NULL,
	"risk_score" integer DEFAULT 50 NOT NULL,
	"pipeline_stage" text DEFAULT 'new' NOT NULL,
	"research_status" text DEFAULT 'unresearched' NOT NULL,
	"summary" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_source_refresh_at" timestamp with time zone,
	"last_researched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" text DEFAULT 'agent' NOT NULL,
	"relationship_status" text DEFAULT 'observed' NOT NULL,
	"source_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_run_id" uuid,
	"agency_id" uuid,
	"generation_id" text,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ambiguous_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"source" text NOT NULL,
	"candidate_payload" jsonb NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "county_premiums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commodity_year" integer NOT NULL,
	"county_code" text NOT NULL,
	"county_name" text NOT NULL,
	"total_premium" double precision DEFAULT 0 NOT NULL,
	"total_liability" double precision DEFAULT 0 NOT NULL,
	"policies_earning_premium" integer DEFAULT 0 NOT NULL,
	"crop_mix" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"name" text DEFAULT 'Base case' NOT NULL,
	"inputs" jsonb NOT NULL,
	"outputs" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"category" text NOT NULL,
	"classification" text NOT NULL,
	"claim" text NOT NULL,
	"excerpt" text,
	"source_url" text,
	"source_title" text,
	"confidence" integer DEFAULT 0 NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"assumptions" jsonb NOT NULL,
	"results" jsonb NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"cursor" text,
	"processed" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_name" text NOT NULL,
	"display_name" text NOT NULL,
	"npn" text,
	"email" text,
	"phone" text,
	"age_band" text,
	"business_only" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"model" text,
	"prompt_version" text DEFAULT 'v1' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_counties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"county_code" text NOT NULL,
	"county_name" text,
	"active_agent_count" integer DEFAULT 1 NOT NULL,
	"source" text DEFAULT 'rma' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid,
	"source" text NOT NULL,
	"source_key" text NOT NULL,
	"source_url" text,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stale" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp with time zone,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_people" ADD CONSTRAINT "agency_people_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_people" ADD CONSTRAINT "agency_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_research_run_id_research_runs_id_fk" FOREIGN KEY ("research_run_id") REFERENCES "public"."research_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambiguous_matches" ADD CONSTRAINT "ambiguous_matches_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_scenarios" ADD CONSTRAINT "deal_scenarios_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_estimates" ADD CONSTRAINT "financial_estimates_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_counties" ADD CONSTRAINT "service_counties_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agencies_slug_idx" ON "agencies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "agencies_score_idx" ON "agencies" USING btree ("opportunity_score");--> statement-breakpoint
CREATE INDEX "agencies_stage_idx" ON "agencies" USING btree ("pipeline_stage");--> statement-breakpoint
CREATE INDEX "agencies_county_idx" ON "agencies" USING btree ("county_code");--> statement-breakpoint
CREATE UNIQUE INDEX "agency_people_unique_idx" ON "agency_people" USING btree ("agency_id","person_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "county_premiums_year_county_idx" ON "county_premiums" USING btree ("commodity_year","county_code");--> statement-breakpoint
CREATE INDEX "deal_scenarios_agency_idx" ON "deal_scenarios" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "evidence_agency_idx" ON "evidence" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "financial_estimates_agency_idx" ON "financial_estimates" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "people_name_idx" ON "people" USING btree ("normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "people_npn_idx" ON "people" USING btree ("npn");--> statement-breakpoint
CREATE UNIQUE INDEX "service_counties_unique_idx" ON "service_counties" USING btree ("agency_id","county_code");--> statement-breakpoint
CREATE UNIQUE INDEX "source_records_key_idx" ON "source_records" USING btree ("source","source_key");