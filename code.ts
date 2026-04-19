figma.showUI(__html__, { width: 400, height: 500, themeColors: true } as any);
let baselineTokens: Record<string, any> | null = null;
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'extract') {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'error',
        message: 'No frame selected. Please select a frame first.'
      });
      return;
    }

    const node = selection[0];
    const tokens = extractTokens(node) as Record<string, any>;

    if (!baselineTokens) {
     baselineTokens = tokens;
     figma.ui.postMessage({
       type: 'extracted',
       tokens,
       isBaseline: true
      });
    } else {
     const comparison = compareTokens(baselineTokens, tokens);
     figma.ui.postMessage({
       type: 'comparison',
       comparison
      });
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

function generateTokenNames(tokens: {
  colors: Record<string, string>,
  typography: Record<string, any>,
  spacing: Record<string, number>,
  radii: Record<string, number>
}) {
  const named = {
    colors: {} as Record<string, any>,
    typography: {} as Record<string, any>,
    spacing: {} as Record<string, any>,
    radii: {} as Record<string, any>
  };

  // --- COLORS ---
  const colorCounters: Record<string, number> = {};

  Object.values(tokens.colors).forEach((hex) => {
    const { h, s, l } = hexToHSL(hex);

    let tier2 = '';
    let shade = '';

    if (s < 20) {
      tier2 = 'neutral';
    } else if (h >= 0 && h < 20) {
      tier2 = 'red';
    } else if (h >= 20 && h < 45) {
      tier2 = 'orange';
    } else if (h >= 45 && h < 70) {
      tier2 = 'yellow';
    } else if (h >= 70 && h < 165) {
      tier2 = 'green';
    } else if (h >= 165 && h < 255) {
      tier2 = 'blue';
    } else if (h >= 255 && h < 290) {
      tier2 = 'purple';
    } else if (h >= 290 && h < 340) {
      tier2 = 'pink';
    } else {
      tier2 = 'red';
    }

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

    const key = `color.primitive.${tier2}.${shade}`;

    if (named.colors[key]) {
      colorCounters[key] = (colorCounters[key] || 1) + 1;
      named.colors[`${key}-${colorCounters[key]}`] = { value: hex, type: 'color' };
    } else {
      named.colors[key] = { value: hex, type: 'color' };
    }
  });

  // --- TYPOGRAPHY ---
  Object.values(tokens.typography).forEach((t: any) => {
    const size = parseFloat(t.fontSize);
    let scale = '';

    if (size >= 32) scale = 'display';
    else if (size >= 20) scale = 'heading';
    else if (size >= 14) scale = 'body';
    else scale = 'caption';

    const weight = t.fontWeight && t.fontWeight.toLowerCase().includes('bold') ? 'bold' : 'regular';
    const key = `typography.${scale}.${weight}`;

    named.typography[key] = {
      value: {
        fontFamily: t.fontFamily,
        fontSize: parseFloat(t.fontSize).toFixed(2),
        fontWeight: t.fontWeight
      },
      type: 'typography'
    };
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
    named.spacing[key] = { value: String(value), type: 'spacing' };
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
    named.radii[key] = { value: String(value), type: 'borderRadius' };
  });

  return named;
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

    // Check for exact match
    const exactMatch = Object.entries(baseline.colors).find(
      ([, bToken]: [string, any]) => bToken.value === inHex
    );

    if (exactMatch) {
      merged[exactMatch[0]] = exactMatch[1];
      return;
    }

    // Check for near match -- same hue family, within 15 lightness points
    const nearMatch = Object.entries(baseline.colors).find(
      ([bKey, bToken]: [string, any]) => {
        const { h: bH, s: bS, l: bL } = hexToHSL(bToken.value);
        const sameFamily = getHueFamily(inH, inS) === getHueFamily(bH, bS);
        const closeLightness = Math.abs(inL - bL) <= 15;
        return sameFamily && closeLightness;
      }
    );

    if (nearMatch) {
      conflicts.push({
        type: 'color',
        existing: { key: nearMatch[0], value: (nearMatch[1] as any).value },
        incoming: { key: inKey, value: inHex }
      });
      return;
    }

    // No match -- it's new
    added[inKey] = inToken;
  });

  // Compare typography
  Object.entries(incoming.typography).forEach(([inKey, inToken]: [string, any]) => {
    const exactMatch = Object.entries(baseline.typography).find(
      ([bKey]) => bKey === inKey
    );

    if (exactMatch) {
      merged[exactMatch[0]] = exactMatch[1];
      return;
    }

    // Check for near match -- same scale key but different values
    const nearMatch = Object.entries(baseline.typography).find(
      ([bKey]) => {
        const inParts = inKey.split('.');
        const bParts = bKey.split('.');
        return inParts[1] === bParts[1] && inParts[2] === bParts[2];
      }
    );

    if (nearMatch) {
      conflicts.push({
        type: 'typography',
        existing: { key: nearMatch[0], value: (nearMatch[1] as any).value },
        incoming: { key: inKey, value: inToken.value }
      });
      return;
    }

    added[inKey] = inToken;
  });

  // Compare spacing
  Object.entries(incoming.spacing).forEach(([inKey, inToken]: [string, any]) => {
    if (baseline.spacing[inKey]) {
      merged[inKey] = baseline.spacing[inKey];
    } else {
      const nearMatch = Object.entries(baseline.spacing).find(
        ([, bToken]: [string, any]) =>
          Math.abs(parseFloat(bToken.value) - parseFloat(inToken.value)) <= 2
      );

      if (nearMatch) {
        conflicts.push({
          type: 'spacing',
          existing: { key: nearMatch[0], value: (nearMatch[1] as any).value },
          incoming: { key: inKey, value: inToken.value }
        });
      } else {
        added[inKey] = inToken;
      }
    }
  });

  // Compare radii
  Object.entries(incoming.radii).forEach(([inKey, inToken]: [string, any]) => {
    if (baseline.radii[inKey]) {
      merged[inKey] = baseline.radii[inKey];
    } else {
      const nearMatch = Object.entries(baseline.radii).find(
        ([, bToken]: [string, any]) =>
          Math.abs(parseFloat(bToken.value) - parseFloat(inToken.value)) <= 1
      );

      if (nearMatch) {
        conflicts.push({
          type: 'radius',
          existing: { key: nearMatch[0], value: (nearMatch[1] as any).value },
          incoming: { key: inKey, value: inToken.value }
        });
      } else {
        added[inKey] = inToken;
      }
    }
  });

  return { merged, conflicts, added };
}

