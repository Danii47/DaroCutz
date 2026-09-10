const HEX_COLOR = /^#[0-9a-f]{6}$/i

export interface LocationInput {
  name: string
  address: string | null
  color: string | null
  isDefault: boolean
  isActive: boolean
}

/** Valida el cuerpo de un lugar. Devuelve el objeto limpio o el mensaje de error. */
export function parseLocationInput(
  data: Record<string, unknown>,
  { partial = false }: { partial?: boolean } = {},
): Partial<LocationInput> | string {
  const result: Partial<LocationInput> = {}

  if (data.name !== undefined || !partial) {
    const name = typeof data.name === "string" ? data.name.trim() : ""

    if (name.length < 2 || name.length > 120) {
      return "El nombre del lugar debe tener entre 2 y 120 caracteres."
    }

    result.name = name
  }

  if (data.address !== undefined || !partial) {
    const address = typeof data.address === "string" ? data.address.trim() : ""

    if (address.length > 255) {
      return "La dirección es demasiado larga (máximo 255 caracteres)."
    }

    result.address = address || null
  }

  if (data.color !== undefined || !partial) {
    const color = typeof data.color === "string" ? data.color.trim() : ""

    if (color && !HEX_COLOR.test(color)) {
      return "El color debe ser un valor hexadecimal tipo #4f8a6d."
    }

    result.color = color || null
  }

  if (data.isDefault !== undefined || !partial) {
    result.isDefault = data.isDefault === true
  }

  if (data.isActive !== undefined || !partial) {
    result.isActive = partial ? data.isActive === true : data.isActive !== false
  }

  return result
}
