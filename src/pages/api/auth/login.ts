import type { APIRoute } from "astro"
import { sql } from "drizzle-orm"
import { errors, fail, ok, readJson } from "@/lib/api"
import { generateToken, setAuthCookie } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { getDummyHash, MAX_PASSWORD_LENGTH, verifyPassword } from "@/lib/password"
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit"

const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000

interface LoginData {
  email: string
  password: string
  remember: boolean
}

function validateLoginData(data: Record<string, unknown>): LoginData | null {
  const { email, password, remember } = data

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  if (typeof password !== "string") return null
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) return null

  return {
    email: email.trim().toLowerCase(),
    password,
    remember: remember === true,
  }
}

export const POST: APIRoute = async ({ request, cookies, url, clientAddress }) => {
  const bucket = `login:${clientIp(request, clientAddress)}`
  const limit = rateLimit(bucket, MAX_ATTEMPTS, WINDOW_MS)

  if (!limit.allowed) {
    return fail(
      `Demasiados intentos. Vuelve a probar en ${Math.ceil(limit.retryAfterSeconds / 60)} minutos.`,
      429,
    )
  }

  try {
    const body = await readJson(request)
    if (!body) return fail("Cuerpo de la petición inválido.")

    const data = validateLoginData(body)

    if (!data) {
      return fail("Datos inválidos. Revisa el correo y la contraseña.")
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${data.email}`)
      .limit(1)

    // Se compara siempre, exista el usuario o no, para no filtrar por tiempo
    // qué correos están registrados.
    const passwordMatch = await verifyPassword(
      data.password,
      existingUser?.passwordHash ?? (await getDummyHash()),
    )

    if (!existingUser || !passwordMatch) {
      return fail("El correo o la contraseña son incorrectos.", 401)
    }

    if (!existingUser.isApproved && !existingUser.isAdmin) {
      return fail("Tu cuenta está pendiente de aprobación.", 403)
    }

    const token = generateToken(
      {
        userId: existingUser.id,
        email: existingUser.email,
        isAdmin: existingUser.isAdmin,
        isApproved: existingUser.isApproved,
      },
      data.remember,
    )

    setAuthCookie(cookies, token, data.remember, url)
    resetRateLimit(bucket)

    return ok({
      message: "Sesión iniciada.",
      redirectTo: existingUser.isAdmin ? "/admin" : "/request-appointment",
    })
  } catch (error) {
    console.error("Error en inicio de sesión:", error)
    return errors.server()
  }
}
