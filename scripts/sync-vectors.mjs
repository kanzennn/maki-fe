// Copies the shared test vectors from the backend checked out next to this
// repository into src/test/vectors, so the tests need nothing outside it.
// Run it when the backend changes a calculation the cashier repeats.
import { copyFileSync, readdirSync } from 'node:fs'

const from = new URL('../../maki-be/api/test-vectors/', import.meta.url)
const to = new URL('../src/test/vectors/', import.meta.url)

for (const name of readdirSync(from)) {
  copyFileSync(new URL(name, from), new URL(name, to))
  console.log(`Copied ${name}`)
}
