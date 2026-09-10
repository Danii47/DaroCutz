import type { APIRoute } from "astro"
import { and, eq } from "drizzle-orm"
import { created, errors, fail, isUuid, ok, readJson, requireAdmin, requireUser } from "@/lib/api"
import { db } from "@/lib/db"
import { appointments, locations } from "@/lib/db/schema"
import { madridToInstant } from "@/lib/datetime"
import { getClientSlots, getReservedAppointments, getUpcomingSlots } from "@/lib/queries"

export const GET: APIRoute = async ({ url, locals }) => {
  const { user, response } = requireUser(locals)
  if (!user) return response

  try {
    const type = url.searchParams.get("type") || "all"

    if (type === "all") {
      // Un cliente solo ve si el hueco está libre o es suyo; el panel recibe
      // además el lugar y quién ha reservado.
      const appointmentsList = user.isAdmin
        ? await getUpcomingSlots()
        : await getClientSlots(user.id)

      return ok({ appointments: appointmentsList })
    }

    if (type === "reserved") {
      if (!user.isAdmin) return errors.forbidden()
      return ok({ appointments: await getReservedAppointments() })
    }

    return fail("Tipo de consulta inválido.")
  } catch (error) {
    console.error("Error al listar citas:", error)
    return errors.server()
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { user, response } = requireAdmin(locals)
  if (!user) return response

  try {
    const data = await readJson(request)
    if (!data) return fail("Cuerpo de la petición inválido.")

    const { date, time, locationId } = data as {
      date?: unknown
      time?: unknown
      locationId?: unknown
    }

    if (typeof date !== "string" || typeof time !== "string") {
      return fail("Indica la fecha y la hora de la cita.")
    }

    const timestamp = madridToInstant(date, time)

    if (!timestamp) {
      return fail("La fecha o la hora no tienen un formato válido.")
    }

    // Se compara con el instante actual, no con el día natural: así se puede
    // abrir un hueco para esta misma tarde.
    if (timestamp.getTime() <= Date.now()) {
      return fail("La fecha y la hora de la cita deben ser futuras.")
    }

    const activeLocations = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.isActive, true))

    let resolvedLocationId: string | null = null

    if (locationId !== undefined && locationId !== null && locationId !== "") {
      if (!isUuid(locationId)) return fail("El lugar seleccionado no es válido.")

      const [location] = await db
        .select({ id: locations.id })
        .from(locations)
        .where(and(eq(locations.id, locationId), eq(locations.isActive, true)))
        .limit(1)

      if (!location) return fail("El lugar seleccionado ya no está disponible.")
      resolvedLocationId = location.id
    } else if (activeLocations.length > 0) {
      return fail("Selecciona el lugar de la cita.")
    }

    const [existing] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.appointmentDate, timestamp))
      .limit(1)

    if (existing) {
      return fail("Ya existe una cita en esa fecha y hora.", 409)
    }

    const [newAppointment] = await db
      .insert(appointments)
      .values({ appointmentDate: timestamp, locationId: resolvedLocationId })
      .returning({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        locationId: appointments.locationId,
      })

    return created({
      message: "Cita creada correctamente.",
      appointment: {
        ...newAppointment,
        appointmentDate: newAppointment.appointmentDate.toISOString(),
      },
    })
  } catch (error) {
    // El índice único cubre la carrera entre dos peticiones simultáneas.
    if (isUniqueViolation(error)) {
      return fail("Ya existe una cita en esa fecha y hora.", 409)
    }

    console.error("Error al crear la cita:", error)
    return errors.server()
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505"
}
