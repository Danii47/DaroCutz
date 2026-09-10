import type { APIRoute } from "astro"
import { ok } from "@/lib/api"
import { clearAuthCookie } from "@/lib/auth"

export const POST: APIRoute = async ({ cookies, url }) => {
  clearAuthCookie(cookies, url)
  return ok({ message: "Sesión cerrada.", redirectTo: "/login" })
}
