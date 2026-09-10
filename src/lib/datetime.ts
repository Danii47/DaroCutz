import { fromZonedTime, toZonedTime } from "date-fns-tz"

export const TIME_ZONE = "Europe/Madrid"

/**
 * Convierte la fecha y hora que escribe el administrador (siempre en hora de
 * Madrid) al instante real en UTC. El contenedor puede correr en cualquier
 * zona: nunca se usa la hora local del servidor para estos cálculos.
 */
export function madridToInstant(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) return null

  const normalizedTime = time.length === 5 ? `${time}:00` : time
  const instant = fromZonedTime(`${date}T${normalizedTime}`, TIME_ZONE)

  return Number.isNaN(instant.getTime()) ? null : instant
}

/** Clave "YYYY-MM-DD" del día natural en Madrid al que pertenece un instante. */
export function madridDayKey(instant: Date | string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant
  const zoned = toZonedTime(date, TIME_ZONE)

  const year = zoned.getFullYear()
  const month = String(zoned.getMonth() + 1).padStart(2, "0")
  const day = String(zoned.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function formatMadrid(
  instant: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = typeof instant === "string" ? new Date(instant) : instant
  return date.toLocaleString("es-ES", { ...options, timeZone: TIME_ZONE })
}

/** Etiqueta corta tipo "Vie 12 sep · 17:30". */
export function formatSlotLabel(instant: Date | string): string {
  const day = capitalize(
    formatMadrid(instant, { weekday: "short", day: "2-digit", month: "short" }),
  )
  const time = formatMadrid(instant, { hour: "2-digit", minute: "2-digit", hour12: false })

  return `${day} · ${time}`
}

/**
 * Solo la primera letra: en español "jueves, 10 de septiembre" se escribe
 * "Jueves, 10 de septiembre", no "Jueves, 10 De Septiembre".
 */
export function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("es-ES") + value.slice(1)
}
