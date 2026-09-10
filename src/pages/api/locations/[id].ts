import type { APIRoute } from "astro"
import { eq } from "drizzle-orm"
import { errors, fail, isUniqueViolation, isUuid, ok, readJson, requireAdmin } from "@/lib/api"
import { db } from "@/lib/db"
import { appointments, locations } from "@/lib/db/schema"
import { parseLocationInput } from "@/lib/locations"

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { user, response } = requireAdmin(locals)
  if (!user) return response

  const locationId = params.id

  if (!isUuid(locationId)) return fail("Identificador de lugar inválido.")

  try {
    const data = await readJson(request)
    if (!data) return fail("Cuerpo de la petición inválido.")

    const parsed = parseLocationInput(data, { partial: true })
    if (typeof parsed === "string") return fail(parsed)

    if (Object.keys(parsed).length === 0) {
      return fail("No hay nada que actualizar.")
    }

    const location = await db.transaction(async (tx) => {
      if (parsed.isDefault === true) {
        await tx.update(locations).set({ isDefault: false })
      }

      const [updated] = await tx
        .update(locations)
        .set(parsed)
        .where(eq(locations.id, locationId))
        .returning({
          id: locations.id,
          name: locations.name,
          address: locations.address,
          color: locations.color,
          isDefault: locations.isDefault,
          isActive: locations.isActive,
        })

      return updated
    })

    if (!location) return errors.notFound("Lugar")

    return ok({ message: "Lugar actualizado.", location })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("Ya existe un lugar con ese nombre.", 409)
    }

    console.error("Error al actualizar el lugar:", error)
    return errors.server()
  }
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { user, response } = requireAdmin(locals)
  if (!user) return response

  const locationId = params.id

  if (!isUuid(locationId)) return fail("Identificador de lugar inválido.")

  try {
    const [location] = await db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1)

    if (!location) return errors.notFound("Lugar")

    const [inUse] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.locationId, locationId))
      .limit(1)

    // Si ya hay citas apuntando a este lugar se archiva en vez de borrarse,
    // para no perder el histórico de dónde se atendió a cada cliente.
    if (inUse) {
      const [archived] = await db
        .update(locations)
        .set({ isActive: false, isDefault: false })
        .where(eq(locations.id, locationId))
        .returning({
          id: locations.id,
          name: locations.name,
          address: locations.address,
          color: locations.color,
          isDefault: locations.isDefault,
          isActive: locations.isActive,
        })

      return ok({
        message: `"${location.name}" tiene citas asociadas: se ha archivado en vez de borrarse.`,
        location: archived,
        archived: true,
      })
    }

    await db.delete(locations).where(eq(locations.id, locationId))

    return ok({ message: `Lugar "${location.name}" eliminado.`, id: locationId, archived: false })
  } catch (error) {
    console.error("Error al eliminar el lugar:", error)
    return errors.server()
  }
}
