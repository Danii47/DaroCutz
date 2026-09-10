import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"

const BCRYPT_ROUNDS = 12

// bcrypt ignora todo lo que pase de 72 bytes, así que se acota la entrada:
// además evita gastar CPU comparando cadenas enormes.
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 72

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

let dummyHash: Promise<string> | null = null

/**
 * Hash de relleno para comparar cuando el correo no existe: así el tiempo de
 * respuesta es el mismo y no se puede averiguar qué correos están registrados.
 */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomUUID())
  return dummyHash
}
