#!/usr/bin/env node
// Aplica los .sql de ./drizzle en orden alfabético antes de arrancar el servidor.
// Todos son idempotentes, así que se ejecutan en cada despliegue sin riesgo.
import { readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import postgres from "postgres"

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle")
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("[migrate] DATABASE_URL no está definida")
  process.exit(1)
}

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 30,
  onnotice: (notice) => console.warn(`[migrate] ${notice.message}`),
})

try {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort()

  if (files.length === 0) {
    console.log("[migrate] No hay migraciones que aplicar")
  }

  for (const file of files) {
    const statements = await readFile(join(migrationsDir, file), "utf8")
    process.stdout.write(`[migrate] Aplicando ${file}... `)
    await sql.begin((tx) => tx.unsafe(statements))
    console.log("ok")
  }

  console.log("[migrate] Base de datos al día")
} catch (error) {
  console.error("[migrate] Error aplicando migraciones:", error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
