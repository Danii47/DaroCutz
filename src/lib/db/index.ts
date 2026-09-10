import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

type Database = PostgresJsDatabase<typeof schema>

let instance: Database | null = null

// La conexión se crea de forma perezosa: así `astro build` no necesita tener
// DATABASE_URL disponible y los secretos no hacen falta al construir la imagen.
function getDb(): Database {
  if (instance) return instance

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida")
  }

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  instance = drizzle(client, { schema })
  return instance
}

export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const real = getDb() as any
    const value = Reflect.get(real, prop, receiver)
    return typeof value === "function" ? value.bind(real) : value
  },
})

export type User = typeof schema.users.$inferSelect
export type NewUser = typeof schema.users.$inferInsert
export type Appointment = typeof schema.appointments.$inferSelect
export type NewAppointment = typeof schema.appointments.$inferInsert
export type Location = typeof schema.locations.$inferSelect
export type NewLocation = typeof schema.locations.$inferInsert
