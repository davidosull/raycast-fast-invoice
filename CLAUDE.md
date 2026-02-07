# Invoice Generator — Raycast Extension

## Project Overview
Raycast extension for generating PDF invoices locally. Uses PDFKit, stores data in Raycast LocalStorage.

## Dev Commands
- `npm run build` — TypeScript compile
- `npm run dev` — Dev mode (loads in Raycast)
- `npm run lint` — ESLint

## Architecture
- `src/` — Command entry points (*.tsx)
- `src/lib/` — Pure logic (storage, PDF gen, calculations, formatters, types)
- `src/components/` — Reusable React components
- `assets/` — Icons

## Key Patterns
- All storage via `@raycast/api` LocalStorage (JSON stringified)
- Invoice numbers never decrement (skip > duplicate)
- Currency: GBP (£), dates: UK format
- PDF: PDFKit with Helvetica, A4, stream-based
- Preferences accessed via `getPreferenceValues<Preferences>()`

## Critical Rules
- Invoice counter increments BEFORE saving invoice (prevents duplicates)
- Deleted invoices do NOT decrement counter
- Client data is denormalised into invoice records
- Save location may contain `~` — always resolve with `os.homedir()`
