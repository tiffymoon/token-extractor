# Token Extractor — Progress Log

## What this is
A Figma plugin that extracts design tokens from a selected frame and outputs Tokens Studio-compatible JSON. The longer-term goal is to run it across multiple frames/files and incrementally build a design system by comparing and reconciling tokens across extractions.

**Primary use case:** Reverse-engineering an implicit design system from existing files where the component library source file is unavailable.

---

## Decisions & why

- **Output format:** Tokens Studio JSON (not W3C or Style Dictionary) because it maps directly to an existing workflow and can be tested immediately by importing into the Tokens Studio plugin.
- **Token naming:** 3-tier structure (primitive → semantic → component). Currently only generating Tier 1 (primitive) automatically. Tier 2 and 3 are future work.
- **Naming logic:** Rules-based (HSL colour analysis, font size scales, spacing t-shirt sizes) rather than Anthropic API calls. Chosen to avoid API costs during testing. API layer is designed to slot in later without restructuring.
- **No write-back to Figma canvas:** Plugin is read-only for now. Output is a downloadable JSON file only.
- **Resizable UI:** Not currently supported by Figma's TypeScript types so disabled for now. Width set to 380px as a reasonable default.

---

## What's working

- [x] Plugin scaffolded and running in Figma desktop
- [x] Frame selection and node traversal
- [x] Extraction of: colours (solid fills), typography (font family, weight, size), spacing (auto layout item spacing), border radius
- [x] Rules-based token naming using HSL analysis and scale mapping
- [x] 3-tier colour naming: `color.primitive.{hue}.{shade}`
- [x] Typography scale: display / heading / body / caption + bold / regular
- [x] Spacing scale: xs / sm / md / lg / xl / 2xl
- [x] Radius scale: none / sm / md / lg / full
- [x] Tokens Studio JSON export (wrapped in `global` set)
- [x] Colour swatches in the UI
- [x] Summary count on extraction
- [x] "Extract from another frame" button (resets to State 1)
- [x] Plugin width 380px, height 500px

---

## Known issues / bugs to fix

- **Gray misclassification:** Low-saturation colours (e.g. `#939CA9`) are being classified as blue because the saturation threshold is set at 10%. Need to raise to ~20% to catch cool grays correctly.
- **Duplicate shade slots:** When two colours map to the same tier/shade key, the second gets a `-2` suffix (e.g. `color.primitive.blue.800-2`). This needs proper conflict resolution rather than mechanical numbering.
- **Existing variable bindings ignored:** Plugin currently reads raw hex values even when a node already has a Figma variable bound to it. Should check `node.boundVariables` first and use the existing token name if present.
- **Typography values showing as undefined:** Fixed in current version but worth re-testing across files with mixed or missing font data.

---

## Next steps (priority order)

1. **Check `node.boundVariables` before extracting raw values** — use existing token names where they exist, fall back to rules-based naming only when nothing is bound
2. **Fix gray misclassification** — raise saturation threshold from 10% to ~20%
3. **Improve duplicate handling** — flag conflicts instead of auto-numbering, surface them in the UI for review
4. **Build the comparison/reconciliation flow** — the core feature: extract from a second frame, diff against the existing token set, show matches / conflicts / new tokens
5. **Persistent token store** — keep the accumulated token set across multiple extractions within a session
6. **Add Anthropic API layer for semantic naming** — optional step that uses Claude to suggest better token names, grouped under a user-provided API key
7. **Tier 2 token generation** — map primitives to semantic roles (success, error, brand, neutral etc.)
8. **Test on real files** — validate extraction quality and naming accuracy across actual product screens

---

## Session log

### 2026-04-19
- First working session
- Set up plugin from scratch: VS Code, Node.js, Figma desktop, plugin scaffolding
- Built extraction logic for colours, typography, spacing, radii
- Added rules-based 3-tier naming
- Fixed TypeScript compilation issues (function ordering, optional chaining compatibility)
- Fixed Tokens Studio JSON structure (tokens must be nested inside a named set)
- Fixed UI display bugs ([object Object], undefined values)
- Successfully imported generated JSON into Tokens Studio
- Identified first real-world issues from file testing: gray misclassification, duplicate shade slots, ignored variable bindings
