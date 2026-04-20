# Token Extractor

A Figma plugin that reverse-engineers a structured token system from any existing Figma file. Select a frame, extract, resolve conflicts, export — and repeat across as many frames as you need to build your token set progressively.

Output is [Tokens Studio](https://tokens.studio/)-compatible JSON, importable immediately.

---

## Why this exists

When inheriting a product file with no component library or token system, reconstructing the implicit design decisions is slow and error-prone. This plugin automates the extraction step — and more importantly, it surfaces the inconsistencies so you can make informed decisions about what the system should actually be.

---

## What it extracts

- **Colors** — solid fills, grouped by hue family and sorted light to dark
- **Typography** — font family, weight, size, line height, letter spacing
- **Spacing** — auto layout item spacing
- **Border radius** — corner radius values
- **Border width** — stroke weights
- **Shadows** — drop shadow values (x, y, blur, spread, color, opacity)

---

## Token naming

Rules-based naming using HSL analysis and scale mapping:

| Type | Example |
|------|---------|
| Color | `color.primitive.blue.600` |
| Typography | `typography.body-sm.regular` |
| Spacing | `spacing.md` |
| Radius | `radius.sm` |
| Border width | `borderWidth.md` |
| Shadow | `shadow-1` |

---

## Conflict resolution

Real files aren't clean. When two values are similar but not identical — two near-identical greys, two body font sizes that are 1px apart — the plugin surfaces them side by side and asks you to decide:

- **Keep left** — keep the existing value
- **Keep right** — use the new value
- **Keep both** — treat them as distinct tokens
- **Keep both for all** — resolve all conflicts in one click

The plugin also **remembers your decisions**. On future extractions, conflicts matching a previous resolution are auto-resolved — only genuinely new conflicts surface for review.

---

## Multi-frame workflow

1. Select a frame → **Extract from selected frame**
2. Review the extracted tokens (grouped by category, collapsible)
3. Click **Add and extract from another frame**
4. Review conflicts and new tokens in the comparison view
5. Accept and repeat across as many frames as needed
6. Export when ready

---

## Output format

Tokens Studio-compatible JSON wrapped in a `global` set:

```json
{
  "global": {
    "color.primitive.blue.600": {
      "value": "#1A3FA0",
      "type": "color"
    },
    "typography.body.regular": {
      "value": {
        "fontFamily": "Open Sans",
        "fontSize": "14.00",
        "fontWeight": "Regular",
        "lineHeight": "19.00",
        "letterSpacing": "0.00"
      },
      "type": "typography"
    }
  }
}
```

---

## Installation

Requires the [Figma desktop app](https://www.figma.com/downloads/) and Node.js.

```bash
git clone https://github.com/tiffymoon/token-extractor.git
cd token-extractor
npm install
npm run build
```

In Figma desktop: **Plugins → Development → Import plugin from manifest** → select `manifest.json`.

---

## Roadmap

- [ ] Semantic token layer — map primitives to roles (brand, text, background, status)
- [ ] Write-back to Figma canvas — apply the winning token to all layers using the losing value
- [ ] Persist token store across plugin sessions
- [ ] Figma Variables support — detect and respect existing bound variables
- [ ] Publish to Figma Community

---

## Built with

- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- TypeScript
- [Claude](https://claude.ai) — AI pair programming
- [VS Code](https://code.visualstudio.com)
- [Tokens Studio](https://tokens.studio/) — target format and testing environment

---

## Author

[Tiffany O'Keeffe](https://github.com/tiffymoon) — Senior Product Designer specialising in enterprise UX, SaaS, and design systems.
