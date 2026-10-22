# World generation verification

Verified on October 22, 2026 against the shared working checkout. Other game
changes were present during this run and were left intact.

## Repository checks

- `npm test`: 263 passed, zero failed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Existing unresolved public cursor/font path warnings
  and the large JavaScript chunk warning remain.
- `openspec validate add-world-generation-attributes --strict`: passed.

The procedural corpus generates 100 seeds with five extreme or interacting
profiles and repeats each result. It checks reachable stairs, legal unique
placements, stable output and bounded repairs. Other tests cover legacy saves,
immutable floor profiles, delayed container rewards, partial character spending,
batched awards, death, reload, saturation and repeated growth from rank 5 to 14.

## Tuning review

At dungeon level 1, the five-seed report compares uniform rank-1 and rank-5
profiles. Average encounters fall from 10.8 to 4.6, campfires rise from 1 to 4,
and entrance-to-exit route length falls from 51 to 15.2 cells. These profiles
isolate extremes; they are not valid starting 30-point sheets.

At rank 5, average enemy health rises from 10 at depth 1 to 25 at depth 6 and
42 at depth 12. Baseline depth therefore still increases threat independently
of beneficial world attributes. The automated report also records supply
density, recovery spacing and reward totals. These are initial tuning checks,
not a substitute for long-run human balance testing.

## Browser checks

The existing owned Vite server on port 6080 served all checks. Browser URLs
included `?mute=1`; the suite reused that server through
`PLAYWRIGHT_EXTERNAL_SERVER=1` and `PLAYWRIGHT_PORT=6080`.

- Playwright CLI with Microsoft Edge verified creation, roll completion,
  identity, tooltips, visible GPU minimap, exact preview confirmation, reload,
  automatic green world results and acknowledgment without additional growth.
- Dedicated Edge tests in `world-generation.spec.ts`: two passed.
- Mobile 390 by 844 and compact desktop 800 by 600 checks verified cancellation,
  visible generated minimaps and dialog/action bounds.
- Desktop Edge and the in-app browser both reached the playable game, rendered
  canvases, and reported no console errors or WebGPU-unavailable message.

## Full browser suite

`npm run test:browser:full` completed its original 88-test inventory across
Chrome and Edge in 20.7 minutes: 59 passed and 29 failed. The two new dedicated
world tests were added after that inventory started and passed separately.
Character creation and all three existing progression checks passed in both
configured browsers. All Wang artwork cases passed.

The failing checks concern campfire input readiness, chest and barrel fixtures,
quest selectors, storage/settings/help menus, manual-map export, focus and
keyboard trays, equipment swapping, aspect controls, sustained movement and
Chrome slot colors. Examples from the failure output:

- The quest selector matches both responsive copies of `My First Quest`.
- Clear-storage checks look for a button without opening its current menu.
- Aspect checks wait for an absent `Dev Settings` button.
- Chest/barrel checks inspect generated base entities directly in compact saves.
- Movement feedback reports `left did not sustain run` in both browsers.

These failures are outside the new world checks. This shared checkout has
concurrent unrelated changes, so this run alone does not establish when each
failure began. No clean-baseline comparison was performed, and the full suite
is not reported as passing. Failure traces and screenshots are under
`output/playwright/`.
