import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { generateToken, setAuthCookie } from "@/lib/auth"

interface RegisterData {
  email: string
  password: string
  remember: boolean
}

function validateRegisterData(data: any): data is RegisterData {
  return (
    typeof data.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    typeof data.password === "string" &&
    typeof data.remember === "boolean"
  )
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const data = await request.json()

    if (!validateRegisterData(data)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Datos inválidos. Verifica que todos los campos sean correctos."
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1)

    if (!existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "El email o la contraseña son incorrectos."
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const passwordMatch = await bcrypt.compare(data.password, existingUser.passwordHash)

    if (!passwordMatch) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "El email o la contraseña son incorrectos."
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    if (!existingUser.isApproved) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tu cuenta está pendiente de aprobación."
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const token = generateToken({
      userId: existingUser.id,
      email: existingUser.email,
      isAdmin: existingUser.isAdmin,
      isApproved: existingUser.isApproved,
    }, data.remember)

    setAuthCookie(cookies, token, data.remember)

    const redirectTo = existingUser.isAdmin ? "/admin" : "/request-appointment"

    return new Response(
      JSON.stringify({
        success: true,
        message: "Inicio de sesión exitoso.",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          isAdmin: existingUser.isAdmin,
          isApproved: existingUser.isApproved,
        },
        redirectTo
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error("Error en inicio de sesión:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al iniciar sesión. Inténtalo de nuevo."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}