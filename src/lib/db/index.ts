import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL no está definida")
}

const client = postgres(connectionString)
export const db = drizzle(client, { schema })

export type User = typeof schema.users.$inferSelect
export type NewUser = typeof schema.users.$inferInsert
export type Appointment = typeof schema.appointments.$inferSelect
export type NewAppointment = typeof schema.appointments.$inferInsert