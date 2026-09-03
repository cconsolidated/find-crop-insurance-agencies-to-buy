ALTER TABLE "people" ADD COLUMN "source_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "people_source_key_idx" ON "people" USING btree ("source_key");