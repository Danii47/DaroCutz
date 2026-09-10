import type { APIRoute } from "astro"
import { and, eq } from "drizzle-orm"
import { errors, fail, isUuid, ok, requireAdmin } from "@/lib/api"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

export const POST: APIRoute = async ({ params, locals }) => {
  const { user, response } = requireAdmin(locals)
  if (!user) return response

  const userId = params.id

  if (!isUuid(userId)) return fail("Identificador de usuario inválido.")

  try {
    const [approvedUser] = await db
      .update(users)
      .set({ isApproved: true })
      .where(and(eq(users.id, userId), eq(users.isApproved, false)))
      .returning({ id: users.id, fullName: users.fullName, email: users.email })

    if (!approvedUser) return errors.notFound("Usuario pendiente")

    return ok({
      message: `${approvedUser.fullName} ya puede reservar cita.`,
      user: approvedUser,
    })
  } catch (error) {
    console.error("Error al aprobar usuario:", error)
    return errors.server()
  }
}
