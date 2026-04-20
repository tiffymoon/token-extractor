figma.showUI(__html__, { width: 400, height: 600, themeColors: true } as any);

let baselineTokens: Record<string, any> | null = null;
let learnedRules: Array<{type: string, key: string, winnerValue: string}> = [];

async function loadRules() {
  const saved = await figma.clientStorage.getAsync('learnedRules');
  if (saved) learnedRules = saved;
}

async function saveRules() {
  await figma.clientStorage.setAsync('learnedRules', learnedRules);
}

loadRules();

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'save-rules') {
    msg.rules.forEach(function(rule: any) {
      const exists = learnedRules.find(r => r.type === rule.type && r.key === rule.key && r.winnerValue === rule.winnerValue);
      if (!exists) learnedRules.push(rule);
    });
    await saveRules();
    return;
  }

  if (msg.type === 'load-rules') {
    figma.ui.postMessage({ type: 'rules-loaded', rules: learnedRules });
    return;
  }

  if (msg.type === 'extract') {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'No frame selected. Please select a frame first.' });
      return;
    }

    const node = selection[0];
    const tokens = extractTokens(node) as Record<string, any>;
    const intraConflicts = tokens.intraConflicts;
    const namedTokens = {
      colors: tokens.colors,
      typography: tokens.typography,
      spacing: tokens.spacing,
      radii: tokens.radii,
      borderWidths: tokens.borderWidths,
      shadows: tokens.shadows
    };

    if (!baselineTokens) {
      baselineTokens = namedTokens;

      if (intraConflicts && intraConflicts.length > 0) {
        figma.ui.postMessage({
          type: 'comparison',
          comparison: { merged: {}, conflicts: intraConflicts, added: {}, isIntraExtraction: true },
          tokens: namedTokens
        });
      } else {
        figma.ui.postMessage({ type: 'extracted', tokens: namedTokens, isBaseline: true });
      }
    } else {
      const comparison = compareTokens(baselineTokens, namedTokens);
      figma.ui.postMessage({ type: 'comparison', comparison, tokens: namedTokens });
    }
  }
};

function hexToHSL(hex: string): { h: number, s: number, l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function getColorKey(hex: string): { tier2: string, shade: string } {
  const { h, s, l } = hexToHSL(hex);
  let tier2 = '';
  if (s < 20) tier2 = 'neutral';
  else if (h < 20) tier2 = 'red';
  else if (h < 45) tier2 = 'orange';
  else if (h < 70) tier2 = 'yellow';
  else if (h < 165) tier2 = 'green';
  else if (h < 255) tier2 = 'blue';
  else if (h < 290) tier2 = 'purple';
  else if (h < 340) tier2 = 'pink';
  else tier2 = 'red';

  let shade = '';
  if (l >= 95) shade = '50';
  else if (l >= 85) shade = '100';
  else if (l >= 75) shade = '200';
  else if (l >= 65) shade = '300';
  else if (l >= 55) shade = '400';
  else if (l >= 45) shade = '500';
  else if (l >= 35) shade = '600';
  else if (l >= 25) shade = '700';
  else if (l >= 15) shade = '800';
  else shade = '900';

  return { tier2, shade };
}

function getHueFamily(h: number, s: number): string {
  if (s < 20) return 'neutral';
  if (h < 20) return 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 165) return 'green';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  if (h < 340) return 'pink';
  return 'red';
}

function normalizeWeight(w: string): string {
  const s = (w || '').toLowerCase().trim();
  if (s === 'roman' || s === 'normal' || s === 'regular') return 'regular';
  return s;
}

