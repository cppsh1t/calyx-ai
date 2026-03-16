# calyx-flow-editor

A minimal React library using UnoCSS for styling.

## Installation

```bash
bun install
```

## Development

### Library Development (Build Mode)

Used for developing and building the component library itself:

```bash
# Development mode (watch and build library)
bun dev

# Build production version
bun run build
```

### Demo Development (Preview Mode)

Used for previewing and debugging components in the browser:

```bash
# Start demo server
bun run dev:demo
```

Then open http://localhost:3103 to view the component demo page.

Demo mode features:

- Real-time component preview
- Hot reload support (refresh browser after code changes)
- Multiple component showcase cases
- Does not affect library build output

## Adding Components to Demo

Add new demo cases to the `components` array in `demo/App.tsx`:

```tsx
const components: ComponentDemo[] = [
  {
    name: 'YourComponent',
    description: 'Component description',
    component: <YourComponent prop="value" />,
  },
]
```

## Styling

This project uses [UnoCSS](https://unocss.dev/) for utility-first CSS. It includes the Tailwind-compatible preset (`preset-wind3`), so you can use familiar Tailwind class names.

### UnoCSS Configuration

- Config file: `uno.config.ts`
- PostCSS config: `postcss.config.ts`
- Preset: `@unocss/preset-wind3` (Tailwind CSS compatible)

## Project Structure

```
.
├── demo/              # Demo pages
│   ├── index.html     # HTML entry
│   ├── main.tsx       # React app entry
│   └── App.tsx        # Demo component page
├── src/               # Component library source
│   ├── HelloWorld.tsx
│   └── index.ts
├── build.ts           # Library build script
├── dev-server.ts      # Demo server script
└── package.json
```

---

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
