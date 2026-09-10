import { pgTable, uuid, varchar, boolean, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";

// Appointment status enum
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "cancelled"
])

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Locations table: los sitios donde el barbero atiende, gestionados desde el panel.
export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  address: varchar("address", { length: 255 }),
  color: varchar("color", { length: 7 }),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("locations_name_unique").on(table.name),
])

// Appointments table
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  appointmentDate: timestamp("appointment_date").notNull(),
  status: appointmentStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("appointments_date_idx").on(table.appointmentDate),
])
