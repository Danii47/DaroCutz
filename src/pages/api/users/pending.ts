import type { APIRoute } from "astro"
import { errors, ok, requireAdmin } from "@/lib/api"
import { getPendingUsers } from "@/lib/queries"

export const GET: APIRoute = async ({ locals }) => {
  const { user, response } = requireAdmin(locals)
  if (!user) return response

  try {
    return ok({ users: await getPendingUsers() })
  } catch (error) {
    console.error("Error al obtener usuarios pendientes:", error)
    return errors.server()
  }
}
