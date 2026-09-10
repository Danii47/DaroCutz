import { defineMiddleware } from 'astro:middleware'
import { eq } from 'drizzle-orm'
import { clearAuthCookie, getTokenPayload, type AuthUser } from './lib/auth'
import { db } from './lib/db'
import { users } from './lib/db/schema'

const PUBLIC_ROUTES = ['/login', '/register']
const ADMIN_ROUTES = ['/admin']
const USER_ROUTES = ['/request-appointment']

const STATIC_PREFIXES = ['/_astro/', '/styles/', '/assets/', '/favicon']

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
}

function applySecurityHeaders(response: Response): Response {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    // En desarrollo la barra de herramientas de Astro inyecta scripts en línea
    // que la CSP bloquearía.
    if (header === 'Content-Security-Policy' && import.meta.env.DEV) continue
    response.headers.set(header, value)
  }
  return response
}

// El token guarda isAdmin/isApproved, pero puede vivir hasta 60 días. Se
// contrasta con la base de datos para que revocar un acceso surta efecto ya.
async function resolveUser(payload: { userId: string } | null): Promise<AuthUser | null> {
  if (!payload) return null

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        isApproved: users.isApproved,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)

    return user ?? null
  } catch (error) {
    console.error('No se pudo validar la sesión contra la base de datos:', error)
    return null
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, locals, redirect } = context
  const pathname = url.pathname

  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return next()
  }

  const payload = getTokenPayload(cookies)
  const user = await resolveUser(payload)

  // Cookie válida pero el usuario ya no existe: se limpia la sesión.
  if (payload && !user) {
    clearAuthCookie(cookies, url)
  }

  locals.user = user

  if (PUBLIC_ROUTES.includes(pathname)) {
    // Un usuario aún sin aprobar se queda en /login viendo el aviso, en vez de
    // rebotar entre /login y /request-appointment.
    if (user && (user.isAdmin || user.isApproved)) {
      return redirect(user.isAdmin ? '/admin' : '/request-appointment')
    }
    return applySecurityHeaders(await next())
  }

  if (pathname.startsWith('/api/')) {
    return applySecurityHeaders(await next())
  }

  if (pathname === '/') {
    if (!user) return redirect('/login')
    return redirect(user.isAdmin ? '/admin' : '/request-appointment')
  }

  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!user) return redirect('/login')
    if (!user.isAdmin) return redirect('/request-appointment')
    return applySecurityHeaders(await next())
  }

  if (USER_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!user) return redirect('/login')
    if (user.isAdmin) return redirect('/admin')
    if (!user.isApproved) return redirect('/login?error=pending')
    return applySecurityHeaders(await next())
  }

  if (!user) return redirect('/login')

  return applySecurityHeaders(await next())
})
