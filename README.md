# Token Extractor

A Figma plugin that extracts design tokens from selected frames and outputs [Tokens Studio](https://tokens.studio/)-compatible JSON, with automatic 3-tier naming conventions and multi-frame conflict resolution.

![Token Extractor plugin screenshot](screenshot.png)

---

## Why this exists

When inheriting a product without a published component library, reconstructing the implicit design system is tedious and error-prone. This plugin automates the extraction step — select any frame, run the plugin, and get a structured token file you can import directly into Tokens Studio.

Extract from multiple frames across multiple files to incrementally build a design system. When two frames produce similar but not identical values, the plugin surfaces conflicts side by side so you can make an informed decision about which value to keep.

---

## What it extracts

- **Colours** — solid fills, classified by hue family and lightness shade
- **Typography** — font family, weight, and size, mapped to a display/heading/body/caption scale
- **Spacing** — auto layout item spacing, mapped to an xs–2xl scale
- **Border radius** — corner radius values, mapped to sm/md/lg/full

---

## Token naming

Tokens are named using a 3-tier primitive convention:

| Type | Example output |
|------|---------------|
| Colour | `color.primitive.green.600` |
| Typography | `typography.body.bold` |
| Spacing | `spacing.md` |
| Radius | `radius.sm` |

Naming is rules-based (HSL analysis for colours, size scales for typography and spacing). An optional Anthropic API layer for semantic naming is planned.

---

## Multi-frame workflow

1. Extract from frame 1 — establishes your baseline token set
2. Click **Add another frame** and select a second frame
3. The plugin compares the new extraction against the baseline and shows:
   - **Conflicts** — similar values shown side by side with three options: Keep existing / Use new / Keep both
   - **New tokens** — values not in the baseline, added automatically
   - **Matched** — exact matches, collapsed by default
4. Review conflicts, then click **Accept all suggestions**
5. You're returned to the results view with the merged token set
6. Repeat across as many frames as needed
7. Export when ready

---

## Output format

Tokens are exported as [Tokens Studio](https://tokens.studio/) compatible JSON, wrapped in a `global` set:

```json
{
  "global": {
    "color.primitive.green.600": {
      "value": "#00915A",
      "type": "color"
    },
    "spacing.md": {
      "value": "16",
      "type": "spacing"
    }
  }
}
```

---

## Installation

> Requires the [Figma desktop app](https://www.figma.com/downloads/) and Node.js.

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the plugin:
   ```
   npm run build
   ```
4. In Figma desktop, go to **Plugins → Development → Import plugin from manifest**
5. Select the `manifest.json` file from this folder

---

## Usage

1. Select a frame in Figma
2. Run the plugin via **Plugins → Development → token-extractor**
3. Click **Extract from selected frame**
4. Review the extracted tokens
5. To build on the token set, click **Add another frame**, select another frame, and extract again
6. Resolve any conflicts in the comparison view
7. Click **Export as Tokens Studio JSON** to download `tokens.json`
8. Import into Tokens Studio via **Settings → Load from file/folder**

---

## Roadmap

- [ ] Check `node.boundVariables` before extracting raw values -- use existing token names where present
- [ ] Fix intra-frame duplicate handling -- surface shade collisions in the conflict UI
- [ ] Persist token store across plugin sessions using Figma's `clientStorage` API
- [ ] Write-back to Figma canvas -- apply winning token to all layers using the losing value
- [ ] Optional Anthropic API layer for semantic naming suggestions
- [ ] Tier 2 token generation (primitive → semantic mapping)

---

## Tech

- Figma Plugin API
- TypeScript
- Tokens Studio JSON format

---

## Author

[Tiffany O'Keeffe](https://github.com/tiffymoon)
Senior Product Designer specializing in enterprise UX, SaaS, and design systems.
