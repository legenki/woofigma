const FALLBACK: FontName = { family: "Inter", style: "Regular" };

export async function loadFontWithFallback(
  requested: FontName,
  missingFamilies: Set<string>
): Promise<FontName> {
  try {
    await figma.loadFontAsync(requested);
    return requested;
  } catch {
    missingFamilies.add(requested.family);
    
    // Try to preserve the requested style with the fallback family
    const styleFallback: FontName = { family: FALLBACK.family, style: requested.style };
    try {
      await figma.loadFontAsync(styleFallback);
      return styleFallback;
    } catch {
      // If that fails, fall back to Regular
      await figma.loadFontAsync(FALLBACK);
      return FALLBACK;
    }
  }
}
