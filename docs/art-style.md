# Art style guide

Mage Quest aims for the look of a 16-bit top-down adventure such as A Link to the Past. All art follows these rules so tiles, characters and UI read as one game.

## Grid and view

- Everything sits on a 16x16 pixel grid. One tile is 16x16.
- The view is 3/4 top-down: you see the top of the floor and the front face of walls.
- The world is drawn at 2x zoom, so one art pixel is 2x2 screen pixels. Never draw art at a fractional scale, and never blur it. The canvas uses nearest-neighbor scaling.
- Light comes from the top-left. Highlights go on the top and left edges, shadows on the bottom and right.

## Outline and shading

- Every sprite has a 1 pixel dark outline in `ink` (`#1a1626`). Tiles that must join their neighbors (floor) skip the outline on the sides that touch.
- Each material has a ramp of tones, dark to light: `Dark`, plain, `Light`. Stone and wood have four tones. Use the ramp, do not invent in-between colors.
- No gradients, no anti-aliasing, no semi-transparent pixels except shadows and effects.

## Palette

The only source of colors is `src/view/palette.js` (`PALETTE.name`, or `paletteColor("name")` for a p5 color). Do not write RGB values in view code. If you need a color that is missing, add it to the palette and to this list.

| Group | Names (hex) |
|---|---|
| Darks | `void` #0d0b14, `ink` #1a1626 |
| Stone | `stoneShadow` #2e2a3d, `stoneDark` #484359, `stoneMid` #6c6781, `stoneLight` #9a97ab |
| Wood | `woodDark` #3b2418, `wood` #6b4226, `woodLight` #9c6b3a, `woodHighlight` #c8955a |
| Gold | `goldDark` #8a5a14, `gold` #d19a2a, `goldLight` #f0cf5a |
| Fire | `fireDark` #8f2a1d, `fire` #d9482b, `fireLight` #f2873a |
| Water | `waterDark` #1f3f73, `water` #3a73c4, `waterLight` #7cc0ec |
| Leaf | `leafDark` #1f4a2c, `leaf` #3f8a3f, `leafLight` #86c35a |
| Magic | `violetDark` #3a1f5c, `violet` #6a3fa0, `violetLight` #a97bd8 |
| Other | `skin` #e8b890, `bone` #e8e2d0, `white` #f6f2ea, `ice` #bfe8f0, `blood` #a8201f, `panel` #28243a, `panelLight` #3c3856 |

## Sprite sizes

- Small characters, enemies, items and tiles: 16x16.
- Tall characters (the player, humanoids): 16x32. The bottom 16x16 is the footprint used for collision.
- Bosses: 32x32 or larger, in multiples of 16.
- Sprite sheets are laid out on the same grid, one frame per cell, no padding.

## Animation frame counts

- Walk: 4 frames per direction (down, up, left, right). Idle can reuse the first walk frame.
- Attack or cast: 3 frames.
- Hurt: 1 frame. Death: 4 frames.
- Tiles and props that animate (torches, water): 2 to 4 frames at about 6 frames per second.

## Adding an asset

1. Draw it to the rules above, or recolor a CC0 asset to the palette.
2. Save it as a PNG under `assets/`, with a lowercase-hyphen file name (`stone-door.png`).
3. Load it with `loadImageFile` in the view code. Do not use `loadImage`, it fails on `file://`.
4. If anyone else made it, add a row to `assets/CREDITS.md` with the creator's name exactly as on the source page, the source URL and the license. Only CC0 or art we made ourselves goes in the repo. Copy the pack's license text next to the files if it includes one.
