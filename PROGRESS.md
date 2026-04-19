# Token Extractor — Progress Log

## What this is
A Figma plugin that extracts design tokens from a selected frame and outputs Tokens Studio-compatible JSON. The longer-term goal is to run it across multiple frames/files and incrementally build a design system by comparing and reconciling tokens across extractions.

**Primary use case:** Reverse-engineering an implicit design system from existing product files where the component library source file is unavailable.

---

## Decisions & why

- **Output format:** Tokens Studio JSON (not W3C or Style Dictionary) because it maps directly to an existing workflow and can be tested immediately by importing into the Tokens Studio plugin.
- **Token naming:** 3-tier structure (primitive → semantic → component). Currently only generating Tier 1 (primitive) automatically. Tier 2 and 3 are future work.
- **Naming logic:** Rules-based (HSL colour analysis, font size scales, spacing t-shirt sizes) rather than Anthropic API calls. Chosen to avoid API costs during testing. API layer is designed to slot in later without restructuring.
- **No write-back to Figma canvas:** Plugin is read-only for now. Output is a downloadable JSON file only. Write-back (applying resolved token to all layers using a colour) is planned as a future power feature.
- **Conflict resolution defaults to "keep existing":** When the user hits Accept All, the existing token wins on all conflicts. Individual decisions can be overridden before accepting.
- **Resizable UI:** Not currently supported by Figma's TypeScript types so disabled for now. Width set to 400px as a reasonable default.

---

## What's working

- [x] Plugin scaffolded and running in Figma desktop
- [x] Frame selection and node traversal
- [x] Extraction of: colours (solid fills), typography (font family, weight, size), spacing (auto layout item spacing), border radius
- [x] Rules-based token naming using HSL analysis and scale mapping
- [x] 3-tier colour naming: `color.primitive.{hue}.{shade}`
- [x] Gray detection threshold raised to 20% saturation (fixes cool gray misclassification)
- [x] Typography scale: display / heading / body / caption + bold / regular
- [x] Spacing scale: xs / sm / md / lg / xl / 2xl
- [x] Radius scale: none / sm / md / lg / full
- [x] Tokens Studio JSON export (wrapped in `global` set)
- [x] Colour swatches in the UI
- [x] Summary count on extraction
- [x] Multi-frame extraction -- second extraction triggers comparison against baseline
- [x] Conflict resolution UI with side-by-side colour swatches
- [x] Three resolution options per conflict: Keep existing / Use new / Keep both
- [x] New tokens auto-added and shown for review
- [x] Matched tokens collapsed by default
- [x] Accept all suggestions -- merges resolved tokens and returns to results view
- [x] "Add another frame" button -- continues building on existing token set
- [x] Export button always available after extraction and after comparison
- [x] Plugin width 400px, height 500px

---

## Known issues / bugs to fix

- **Existing variable bindings ignored:** Plugin currently reads raw hex values even when a node already has a Figma variable bound to it. Should check `node.boundVariables` first and use the existing token name if present.
- **Duplicate shade slots within single extraction:** When two colours from the same frame map to the same shade bucket, they should trigger the conflict resolution UI immediately rather than auto-numbering with `-2`.
- **Typography in comparison view:** Typography conflicts not yet showing detailed values side by side in the comparison screen.
- **Baseline resets on plugin close:** `baselineTokens` lives in memory and is lost when the plugin is closed. Persistence across sessions not yet implemented.

---

## Next steps (priority order)

1. **Check `node.boundVariables` before extracting raw values** -- use existing token names where they exist, fall back to rules-based naming only when nothing is bound
2. **Fix intra-frame duplicate handling** -- flag same-frame shade collisions in the conflict UI rather than auto-numbering
3. **Persist token store across plugin sessions** -- use Figma's `clientStorage` API to save and reload the accumulated token set
4. **Write-back to Figma canvas** -- apply the winning token to all layers using the losing colour value
5. **Add Anthropic API layer for semantic naming** -- optional step that uses Claude to suggest better token names, grouped under a user-provided API key
6. **Tier 2 token generation** -- map primitives to semantic roles (success, error, brand, neutral etc.)
7. **Test on more files** -- validate extraction quality and naming accuracy across a wider range of product screens

---

## Session log

### Session 1
- Set up plugin from scratch: VS Code, Node.js, Figma desktop, plugin scaffolding
- Built extraction logic for colours, typography, spacing, radii
- Added rules-based 3-tier naming
- Fixed TypeScript compilation issues (function ordering, optional chaining compatibility)
- Fixed Tokens Studio JSON structure (tokens must be nested inside a named set)
- Fixed UI display bugs ([object Object], undefined values)
- Successfully imported generated JSON into Tokens Studio
- Identified first real-world issues: gray misclassification, duplicate shade slots, ignored variable bindings

### Session 2
- Fixed gray misclassification (raised saturation threshold from 10% to 20%)
- Built multi-frame comparison logic in `code.ts`
- Built conflict resolution UI (State 3) with side-by-side colour swatches
- Three resolution options per conflict: Keep existing / Use new / Keep both
- Accept all suggestions merges resolved tokens and returns to results view
- Fixed "Extract from another frame" label to "Add another frame" for clarity
- Fixed accept triggering unwanted file download
- Published to GitHub at github.com/tiffymoon/token-extractor
