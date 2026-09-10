import type { AuthUser } from "./auth"

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export function ok(body: Record<string, unknown> = {}): Response {
  return json({ success: true, ...body }, 200)
}

export function created(body: Record<string, unknown> = {}): Response {
  return json({ success: true, ...body }, 201)
}

export function fail(error: string, status = 400): Response {
  return json({ success: false, error }, status)
}

export const errors = {
  unauthenticated: () => fail("No has iniciado sesión.", 401),
  forbidden: () => fail("No tienes permisos para acceder a este recurso.", 403),
  notFound: (what = "Recurso") => fail(`${what} no encontrado.`, 404),
  server: () => fail("Error interno del servidor.", 500),
}

type Guard =
  | { user: AuthUser; response: null }
  | { user: null; response: Response }

export function requireUser(locals: App.Locals): Guard {
  const user = locals.user
  if (!user) return { user: null, response: errors.unauthenticated() }
  return { user, response: null }
}

export function requireAdmin(locals: App.Locals): Guard {
  const user = locals.user
  if (!user) return { user: null, response: errors.unauthenticated() }
  if (!user.isAdmin) return { user: null, response: errors.forbidden() }
  return { user, response: null }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Postgres lanza un 500 si le llega un uuid mal formado, así que se filtra antes.
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type") || ""

  if (!contentType.includes("application/json")) return null

  try {
    const data = await request.json()
    return data && typeof data === "object" && !Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

/**
 * Violación de restricción única en Postgres. Drizzle envuelve el error del
 * driver, así que hay que recorrer la cadena de `cause` para encontrar el código.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current = error

  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    if ((current as { code?: string }).code === "23505") return true
    current = (current as { cause?: unknown }).cause
  }

  return false
}
