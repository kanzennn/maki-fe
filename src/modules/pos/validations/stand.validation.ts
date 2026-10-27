/**
 * The server's rule for a stand's number (orders_stand_number_check): 1 to
 * 10 capitals, digits and hyphens, a hyphen only between them, as 12, A5 or
 * B-3.
 */
const pattern = /^[A-Z0-9]([A-Z0-9-]{0,8}[A-Z0-9])?$/

/** A stand's number as typed, the way the server keeps it: no spaces at its ends, its small letters capitals. */
export function standNumber(typed: string): string {
  return typed.trim().toUpperCase()
}

/** Whether the number typed is one the server takes. */
export function validStand(typed: string): boolean {
  return pattern.test(standNumber(typed))
}