function generateTokenNames(tokens: {
  colors: Record<string, string>,
  typography: Record<string, any>,
  spacing: Record<string, number>,
  radii: Record<string, number>,
  borderWidths: Record<string, number>,
  shadows: Record<string, any>
}) {
  const named = {
    colors: {} as Record<string, any>,
    typography: {} as Record<string, any>,
    spacing: {} as Record<string, any>,
    radii: {} as Record<string, any>,
    borderWidths: {} as Record<string, any>,
    shadows: {} as Record<string, any>
  };
  const intraConflicts: Array<any> = [];

  // --- COLORS ---
  Object.values(tokens.colors).forEach((hex) => {
    const { tier2, shade } = getColorKey(hex);
    const key = `color.primitive.${tier2}.${shade}`;
    if (named.colors[key]) {
      const existingHex = named.colors[key].value;
      if (existingHex !== hex) {
        intraConflicts.push({
          type: 'color',
          existing: { key, value: existingHex },
          incoming: { key, value: hex },
          reason: `Two ${tier2} values share the same shade bucket (${shade})`
        });
      }
    } else {
      named.colors[key] = { value: hex, type: 'color' };
    }
  });

  // --- TYPOGRAPHY ---
  Object.values(tokens.typography).forEach((t: any) => {
    const size = parseFloat(t.fontSize);
    let scale = '';
    if (size >= 40) scale = 'display';
    else if (size >= 28) scale = 'heading-lg';
    else if (size >= 22) scale = 'heading';
    else if (size >= 18) scale = 'body-lg';
    else if (size >= 15) scale = 'body';
    else if (size >= 13) scale = 'body-sm';
    else if (size >= 11) scale = 'caption';
    else scale = 'caption-sm';

    const weight = t.fontWeight && t.fontWeight.toLowerCase().includes('bold') ? 'bold' : 'regular';
    const key = `typography.${scale}.${weight}`;

    if (named.typography[key]) {
      const existing = named.typography[key].value;
      const same =
        existing.fontFamily === t.fontFamily &&
        parseFloat(existing.fontSize) === parseFloat(String(t.fontSize)) &&
        normalizeWeight(existing.fontWeight) === normalizeWeight(t.fontWeight) &&
        (existing.lineHeight == null && t.lineHeight == null ||
          parseFloat(existing.lineHeight) === parseFloat(String(t.lineHeight))) &&
        (parseFloat(existing.letterSpacing || 0) === parseFloat(String(t.letterSpacing || 0)));
      if (!same) {
        intraConflicts.push({
          type: 'typography',
          existing: { key, value: existing },
          incoming: { key, value: { fontFamily: t.fontFamily, fontSize: t.fontSize, fontWeight: t.fontWeight, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing } },
          reason: `Two ${scale} ${weight} styles found with different values`
        });
      }
    } else {
      named.typography[key] = {
        value: {
          fontFamily: t.fontFamily,
          fontSize: parseFloat(t.fontSize).toFixed(2),
          fontWeight: t.fontWeight,
          lineHeight: t.lineHeight != null ? parseFloat(t.lineHeight).toFixed(2) : null,
          letterSpacing: t.letterSpacing != null ? parseFloat(t.letterSpacing).toFixed(2) : null,
        },
        type: 'typography'
      };
    }
  });

  // --- SPACING ---
  Object.values(tokens.spacing).forEach((value: number) => {
    let scale = '';
    if (value <= 4) scale = 'xs';
    else if (value <= 8) scale = 'sm';
    else if (value <= 16) scale = 'md';
    else if (value <= 24) scale = 'lg';
    else if (value <= 32) scale = 'xl';
    else scale = '2xl';
    const key = `spacing.${scale}`;
    if (named.spacing[key]) {
      const existingVal = parseFloat(named.spacing[key].value);
      if (existingVal !== value) {
        intraConflicts.push({
          type: 'spacing',
          existing: { key, value: String(existingVal) },
          incoming: { key, value: String(value) },
          reason: `Two spacing values map to the same scale (${scale})`
        });
      }
    } else {
      named.spacing[key] = { value: String(value), type: 'spacing' };
    }
  });

  // --- RADII ---
  Object.values(tokens.radii).forEach((value: number) => {
    let scale = '';
    if (value === 0) scale = 'none';
    else if (value <= 4) scale = 'sm';
    else if (value <= 8) scale = 'md';
    else if (value <= 16) scale = 'lg';
    else scale = 'full';
    const key = `radius.${scale}`;
    if (named.radii[key]) {
      const existingVal = parseFloat(named.radii[key].value);
      if (existingVal !== value) {
        intraConflicts.push({
          type: 'radius',
          existing: { key, value: String(existingVal) },
          incoming: { key, value: String(value) },
          reason: `Two radius values map to the same scale (${scale})`
        });
      }
    } else {
      named.radii[key] = { value: String(value), type: 'borderRadius' };
    }
  });

  // --- BORDER WIDTHS ---
  Object.values(tokens.borderWidths).forEach((value: number) => {
    let scale = '';
    if (value <= 1) scale = 'sm';
    else if (value <= 2) scale = 'md';
    else if (value <= 4) scale = 'lg';
    else scale = 'xl';
    const key = `borderWidth.${scale}`;
    if (named.borderWidths[key]) {
      const existingVal = parseFloat(named.borderWidths[key].value);
      if (existingVal !== value) {
        intraConflicts.push({
          type: 'borderWidth',
          existing: { key, value: String(existingVal) },
          incoming: { key, value: String(value) },
          reason: `Two border widths map to the same scale (${scale})`
        });
      }
    } else {
      named.borderWidths[key] = { value: String(value), type: 'borderWidth' };
    }
  });

  // --- SHADOWS ---
  Object.values(tokens.shadows).forEach((s: any) => {
    const key = `shadow-${Object.keys(named.shadows).length + 1}`;
    named.shadows[key] = {
      value: {
        x: String(s.x),
        y: String(s.y),
        blur: String(s.blur),
        spread: String(s.spread),
        color: s.color,
        opacity: String(s.alpha),
        type: 'dropShadow'
      },
      type: 'boxShadow'
    };
  });

  return { named, intraConflicts };
}

