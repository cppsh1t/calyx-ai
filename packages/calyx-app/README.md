# calyx-app

`calyx-app` is built with Bun and published to npm for projects that also run on Bun.

## Install dependencies

```bash
bun install
```

## Build the package

```bash
bun run build
```

This produces Bun-targeted ESM output in `dist/` and emits `.d.ts` files for npm consumers.

## Type-check the source

```bash
bun run check-types
```

## Consumer expectation

- Requires Bun `>=1.3.6`
- Published artifacts live in `dist/`
- Package exports are Bun-oriented ESM outputs, not CommonJS/Node bundler targets
