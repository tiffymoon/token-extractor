# Token Extractor — Progress Log

## What this is

A Figma plugin that reverse-engineers a structured token system from existing product files. The primary use case is inheriting a Figma file with no component library or token system and needing to reconstruct the implicit design decisions quickly.

Output is Tokens Studio-compatible JSON. Multi-frame extraction lets you build a token set progressively across a whole product.

---

## Decisions & why

- **Output format:** Tokens Studio JSON — maps directly to an existing workflow and can be tested immediately by importing into the Tokens Studio plugin.
- **Token naming:** Rules-based (HSL colour analysis, font size scales, spacing t-shirt sizes). Chosen to avoid API costs during testing. Semantic naming via Anthropic API is planned.
- **Conflict resolution at extraction time:** Any two values that map to the same token bucket are flagged immediately — not silently suffixed. The designer decides.
- **Learned preferences:** Conflict decisions are persisted via `clientStorage` and auto-applied to future extractions. Only new conflicts surface for review.
- **No write-back to Figma canvas:** Plugin is read-only for now. Write-back is planned as a future power feature.

---

## What's working

- [x] Plugin scaffolded and running in Figma desktop
- [x] Frame selection and full node traversal
- [x] Extraction of: colors, typography, spacing, border radius, border width, drop shadows
- [x] Typography deduplication — identical text node combinations filtered before naming
- [x] Rules-based token naming (HSL analysis, scale mapping)
- [x] Color naming: `color.primitive.{hue}.{shade}` — 8 hue families, 10 shade steps
- [x] Typography scale: display / heading-lg / heading / body-lg / body / body-sm / caption / caption-sm × bold / regular
- [x] Spacing scale: xs / sm / md / lg / xl / 2xl
- [x] Radius scale: none / sm / md / lg / full
- [x] Border width scale: sm / md / lg / xl
- [x] Shadow extraction with deduplication by signature
- [x] Intra-extraction conflict detection — same-bucket collisions flagged immediately
- [x] Multi-frame comparison with conflict resolution UI
- [x] Side-by-side conflict cards — color swatches for colors, full detail for typography
- [x] Keep left / Keep right / Keep both per conflict
- [x] Keep both for all — resolve all conflicts in one click
- [x] Learned preferences — decisions persisted and auto-applied to future extractions
- [x] Results grouped by category (collapsible), colors sub-grouped by hue family
- [x] Typography sorted by scale, values show size / line height / letter spacing
- [x] Spacing and radii sorted by value
- [x] Tokens Studio JSON export
- [x] Accept all suggestions returns to results view with merged token set
- [x] Plugin width 520px, height 600px

---

## Known issues

- **Baseline resets on plugin close** — `baselineTokens` lives in memory. Persistence across sessions not yet implemented (learned rules persist, but the token set itself does not).
- **Existing Figma Variables ignored** — plugin reads raw values even when a node has a variable bound. Should check `boundVariables` first.
- **Typography [object Object] on second extraction** — intermittent display issue when typography tokens come through the comparison path.

---

## Roadmap

- [ ] Semantic token layer — map primitives to roles (brand, text, background, status)
- [ ] Persist full token store across sessions via `clientStorage`
- [ ] Write-back to Figma canvas — apply winning token to all layers using the losing value
- [ ] Figma Variables support — detect and respect existing bound variables
- [ ] Publish to Figma Community

---

## Session log

### Session 1
- Plugin scaffolded from scratch: VS Code, Node.js, Figma desktop
- Built extraction logic for colors, typography, spacing, radii
- Rules-based 3-tier naming
- Fixed TypeScript compilation issues
- Fixed Tokens Studio JSON structure (tokens must be nested inside a named set)
- Fixed UI display bugs ([object Object], undefined values)
- Successfully imported generated JSON into Tokens Studio

### Session 2
- Fixed gray misclassification (raised saturation threshold to 20%)
- Built multi-frame comparison logic
- Built conflict resolution UI with side-by-side color swatches
- Published to GitHub at github.com/tiffymoon/token-extractor

### Session 3
- Intra-extraction conflict detection (same-bucket collisions no longer silently suffixed)
- Results view grouped by hue family, sorted by shade
- Collapsible categories in results view
- Typography detail in conflict cards (size, line height, letter spacing)
- Keep both for all button
- Fixed accept all suggestions flow (currentTokens not being set on comparison path)
- Added line height and letter spacing to typography extraction
- Typography deduplication before naming
- Learned preferences via clientStorage — auto-resolves known conflicts on future extractions
- Border width extraction (strokeWeight + individualStrokeWeights)
- Drop shadow extraction with deduplication
- Plugin width increased to 520px
- Full code.ts rewrite to clear accumulated debt (duplicate traverse blocks, orphaned functions, stray expressions)
