# Tasks

## 1. Developer theme control

- [x] 1.1 Rename the desktop developer heading, wire the theme button to existing theme state, and remove the T shortcut; verify theme cycling, wraparound, world/minimap updates, and unchanged theme on T with focused checks.

## 2. Slot activation controls

- [x] 2.1 Restructure populated ability and quick-slot rows to include a real Use button while preserving row clicks, shortcuts, drag/drop, and empty or unavailable states; verify one action per click and no action on drag with focused tests.
- [x] 2.2 Style the Use control after the item name and verify it remains visible and usable in supported desktop and mobile layouts without disrupting other slot types.
- [x] 2.3 Run one focused Playwright check in Edge with `?mute=1` covering theme cycling, T removal, Use activation, unavailable and empty states, and dragging after the related implementation group.

## 3. Integrated verification

- [ ] 3.1 Run `npm test` and `npm run typecheck`; resolve relevant failures and verify the implemented behavior against both delta specs.
- [ ] 3.2 Complete the three-context browser verification required by `rogues-dungeon/AGENTS.md` for input and layout changes, and record results; reserve the full applicable browser suite for finalization.