function compareTokens(
  baseline: Record<string, any>,
  incoming: Record<string, any>
): object {
  const merged: Record<string, any> = {};
  const conflicts: Array<any> = [];
  const added: Record<string, any> = {};

  // Compare colors
  Object.entries(incoming.colors).forEach(([inKey, inToken]: [string, any]) => {
    const inHex = inToken.value;
    const { h: inH, s: inS, l: inL } = hexToHSL(inHex);
    const exactMatch = Object.entries(baseline.colors).find(([, bToken]: [string, any]) => bToken.value === inHex);
    if (exactMatch) { merged[exactMatch[0]] = exactMatch[1]; return; }
    const nearMatch = Object.entries(baseline.colors).find(([, bToken]: [string, any]) => {
      const { h: bH, s: bS, l: bL } = hexToHSL(bToken.value);
      return getHueFamily(inH, inS) === getHueFamily(bH, bS) && Math.abs(inL - bL) <= 15;
    });
    if (nearMatch) {
      conflicts.push({ type: 'color', existing: { key: nearMatch[0], value: (nearMatch[1] as any).value }, incoming: { key: inKey, value: inHex } });
      return;
    }
    added[inKey] = inToken;
  });

  // Compare typography
  Object.entries(incoming.typography).forEach(([inKey, inToken]: [string, any]) => {
    const exactMatch = Object.entries(baseline.typography).find(([bKey]) => bKey === inKey);
    if (exactMatch) { merged[exactMatch[0]] = exactMatch[1]; return; }
    const nearMatch = Object.entries(baseline.typography).find(([bKey]) => {
      const inParts = inKey.split('.');
      const bParts = bKey.split('.');
      return inParts[1] === bParts[1] && inParts[2] === bParts[2];
    });
    if (nearMatch) {
      conflicts.push({ type: 'typography', existing: { key: nearMatch[0], value: (nearMatch[1] as any).value }, incoming: { key: inKey, value: inToken.value } });
      return;
    }
    added[inKey] = inToken;
  });

  // Compare spacing
  Object.entries(incoming.spacing).forEach(([inKey, inToken]: [string, any]) => {
    if (baseline.spacing[inKey]) { merged[inKey] = baseline.spacing[inKey]; return; }
    const nearMatch = Object.entries(baseline.spacing).find(([, bToken]: [string, any]) =>
      Math.abs(parseFloat(bToken.value) - parseFloat(inToken.value)) <= 2
    );
    if (nearMatch) {
      conflicts.push({ type: 'spacing', existing: { key: nearMatch[0], value: (nearMatch[1] as any).value }, incoming: { key: inKey, value: inToken.value } });
    } else {
      added[inKey] = inToken;
    }
  });

  // Compare radii
  Object.entries(incoming.radii).forEach(([inKey, inToken]: [string, any]) => {
    if (baseline.radii[inKey]) { merged[inKey] = baseline.radii[inKey]; return; }
    const nearMatch = Object.entries(baseline.radii).find(([, bToken]: [string, any]) =>
      Math.abs(parseFloat(bToken.value) - parseFloat(inToken.value)) <= 1
    );
    if (nearMatch) {
      conflicts.push({ type: 'radius', existing: { key: nearMatch[0], value: (nearMatch[1] as any).value }, incoming: { key: inKey, value: inToken.value } });
    } else {
      added[inKey] = inToken;
    }
  });

  return { merged, conflicts, added };
}

