import jwt from "jsonwebtoken"
import type { AstroCookies } from 'astro'

const COOKIE_NAME = 'auth_token'
const ALGORITHM = 'HS256' as const

const DAY_IN_SECONDS = 60 * 60 * 24
const REMEMBER_DAYS = 60

// Se lee bajo demanda para que `astro build` no necesite el secreto:
// así no hay que hornearlo en la imagen de Docker.
let warnedAboutShortSecret = false

function getSecret(): string {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET no está definida en las variables de entorno.')
  }

  // Solo un aviso, no un error: una clave corta es débil, pero tumbar el sitio
  // entero en el despliegue sería peor. Cámbiala en cuanto puedas.
  if (secret.length < 32 && !warnedAboutShortSecret) {
    warnedAboutShortSecret = true
    console.warn(
      `[auth] JWT_SECRET solo tiene ${secret.length} caracteres. ` +
        'Usa al menos 32 aleatorios: openssl rand -base64 48',
    )
  }

  return secret
}

export interface JWTPayload {
  userId: string
  email: string
  isAdmin: boolean
  isApproved: boolean
}

export interface AuthUser {
  id: string
  email: string
  isAdmin: boolean
  isApproved: boolean
}

export function generateToken(payload: JWTPayload, remember: boolean): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: ALGORITHM,
    expiresIn: remember ? `${REMEMBER_DAYS}d` : '1d',
  })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    // Fijar el algoritmo evita ataques de confusión de algoritmo (alg: none / RS256).
    return jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] }) as JWTPayload
  } catch {
    // Un token caducado o manipulado es algo normal, no merece ruido en los logs.
    return null
  }
}

// La cookie va marcada Secure cuando la petición llega por https. Detrás de un
// proxy inverso Astro ya resuelve el protocolo con X-Forwarded-Proto.
function shouldUseSecureCookie(url: URL | undefined): boolean {
  const override = process.env.COOKIE_SECURE

  if (override === 'true') return true
  if (override === 'false') return false

  return url?.protocol === 'https:'
}

export function setAuthCookie(cookies: AstroCookies, token: string, remember: boolean, url?: URL): void {
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(url),
    sameSite: 'lax',
    maxAge: remember ? DAY_IN_SECONDS * REMEMBER_DAYS : DAY_IN_SECONDS,
    path: '/',
  })
}

export function getAuthToken(cookies: AstroCookies): string | undefined {
  return cookies.get(COOKIE_NAME)?.value
}

export function clearAuthCookie(cookies: AstroCookies, url?: URL): void {
  cookies.delete(COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: shouldUseSecureCookie(url),
    sameSite: 'lax',
  })
}

export function getTokenPayload(cookies: AstroCookies): JWTPayload | null {
  const token = getAuthToken(cookies)
  return token ? verifyToken(token) : null
}
