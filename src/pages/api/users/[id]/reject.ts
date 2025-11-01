import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const userId = params.id

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ID de usuario es requerido"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const currentUser = locals.user

    if (!currentUser || !currentUser.isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No tienes permisos para realizar esta acción"
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Usuario no encontrado"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    await db
      .delete(users)
      .where(eq(users.id, userId))

    return new Response(
      JSON.stringify({
        success: true,
        message: `Usuario ${user.fullName} rechazado y eliminado exitosamente`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error("Error al rechazar usuario:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al rechazar usuario"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}