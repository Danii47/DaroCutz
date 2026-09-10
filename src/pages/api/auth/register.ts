import type { APIRoute } from "astro"
import { sql } from "drizzle-orm"
import { created, errors, fail, isUniqueViolation, readJson } from "@/lib/api"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/password"
import { clientIp, rateLimit } from "@/lib/rate-limit"


const MAX_REGISTRATIONS = 5
const WINDOW_MS = 60 * 60 * 1000

interface RegisterData {
  fullName: string
  email: string
  phone: string
  password: string
}

function validateRegisterData(data: Record<string, unknown>): RegisterData | string {
  const fullName = typeof data.fullName === "string" ? data.fullName.trim().replace(/\s+/g, " ") : ""

  if (fullName.length < 3 || fullName.length > 120) {
    return "El nombre debe tener entre 3 y 120 caracteres."
  }

  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : ""

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return "El correo no es válido."
  }

  const phone = typeof data.phone === "string" ? data.phone.replace(/[\s-]/g, "") : ""

  if (!/^[0-9]{9}$/.test(phone)) {
    return "El teléfono debe tener 9 dígitos."
  }

  const { password, confirmPassword } = data

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return `La contraseña no puede superar los ${MAX_PASSWORD_LENGTH} caracteres.`
  }

  if (password !== confirmPassword) {
    return "Las contraseñas no coinciden."
  }

  return { fullName, email, phone, password }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const limit = rateLimit(`register:${clientIp(request, clientAddress)}`, MAX_REGISTRATIONS, WINDOW_MS)

  if (!limit.allowed) {
    return fail("Demasiados registros desde esta conexión. Inténtalo más tarde.", 429)
  }

  try {
    const body = await readJson(request)
    if (!body) return fail("Cuerpo de la petición inválido.")

    const data = validateRegisterData(body)
    if (typeof data === "string") return fail(data)

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${data.email}`)
      .limit(1)

    if (existingUser) {
      return fail("Este correo ya está registrado.", 409)
    }

    const passwordHash = await hashPassword(data.password)

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
      .returning({ id: users.id, fullName: users.fullName })

    return created({
      message: "Registro completado. Un administrador revisará tu cuenta.",
      user: newUser,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("Este correo ya está registrado.", 409)
    }

    console.error("Error en registro:", error)
    return errors.server()
  }
}
