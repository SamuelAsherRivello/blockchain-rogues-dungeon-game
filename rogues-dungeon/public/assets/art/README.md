# Art asset layout

Project-created world art is organized under the same presentation categories as supplied art; particle frames belong in `game-view/particles/<effect-name>/`.

The supplied pack is organized by runtime use rather than by vendor:

- `ui/` contains interface artwork, including menu art under `ui/menu/`.
- `game-view/characters/`, `game-view/enemies/`, `game-view/items/`, and `game-view/props/` contain loose world-facing sprite assets.
- `game-view/particles/` contains world particle animation frames.
- Project-created world variants live under `game-view/` alongside their runtime category, such as `game-view/tilesets/custom/` and `game-view/campfire/`.
- `game-view/tilesets/art/` contains canonical tile and object atlas PNGs.
- `game-view/tilesets/data/` contains the matching runtime Tiled TSX definitions.
- `game-view/tilesets/examples/` is reserved for tileset-only examples and is not loaded at runtime.
- `game-view/maps/examples/` contains non-runtime Tiled sample maps.
- `game-view/maps/prefabs/` contains authored map fragments that runtime generation may stamp into a generated floor.

Record the supplied pack's name, source, license, and required attribution in `documentation/asset-provenance.md`. The directory names describe how assets are used; they do not replace provenance information.
