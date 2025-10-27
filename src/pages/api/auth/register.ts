import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

interface RegisterData {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

function validateRegisterData(data: any): data is RegisterData {
  return (
    typeof data.fullName === "string" && data.fullName.length >= 3 &&
    typeof data.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    typeof data.phone === "string" && data.phone.length === 9 &&
    /^[0-9]+$/.test(data.phone) &&
    typeof data.password === "string" && data.password.length >= 6 &&
    data.password === data.confirmPassword
  )
}

export const POST: APIRoute = async ({ request }) => {
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

    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Este email ya está registrado."
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    const [newUser] = await db
      .insert(users)
      .values({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        isAdmin: false,
        isApproved: false,
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        isApproved: users.isApproved,
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuario registrado. Espera la aprobación del administrador.",
        user: newUser
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error("Error en registro:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al registrar usuario. Inténtalo de nuevo."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}