import type { APIRoute } from "astro"
import { and, eq, gt, isNull, ne } from "drizzle-orm"
import { errors, fail, isUuid, ok, requireAdmin, requireUser } from "@/lib/api"
import { db } from "@/lib/db"
import { appointments } from "@/lib/db/schema"

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const { user, response } = requireAdmin(locals)
  if (!user) return response

  const appointmentId = params.id

  if (!isUuid(appointmentId)) {
    return fail("Identificador de cita inválido.")
  }

  try {
    const [appointment] = await db
      .select({ id: appointments.id, userId: appointments.userId })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1)

    if (!appointment) return errors.notFound("Cita")

    // Borrar un hueco ya reservado deja al cliente sin cita, así que hay que
    // pedirlo explícitamente desde el panel de reservas.
    const url = new URL(request.url)
    if (appointment.userId !== null && url.searchParams.get("force") !== "true") {
      return fail(
        "Esa cita ya está reservada por un cliente. Cancélala desde 'Reservas actuales'.",
        409,
      )
    }

    await db.delete(appointments).where(eq(appointments.id, appointmentId))

    return ok({ message: "Cita eliminada correctamente.", id: appointmentId })
  } catch (error) {
    console.error("Error al eliminar la cita:", error)
    return errors.server()
  }
}

export const PATCH: APIRoute = async ({ params, locals }) => {
  const { user, response } = requireUser(locals)
  if (!user) return response

  if (!user.isApproved) {
    return fail("Tu cuenta todavía está pendiente de aprobación.", 403)
  }

  const appointmentId = params.id

  if (!isUuid(appointmentId)) {
    return fail("Identificador de cita inválido.")
  }

  try {
    const nowDate = new Date()

    const [alreadyBooked] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, user.id),
          gt(appointments.appointmentDate, nowDate),
          ne(appointments.status, "cancelled"),
        ),
      )
      .limit(1)

    if (alreadyBooked) {
      return fail("Ya tienes una cita reservada.", 409)
    }

    // Un único UPDATE condicional: si dos clientes pulsan a la vez, solo uno
    // encuentra el hueco libre y el otro recibe el aviso.
    const [updated] = await db
      .update(appointments)
      .set({ userId: user.id, status: "confirmed" })
      .where(
        and(
          eq(appointments.id, appointmentId),
          isNull(appointments.userId),
          gt(appointments.appointmentDate, nowDate),
        ),
      )
      .returning({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
      })

    if (!updated) {
      const [appointment] = await db
        .select({ id: appointments.id, userId: appointments.userId, appointmentDate: appointments.appointmentDate })
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1)

      if (!appointment) return errors.notFound("Cita")
      if (appointment.userId !== null) return fail("Esa cita acaba de ser reservada.", 409)
      return fail("Esa cita ya ha pasado.", 409)
    }

    return ok({
      message: "Cita reservada correctamente.",
      appointment: { ...updated, appointmentDate: updated.appointmentDate.toISOString() },
    })
  } catch (error) {
    console.error("Error al reservar la cita:", error)
    return errors.server()
  }
}

/** Libera un hueco reservado: el cliente pierde la reserva pero la hora sigue disponible. */
export const PUT: APIRoute = async ({ params, locals }) => {
  const { user, response } = requireAdmin(locals)
  if (!user) return response

  const appointmentId = params.id

  if (!isUuid(appointmentId)) {
    return fail("Identificador de cita inválido.")
  }

  try {
    const [updated] = await db
      .update(appointments)
      .set({ userId: null, status: "pending" })
      .where(eq(appointments.id, appointmentId))
      .returning({ id: appointments.id })

    if (!updated) return errors.notFound("Cita")

    return ok({ message: "Reserva cancelada. El hueco vuelve a estar libre.", id: updated.id })
  } catch (error) {
    console.error("Error al cancelar la reserva:", error)
    return errors.server()
  }
}
