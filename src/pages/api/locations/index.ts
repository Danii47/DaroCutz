import type { APIRoute } from "astro"
import { created, errors, fail, isUniqueViolation, ok, readJson, requireAdmin, requireUser } from "@/lib/api"
import { db } from "@/lib/db"
import { locations } from "@/lib/db/schema"
import { parseLocationInput, type LocationInput } from "@/lib/locations"
import { getLocations } from "@/lib/queries"

export const GET: APIRoute = async ({ locals }) => {
  const { user, response } = requireUser(locals)
  if (!user) return response

  try {
    // Un cliente solo necesita los lugares activos.
    return ok({ locations: await getLocations(!user.isAdmin) })
  } catch (error) {
    console.error("Error al listar lugares:", error)
    return errors.server()
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { user, response } = requireAdmin(locals)
  if (!user) return response

  try {
    const data = await readJson(request)
    if (!data) return fail("Cuerpo de la petición inválido.")

    const parsed = parseLocationInput(data)
    if (typeof parsed === "string") return fail(parsed)

    const input = parsed as LocationInput

    const location = await db.transaction(async (tx) => {
      // Solo puede haber un predeterminado, y el índice único lo comprueba en
      // el propio INSERT: hay que liberar el anterior antes.
      if (input.isDefault) {
        await tx.update(locations).set({ isDefault: false })
      }

      const [inserted] = await tx
        .insert(locations)
        .values(input)
        .returning({
          id: locations.id,
          name: locations.name,
          address: locations.address,
          color: locations.color,
          isDefault: locations.isDefault,
          isActive: locations.isActive,
        })

      return inserted
    })

    return created({ message: `Lugar "${location.name}" creado.`, location })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("Ya existe un lugar con ese nombre.", 409)
    }

    console.error("Error al crear el lugar:", error)
    return errors.server()
  }
}
