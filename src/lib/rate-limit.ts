/**
 * Limitador de intentos en memoria. Suficiente para un único contenedor como
 * este; si algún día se escala a varias réplicas habría que moverlo a Redis.
 */

interface Bucket {
  hits: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Limpieza periódica para que el mapa no crezca sin control.
const CLEANUP_INTERVAL = 10 * 60 * 1000
const cleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, CLEANUP_INTERVAL)
cleanup.unref?.()

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  bucket.hits += 1

  if (bucket.hits > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

/** Reinicia el contador tras una operación correcta (p. ej. un login válido). */
export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

/**
 * IP del cliente. Detrás del proxy inverso llega en X-Forwarded-For.
 *
 * Se coge la ÚLTIMA entrada, no la primera: nginx añade la IP que ve al final
 * de la lista, mientras que cualquier valor anterior lo puede haber inventado
 * el propio cliente para saltarse el límite de intentos.
 */
export function clientIp(request: Request, clientAddress?: string): string {
  const forwarded = request.headers.get("x-forwarded-for")

  if (forwarded) {
    const parts = forwarded.split(",")
    const last = parts[parts.length - 1]?.trim()
    if (last) return last
  }

  return request.headers.get("x-real-ip") || clientAddress || "desconocido"
}
