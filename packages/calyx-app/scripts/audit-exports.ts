/**
 * audit-exports.ts — Verify that every file declared in package.json "exports"
 * map actually exists in dist/.  Exits 0 on success, 1 on failure.
 *
 * Usage: bun run scripts/audit-exports.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(__dirname, '..')
const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf-8')) as {
  exports: Record<string, Record<string, string>>
}

const distDir = resolve(pkgRoot, 'dist')

let missing = 0
let checked = 0

for (const [subpath, conditions] of Object.entries(pkg.exports)) {
  for (const [condition, file] of Object.entries(conditions)) {
    // Skip non-file conditions (e.g. "default", "require")
    if (condition !== 'types' && condition !== 'import') continue

    checked++
    const fullPath = resolve(pkgRoot, file)
    if (!existsSync(fullPath)) {
      console.error(`MISSING: ${subpath} -> ${condition}: ${file}`)
      missing++
    } else {
      console.log(`OK: ${subpath} -> ${condition}: ${file}`)
    }
  }
}

console.log(`\nExport audit: ${checked - missing}/${checked} files present in dist/`)
if (missing > 0) {
  console.error(`FAIL: ${missing} export target(s) missing from dist/`)
  process.exit(1)
}
console.log('PASS: all export targets present')
