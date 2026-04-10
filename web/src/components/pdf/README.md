# PDF Export — Directive PDF

> Generates downloadable PDF documents for estate directives using @react-pdf/renderer.

## Architecture

`DirectivePDF.tsx` renders a styled PDF using React components from `@react-pdf/renderer`. It applies Royal Neo-Deco branding (Royal Blue headers, Metallic Gold rules) directly via `StyleSheet.create()` — CSS variables are not available in the PDF renderer.

## Dependencies

- `@react-pdf/renderer` — React-based PDF generation (no DOM dependency)

## Usage

The component is lazy-loaded via dynamic import to keep the main bundle small (~4.36KB chunk). Import it only where needed:

```tsx
const DirectivePDF = React.lazy(() => import('./DirectivePDF'));
```

## Modifying the Template

Edit `DirectivePDF.tsx` styles and layout directly. Color constants (`ROYAL_BLUE`, `METALLIC_GOLD`) are defined at the top of the file. All styling uses `@react-pdf/renderer`'s `StyleSheet` API, not CSS/Tailwind.

## Known Limitations

- No Cinzel font — falls back to Times-Roman for headings (custom font registration possible but adds bundle size)
- Images require base64 or URL sources, not local imports
