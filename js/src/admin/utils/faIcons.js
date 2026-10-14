/**
 * The Font Awesome icons this forum can actually draw, read from the
 * stylesheet it already loads — so there is no icon list to download, and the
 * picker always matches the bundled Font Awesome version.
 *
 * Every icon is a rule like `.fa-github{--fa:"\f09b"}`. Core's Iconography.less
 * inlines fontawesome.css (the classic icons) and then brands.css, whose
 * glyphs follow the "Font Awesome 7 Brands" @font-face — that is what tells a
 * brand (`fab`) from a classic icon (`fas`/`far`).
 */
let cache = null;

const SINGLE = /^\.fa-[a-z0-9-]+$/;

// `"\f015"`, `"\!"` or a literal character — the CSS string, as authored.
function decode(value) {
  const body = value.trim().replace(/^["']|["']$/g, '');
  const hex = body.match(/^\\([0-9a-f]{1,6})\s?$/i);
  if (hex) return String.fromCodePoint(parseInt(hex[1], 16));
  return body.startsWith('\\') ? body.slice(1) : body;
}

export default function faIcons() {
  if (cache) return cache;

  const classic = new Map();
  const brands = new Map();

  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch (e) {
      continue; // another origin's stylesheet (a Kit or CDN): not readable
    }

    let inBrands = false;

    for (const rule of Array.from(rules || [])) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        inBrands = /Brands/i.test(rule.style.getPropertyValue('font-family'));
        continue;
      }

      const glyph = rule.style?.getPropertyValue('--fa');
      if (!glyph || !rule.selectorText) continue;

      const names = rule.selectorText.split(',').map((s) => s.trim());
      if (!names.every((s) => SINGLE.test(s))) continue;

      // The last selector is the current name; earlier ones are old aliases.
      // An alias with a rule of its own shares its glyph with the real icon,
      // so it becomes a search word for that icon rather than a duplicate.
      const list = inBrands ? brands : classic;
      const char = decode(glyph);
      const words = names.map((s) => s.slice(4)).join(' ');
      const existing = list.get(char);

      if (existing) existing.search += ' ' + words;
      else list.set(char, { name: names[names.length - 1].slice(4), char, search: words });
    }
  }

  cache = { classic: [...classic.values()], brands: [...brands.values()] };
  return cache;
}

/**
 * Only some classic icons have a free Regular (outline) glyph. The Regular
 * font draws one shared placeholder for every icon it lacks — the same shape
 * it draws for a code point no icon uses — so an icon has a Regular version
 * exactly when it draws differently from that placeholder.
 */
let regular = null;

export async function regularIcons() {
  if (regular) return regular;

  const font = '400 24px "Font Awesome 7 Free"';
  await document.fonts.load(font, '\uf0f3').catch(() => {});

  const size = 28;
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  ctx.canvas.width = ctx.canvas.height = size;
  ctx.textBaseline = 'top';
  ctx.font = font;

  const pixels = (char) => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillText(char, 2, 2);
    return new Uint32Array(ctx.getImageData(0, 0, size, size).data.buffer);
  };

  const placeholder = pixels('\uf8fe');

  regular = faIcons().classic.filter((icon) => pixels(icon.char).some((value, i) => value !== placeholder[i]));

  return regular;
}
