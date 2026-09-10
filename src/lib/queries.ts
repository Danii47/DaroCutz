import { and, asc, desc, eq, gte, isNotNull, isNull } from "drizzle-orm"
import { db } from "./db"
import { appointments, locations, users } from "./db/schema"

/**
 * Todas las consultas parten de "ahora": una cita sigue siendo visible durante
 * el propio día hasta que pasa su hora. El filtro anterior la ocultaba a las
 * 00:00 del día de la cita, que es lo que hacía parecer que se borraban.
 */
function now(): Date {
  return new Date()
}

export interface AdminSlot {
  id: string
  appointmentDate: string
  status: string
  locationId: string | null
  locationName: string | null
  locationColor: string | null
  bookedBy: string | null
  bookedByPhone: string | null
}

/** Huecos futuros con toda la información: solo para el panel de administración. */
export async function getUpcomingSlots(): Promise<AdminSlot[]> {
  const rows = await db
    .select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      status: appointments.status,
      locationId: appointments.locationId,
      locationName: locations.name,
      locationColor: locations.color,
      bookedBy: users.fullName,
      bookedByPhone: users.phone,
    })
    .from(appointments)
    .leftJoin(users, eq(appointments.userId, users.id))
    .leftJoin(locations, eq(appointments.locationId, locations.id))
    .where(gte(appointments.appointmentDate, now()))
    .orderBy(asc(appointments.appointmentDate))

  return rows.map((row) => ({
    ...row,
    appointmentDate: row.appointmentDate.toISOString(),
  }))
}

export interface ClientSlot {
  id: string
  appointmentDate: string
  locationName: string | null
  locationAddress: string | null
  locationColor: string | null
  isBooked: boolean
  isMine: boolean
}

/**
 * Huecos futuros tal y como los ve un cliente. No se expone el id ni el nombre
 * de quien ha reservado: solo si está libre y si la reserva es suya.
 */
export async function getClientSlots(currentUserId: string | null): Promise<ClientSlot[]> {
  const rows = await db
    .select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      userId: appointments.userId,
      locationName: locations.name,
      locationAddress: locations.address,
      locationColor: locations.color,
    })
    .from(appointments)
    .leftJoin(locations, eq(appointments.locationId, locations.id))
    .where(gte(appointments.appointmentDate, now()))
    .orderBy(asc(appointments.appointmentDate))

  return rows.map((row) => ({
    id: row.id,
    appointmentDate: row.appointmentDate.toISOString(),
    locationName: row.locationName,
    locationAddress: row.locationAddress,
    locationColor: row.locationColor,
    isBooked: row.userId !== null,
    isMine: currentUserId !== null && row.userId === currentUserId,
  }))
}

export interface ReservedAppointment {
  id: string
  appointmentDate: string
  status: string
  userName: string | null
  userPhone: string | null
  userEmail: string | null
  locationName: string | null
  locationColor: string | null
}

export async function getReservedAppointments(): Promise<ReservedAppointment[]> {
  const rows = await db
    .select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      status: appointments.status,
      userName: users.fullName,
      userPhone: users.phone,
      userEmail: users.email,
      locationName: locations.name,
      locationColor: locations.color,
    })
    .from(appointments)
    .leftJoin(users, eq(appointments.userId, users.id))
    .leftJoin(locations, eq(appointments.locationId, locations.id))
    .where(and(gte(appointments.appointmentDate, now()), isNotNull(appointments.userId)))
    .orderBy(asc(appointments.appointmentDate))

  return rows.map((row) => ({
    ...row,
    appointmentDate: row.appointmentDate.toISOString(),
  }))
}

export async function countFreeSlots(): Promise<number> {
  const rows = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(gte(appointments.appointmentDate, now()), isNull(appointments.userId)))

  return rows.length
}

export interface PendingUser {
  id: string
  fullName: string
  email: string
  phone: string
  createdAt: string
}

export async function getPendingUsers(): Promise<PendingUser[]> {
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.isApproved, false), eq(users.isAdmin, false)))
    .orderBy(desc(users.createdAt))

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
}

export interface LocationRow {
  id: string
  name: string
  address: string | null
  color: string | null
  isDefault: boolean
  isActive: boolean
}

export async function getLocations(onlyActive = false): Promise<LocationRow[]> {
  const rows = await db
    .select({
      id: locations.id,
      name: locations.name,
      address: locations.address,
      color: locations.color,
      isDefault: locations.isDefault,
      isActive: locations.isActive,
    })
    .from(locations)
    .where(onlyActive ? eq(locations.isActive, true) : undefined)
    .orderBy(desc(locations.isDefault), asc(locations.name))

  return rows
}
