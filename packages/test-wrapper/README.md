# test-wrapper

A React development server that can be used as a CLI tool or programmatically via API.

## Installation

```bash
bun add test-wrapper
```

## Usage

### As CLI Tool

```bash
# Development mode with hot reloading
bun run dev

# Or run directly
bun test-wrapper

# Production mode
bun run start
```

### As Programmatic API

```typescript
import { host, stop } from 'test-wrapper'

// Start the server
const { url, stop: stopServer } = await host({
  port: 3000, // Optional, defaults to 9745
  development: true, // Optional, defaults to true in development
})

console.log(`Server running at ${url}`)
// Output: Server running at http://localhost:3000/

// Stop the server
stopServer()
// Or use the global stop function
stop()
```

### API Reference

#### `host(options?: HostOptions): Promise<HostResult>`

Start the development server.

**Options:**

- `port?: number` - Server port (default: 9745)
- `development?: boolean` - Enable HMR and console echo (default: `process.env.NODE_ENV !== 'production'`)

**Returns:**

- `url: string` - The URL where the server is running
- `stop: () => void` - Function to stop the server

#### `stop(): void`

Stop the running server globally.

#### `isRunning(): boolean`

Check if the server is currently running.

### Example: Integration Test

```typescript
import { host, stop } from 'test-wrapper'
import { test, beforeAll, afterAll } from 'bun:test'

let serverUrl: string

beforeAll(async () => {
  const result = await host({ port: 0 }) // Random port
  serverUrl = result.url
})

afterAll(() => {
  stop()
})

test('should serve the React app', async () => {
  const response = await fetch(serverUrl)
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('<div id="root">')
})
```

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev
```

## License

MIT
