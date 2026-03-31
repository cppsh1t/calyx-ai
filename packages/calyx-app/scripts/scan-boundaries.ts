import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// 1. Dependency-level blocked patterns (package.json fields)
// ---------------------------------------------------------------------------
const BLOCKED_DEP_PATTERNS: ReadonlyArray<{
  test: (name: string) => boolean
  reason: string
}> = [
  { test: (n) => n === 'solid-js' || n.startsWith('solid-js/'), reason: 'solid-js is a UI framework — core must stay UI-agnostic' },
  {
    test: (n) => n === '@opentui/solid' || n === '@opentui/core' || n.startsWith('@opentui/'),
    reason: '@opentui is a TUI framework — core must stay TUI-agnostic',
  },
  { test: (n) => n === 'calyx-flow-editor-wrapper', reason: 'calyx-flow-editor-wrapper is CLI-specific' },
]

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const

// ---------------------------------------------------------------------------
// 2. Source-level blocked patterns (scan src/**/*.ts for real code lines)
//    Each entry has:
//      - regex: matched against non-comment, non-blank lines
//      - reason: human-readable explanation
// ---------------------------------------------------------------------------
const BLOCKED_SOURCE_PATTERNS: ReadonlyArray<{
  regex: RegExp
  reason: string
}> = [
  { regex: /\bfrom\s+['"]solid-js\b/, reason: 'solid-js is a UI framework — core must stay UI-agnostic' },
  { regex: /\bfrom\s+['"]@opentui\//, reason: '@opentui is a TUI framework — core must stay TUI-agnostic' },
  { regex: /\bBun\.\w+/, reason: 'Bun.* APIs are runtime-specific — core must stay portable' },
  { regex: /['"](?:\.\.\/)*.*views\/chat/, reason: 'views/chat is CLI-specific UI code' },
  { regex: /['"](?:\.\.\/)*.*components\/dialog/, reason: 'components/dialog is CLI-specific UI code' },
  { regex: /\bfrom\s+['"]calyx-flow-editor-wrapper/, reason: 'calyx-flow-editor-wrapper is CLI-specific' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True when the line is a single-line comment or purely whitespace. */
function isCommentOrBlank(line: string): boolean {
  const trimmed = line.trim()
  return trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
}

/** Recursive walk returning all *.ts files under `dir`. */
function walkTsFiles(dir: string): string[] {
  const results: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkTsFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(full)
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): number {
  const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  const pkgPath = join(pkgRoot, 'package.json')
  const srcDir = join(pkgRoot, 'src')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

  // --- Dependency violations ---
  const depViolations: Array<{ field: string; name: string; reason: string }> = []

  for (const field of DEP_FIELDS) {
    const deps = pkg[field] as Record<string, string> | undefined
    if (deps === undefined) continue

    for (const name of Object.keys(deps)) {
      for (const { test, reason } of BLOCKED_DEP_PATTERNS) {
        if (test(name)) {
          depViolations.push({ field, name, reason })
          break
        }
      }
    }
  }

  // --- Source violations ---
  const srcViolations: Array<{ file: string; line: number; pattern: string; reason: string }> = []
  const tsFiles = walkTsFiles(srcDir)

  for (const filePath of tsFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const relFile = relative(pkgRoot, filePath)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      if (isCommentOrBlank(line)) continue

      for (const { regex, reason } of BLOCKED_SOURCE_PATTERNS) {
        if (regex.test(line)) {
          // Extract the matched text for display
          const match = line.match(regex)
          srcViolations.push({
            file: relFile,
            line: i + 1,
            pattern: match ? match[0] : '(unknown)',
            reason,
          })
          // Only report the first matching pattern per line to avoid noise
          break
        }
      }
    }
  }

  // --- Report ---
  let hasViolations = false

  if (depViolations.length > 0) {
    hasViolations = true
    console.log(`❌ Dependency violations (${depViolations.length}):`)
    for (const v of depViolations) {
      console.log(`  [${v.field}] ${v.name} — ${v.reason}`)
    }
    console.log()
  }

  if (srcViolations.length > 0) {
    hasViolations = true
    console.log(`❌ Source violations (${srcViolations.length}):`)
    for (const v of srcViolations) {
      console.log(`  ${v.file}:${v.line} — \`${v.pattern}\` — ${v.reason}`)
    }
    console.log()
  }

  if (!hasViolations) {
    console.log('✅ calyx-app boundary check passed — no blocked dependencies or source imports found.')
    return 0
  }

  return 1
}

process.exit(main())
