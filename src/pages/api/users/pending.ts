import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"

export const GET: APIRoute = async ({ locals }) => {
  try {
    const currentUser = locals.user

    if (!currentUser || !currentUser.isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No tienes permisos para acceder a este recurso"
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const pendingUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.isApproved, false),
          eq(users.isAdmin, false)
        )
      )
      .orderBy(desc(users.createdAt))

    return new Response(
      JSON.stringify({
        success: true,
        users: pendingUsers
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error("Error al obtener usuarios pendientes:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al obtener usuarios pendientes"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}