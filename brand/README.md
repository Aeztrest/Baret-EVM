# Baret — Brand assets

The Baret mark is a **hard hat**: protection before you sign.

## Files

| File | Use |
| --- | --- |
| `baret-mark.svg` / `baret-mark-{64,128,256,512,1024}.png` | App icon / avatar (ink tile + hard hat). Primary mark. |
| `baret-glyph.svg` / `baret-glyph-512.png` | Hard hat only, transparent (no tile) — for tinted contexts. |
| `baret-lockup.svg` / `.png` | Horizontal mark + wordmark, **dark text** (light backgrounds). |
| `baret-lockup-light.svg` / `.png` | Horizontal lockup, **white text** (dark backgrounds). |

The mark/glyph are pure vector shapes — crisp at any size, font-independent.
The lockups set the wordmark in **Space Grotesk Bold** (referenced via web font
in the SVG; the bundled PNGs fall back to a system bold where the font isn't
installed).

## Colors

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#141414` | Tile / wordmark on light / primary text |
| Luxury Gray | `#5B6169` | Brim / accent / wordmark dot |
| Luxury Gray (soft) | `#454A50` | Hover / pressed states |
| White | `#FFFFFF` | Dome / wordmark on dark |

A deliberately monochrome palette — black, white, and one graphite gray — kept
legible and low-fatigue: no saturated hues competing with the risk-severity
colors (`--ok` / `--warn` / `--bad` / `--live`) used elsewhere in the product.

## Typeface

Wordmark: **Space Grotesk**, weight 700, letter-spacing ~0.04em, uppercase.

## Don'ts

- Don't recolor the brim/accent to anything but the luxury gray.
- Don't add effects (shadows, gradients) to the mark.
- Keep clear space around the mark ≥ 25% of its height.

Live copies are served at `https://baret.example/brand/…`.
