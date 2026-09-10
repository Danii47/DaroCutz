import type { APIRoute } from "astro"
import { and, eq, gte } from "drizzle-orm"
import { errors, fail, isUuid, ok, requireAdmin } from "@/lib/api"
import { db } from "@/lib/db"
import { appointments, users } from "@/lib/db/schema"

export const POST: APIRoute = async ({ params, locals }) => {
  const { user, response } = requireAdmin(locals)
  if (!user) return response

  const userId = params.id

  if (!isUuid(userId)) return fail("Identificador de usuario inválido.")

  if (userId === user.id) {
    return fail("No puedes eliminar tu propia cuenta.")
  }

  try {
    const [target] = await db
      .select({ id: users.id, fullName: users.fullName, isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!target) return errors.notFound("Usuario")
    if (target.isAdmin) return fail("No se puede eliminar a un administrador.", 403)

    await db.transaction(async (tx) => {
      // Sus huecos futuros vuelven a quedar libres en lugar de arrastrar una
      // reserva huérfana.
      await tx
        .update(appointments)
        .set({ userId: null, status: "pending" })
        .where(and(eq(appointments.userId, userId), gte(appointments.appointmentDate, new Date())))

      await tx.delete(users).where(eq(users.id, userId))
    })

    return ok({ message: `${target.fullName} ha sido rechazado y eliminado.` })
  } catch (error) {
    console.error("Error al rechazar usuario:", error)
    return errors.server()
  }
}
