import type { z } from 'zod'

/**
 * Input breaking the rules: each field named with the rule it broke
 * (`required`, `max`, `format`, `range` …), which a form shows translated
 * from common:validation — the same rule names the API's validation_failed
 * gives. Every broken field comes at once.
 */
export class ValidationError extends Error {
  readonly fields: Readonly<Record<string, string>>

  constructor(fields: Record<string, string>) {
    const broken = Object.entries(fields).map(([field, rule]) => `${field} ${rule}`)
    super(`invalid input: ${broken.join(', ')}`)
    this.name = 'ValidationError'
    this.fields = fields
  }
}

/**
 * schema's output for input, or a ValidationError naming every field that
 * breaks it, each with the first rule it breaks (the schema's messages are
 * the rule names). A field of a nested value is named by its path, such as
 * `items.0.qty`; a rule of the whole input, by the empty name.
 */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (result.success) return result.data
  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    fields[issue.path.join('.')] ??= issue.message
  }
  throw new ValidationError(fields)
}
