-- Migración idempotente: se puede ejecutar tantas veces como haga falta.
-- Cubre tanto una base de datos vacía como la que ya está en producción.

-- 1. Tipos ------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE "appointment_status" AS ENUM ('pending', 'confirmed', 'cancelled');
  END IF;
END $$;

-- 2. Tablas base ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "phone" varchar(20) NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "is_admin" boolean DEFAULT false NOT NULL,
  "is_approved" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "appointment_date" timestamp NOT NULL,
  "status" "appointment_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- 3. Lugares de las citas ---------------------------------------------------
CREATE TABLE IF NOT EXISTS "locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(120) NOT NULL,
  "address" varchar(255),
  "color" varchar(7),
  "is_default" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "locations_name_unique" ON "locations" ("name");

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "location_id" uuid;

-- 4. Claves foráneas --------------------------------------------------------
-- Se recrean para que borrar un usuario o un lugar no bloquee la operación
-- ni arrastre las citas: simplemente quedan sin asignar.
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_user_id_users_id_fk";
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_location_id_locations_id_fk";
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_location_id_locations_id_fk"
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL;

-- 5. Índices ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "appointments_date_idx" ON "appointments" ("appointment_date");

-- Solo un lugar puede estar marcado como predeterminado.
CREATE UNIQUE INDEX IF NOT EXISTS "locations_single_default"
  ON "locations" (("is_default")) WHERE "is_default";

-- No puede haber dos huecos a la misma hora. Se crea solo si los datos
-- actuales lo permiten; si hubiera duplicados históricos se omite y se avisa.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "appointments"
    GROUP BY "appointment_date" HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "appointments_date_unique"
      ON "appointments" ("appointment_date");
  ELSE
    RAISE NOTICE 'Hay citas duplicadas a la misma hora: se omite el índice único appointments_date_unique.';
  END IF;
END $$;