function getHueFamily(h: number, s: number): string {
  if (s < 20) return 'neutral';
  if (h >= 0 && h < 20) return 'red';
  if (h >= 20 && h < 45) return 'orange';
  if (h >= 45 && h < 70) return 'yellow';
  if (h >= 70 && h < 165) return 'green';
  if (h >= 165 && h < 255) return 'blue';
  if (h >= 255 && h < 290) return 'purple';
  if (h >= 290 && h < 340) return 'pink';
  return 'red';
}

function extractTokens(node: SceneNode): object {
  const colors: Record<string, string> = {};
  const typography: Record<string, object> = {};
  const spacing: Record<string, number> = {};
  const radii: Record<string, number> = {};

  function traverse(n: SceneNode) {
    if ('fills' in n && Array.isArray(n.fills)) {
      n.fills.forEach((fill) => {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          const { r, g, b } = fill.color;
          const hex = rgbToHex(r, g, b);
          const key = `color-${Object.keys(colors).length + 1}`;
          if (!Object.values(colors).includes(hex)) {
            colors[key] = hex;
          }
        }
      });
    }

    if ('cornerRadius' in n && typeof n.cornerRadius === 'number' && n.cornerRadius > 0) {
      const key = `radius-${n.cornerRadius}`;
      radii[key] = n.cornerRadius;
    }

    if (n.type === 'TEXT') {
      const key = `text-${Object.keys(typography).length + 1}`;
      typography[key] = {
        fontFamily: n.fontName !== figma.mixed ? (n.fontName as FontName).family : 'mixed',
        fontSize: n.fontSize !== figma.mixed ? n.fontSize : 'mixed',
        fontWeight: n.fontName !== figma.mixed ? (n.fontName as FontName).style : 'mixed',
      };
    }

    if ('itemSpacing' in n && typeof n.itemSpacing === 'number' && n.itemSpacing > 0) {
      const key = `spacing-${n.itemSpacing}`;
      spacing[key] = n.itemSpacing;
    }

    if ('children' in n) {
      n.children.forEach(traverse);
    }
  }

  traverse(node);

  return generateTokenNames({ colors, typography, spacing, radii });
}