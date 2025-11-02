import jwt from "jsonwebtoken"
import type { AstroCookies } from 'astro'

const JWT_SECRET = process.env.JWT_SECRET
const COOKIE_NAME = 'auth_token'

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET not defined in environment variables.')
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
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: remember ? "60d" : "1d"
  })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('Invalid token:', error)
    return null
  }
}

export function setAuthCookie(cookies: AstroCookies, token: string, remember: boolean): void {
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: remember ? 60 * 60 * 24 * 60 : 60 * 60 * 24, // 60 days or 1 day
    path: '/',
  })
}

export function getAuthToken(cookies: AstroCookies): string | undefined {
  return cookies.get(COOKIE_NAME)?.value
}

export function clearAuthCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, {
    path: '/',
  })
}

export function getAuthUser(cookies: AstroCookies): AuthUser | null {
  const token = getAuthToken(cookies)

  if (!token) {
    return null
  }

  const payload = verifyToken(token)

  if (!payload) {
    return null
  }

  return {
    id: payload.userId,
    email: payload.email,
    isAdmin: payload.isAdmin,
    isApproved: payload.isApproved,
  }
}