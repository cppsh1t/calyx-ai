import { execFileSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ext = process.platform === 'win32' ? '.exe' : ''
const binary = path.join(__dirname, '..', 'dist', `calyx${ext}`)

try {
  execFileSync(binary, process.argv.slice(2), { stdio: 'inherit' })
} catch (error) {
  if (error.status) {
    process.exit(error.status)
  }
  throw error
}
