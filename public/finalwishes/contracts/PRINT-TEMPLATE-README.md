# Sirsi Professional Print Template

## Overview
This CSS template provides professional legal document formatting for print and PDF export.

## Features
- **1-inch margins** on all sides
- **Page headers** with document title
- **Page footers** with "Page X of Y" numbering
- **CONFIDENTIAL** watermark in bottom-left
- **Page breaks** before every H1 and H2 section
- **Professional typography** (Cinzel for headers, Merriweather for body)
- **Signature blocks** that stay together
- **Tables** that don't break across pages

## Usage

### 1. Include the CSS
```html
<link rel="stylesheet" href="print-template.css">
```

Or embed directly:
```html
<style>
  /* Copy contents of print-template.css here */
</style>
```

### 2. Structure Your Document
```html
<h1>Document Title</h1>
<!-- This is page 1 -->

<h2>1. First Section</h2>
<!-- This starts page 2 -->

<h3>1.1 Subsection</h3>
<!-- Flows with content, no page break -->

<h2>2. Second Section</h2>
<!-- This starts page 3 -->
```

### 3. Utility Classes
| Class | Effect |
|-------|--------|
| `.page-break-before` | Force page break before element |
| `.page-break-after` | Force page break after element |
| `.no-break` | Prevent element from breaking across pages |
| `.keep-with-next` | Keep element with following content |
| `.signature-block` | Signature area that stays together |
| `.checkbox` | Printable checkbox for forms |

### 4. Customize the Header
Edit the `@top-center` content in the `@page` rule:
```css
@top-center {
  content: "Your Document Title Here";
}
```

### 5. Print
- **Mac**: Cmd+P → Save as PDF
- **Windows**: Ctrl+P → Save as PDF

## Files
- `print-template.css` - The CSS template
- `README.md` - This documentation

## Created
January 6, 2026 — Sirsi Technologies
