-- Step 1: Add property_id column as nullable first
ALTER TABLE "house_types" ADD COLUMN "property_id" varchar;

-- Step 2: Update existing house_types to assign them to the first property
-- This assumes you have at least one property in your database
UPDATE "house_types" 
SET "property_id" = (SELECT id FROM properties LIMIT 1)
WHERE "property_id" IS NULL;

-- Step 3: Make property_id NOT NULL
ALTER TABLE "house_types" ALTER COLUMN "property_id" SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE "house_types" ADD CONSTRAINT "house_types_property_id_properties_id_fk" 
FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;