function extractTokens(node: SceneNode): object {
  const colors: Record<string, string> = {};
  const typography: Record<string, object> = {};
  const spacing: Record<string, number> = {};
  const radii: Record<string, number> = {};
  const borderWidths: Record<string, number> = {};
  const shadows: Record<string, object> = {};

  function traverse(n: SceneNode) {
    if ('fills' in n && Array.isArray(n.fills)) {
      n.fills.forEach((fill) => {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
          if (!Object.values(colors).includes(hex)) {
            colors[`color-${Object.keys(colors).length + 1}`] = hex;
          }
        }
      });
    }

    if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length > 0) {
      const sw = (n as any).strokeWeight;
      if (typeof sw === 'number' && sw > 0) {
        borderWidths[`borderWidth-${sw}`] = sw;
      }
      const isw = (n as any).individualStrokeWeights;
      if (isw) {
        [isw.top, isw.right, isw.bottom, isw.left].forEach((w: any) => {
          if (typeof w === 'number' && w > 0) borderWidths[`borderWidth-${w}`] = w;
        });
      }
    }

    if ('effects' in n && Array.isArray(n.effects)) {
      n.effects.forEach((effect: any) => {
        if (effect.type === 'DROP_SHADOW' && effect.visible !== false) {
          const hex = rgbToHex(effect.color.r, effect.color.g, effect.color.b);
          const alpha = parseFloat(effect.color.a.toFixed(2));
          const sig = `${effect.offset.x}|${effect.offset.y}|${effect.radius}|${effect.spread}|${hex}|${alpha}`;
          if (!Object.values(shadows).some((s: any) => s.sig === sig)) {
            shadows[`shadow-${Object.keys(shadows).length + 1}`] = {
              x: effect.offset.x, y: effect.offset.y,
              blur: effect.radius, spread: effect.spread,
              color: hex, alpha, sig
            };
          }
        }
      });
    }

    if ('cornerRadius' in n && typeof n.cornerRadius === 'number' && n.cornerRadius > 0) {
      radii[`radius-${n.cornerRadius}`] = n.cornerRadius;
    }

    if (n.type === 'TEXT') {
      const lh = n.lineHeight !== figma.mixed ? n.lineHeight as LineHeight : null;
      const lineHeight = (lh && lh.unit !== 'AUTO') ? (lh as { unit: 'PIXELS' | 'PERCENT', value: number }).value : null;
      const letterSpacing = n.letterSpacing !== figma.mixed ? (n.letterSpacing as LetterSpacing).value : null;
      typography[`text-${Object.keys(typography).length + 1}`] = {
        fontFamily: n.fontName !== figma.mixed ? (n.fontName as FontName).family : 'mixed',
        fontSize: n.fontSize !== figma.mixed ? n.fontSize : 'mixed',
        fontWeight: n.fontName !== figma.mixed ? (n.fontName as FontName).style : 'mixed',
        lineHeight,
        letterSpacing,
      };
    }

    if ('itemSpacing' in n && typeof n.itemSpacing === 'number' && n.itemSpacing > 0) {
      spacing[`spacing-${n.itemSpacing}`] = n.itemSpacing;
    }

    if ('children' in n) {
      n.children.forEach(traverse);
    }
  }

  traverse(node);

  // Deduplicate typography
  const seenTypo: Set<string> = new Set();
  const dedupedTypography: Record<string, object> = {};
  Object.entries(typography).forEach(([key, t]: [string, any]) => {
    const sig = [t.fontFamily, t.fontSize, t.fontWeight, t.lineHeight, t.letterSpacing].join('|');
    if (!seenTypo.has(sig)) {
      seenTypo.add(sig);
      dedupedTypography[key] = t;
    }
  });

  // Deduplicate border widths
  const uniqueBorderWidths: Record<string, number> = {};
  Object.values(borderWidths).forEach((value) => {
    uniqueBorderWidths[`borderWidth-${value}`] = value;
  });

  const { named, intraConflicts } = generateTokenNames({ colors, typography: dedupedTypography, spacing, radii, borderWidths: uniqueBorderWidths, shadows });
  return { colors: named.colors, typography: named.typography, spacing: named.spacing, radii: named.radii, borderWidths: named.borderWidths, shadows: named.shadows, intraConflicts };
}
