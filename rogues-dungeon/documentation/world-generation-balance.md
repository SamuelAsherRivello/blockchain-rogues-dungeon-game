# World-generation balance

Normal floors use bounded budgets after walkable space and protected routes are
selected. World attributes adjust supply and reward budgets within bounded
multipliers; they do not turn every walkable cell into a placement.

## Level progression

The enemy roster unlocks in stages: Level 1 has the first 2 ranked enemies,
Level 2 the first 4, Level 3 the first 6, Level 4 the first 7, and Level 5 and
later all currently catalogued enemies.

| Level | Potions | Gold piles | Keys before door coverage | World items | Enemies | Traps |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1–3 | 2–4 | 0–1 | 0–1 | 2–3 | 1 |
| 2 | 2–4 | 2–5 | 0–1 | 0–1 | 3–4 | 1–2 |
| 3 | 3–5 | 3–6 | 0–2 | 0–2 | 4–5 | 2 |
| 4 | 3–6 | 3–7 | 0–2 | 0–2 | 4–6 | 2–3 |
| 5 | 4–7 | 4–8 | 1–2 | 1–2 | 5–7 | 2–3 |
| 6–10 | 4–8 | 4–10 | 1–3 | 1–3 | 6–10 | 3–5 |

The remaining normal-floor budgets are 0–1 campfires on Level 1, 1–2 on
Level 2–4, and 1–3 on Level 5–10; chests and crates remain bounded at 0–3
each. Placement still avoids protected routes and occupied cells.

## Item unlocks and rarity

| First level | Items | Rarity |
| ---: | --- | --- |
| 1 | Wooden Stick | Common |
| 2 | Dagger (Magic), Sword, Oak Shield 03, Heal, Wand | Uncommon |
| 2 | Extra Space | Rare |
| 3 | Two-Handed Sword, Suit of Armor | Very rare |
| 3 | Chest Armor, Leg Armor (Magic) | Rare |

The weighted bands are common 60%, uncommon 25%, rare 11%, and very rare 4%
when a weighted world-item roll is made. Eligibility is always applied first,
so a gated item cannot appear early even if its rarity is rolled.

## Doors and keys

Keys are universal. Every explicitly keyed door contributes to
`keyedDoorCount`, and generation enforces:

`keyCount >= keyedDoorCount`

Trigger-only puzzle doors are not keyed doors and therefore do not consume key
coverage. Normal generation starts with the budgeted key count, raises it to
the number of keyed doors when necessary, then has at most one surplus key.
The surplus chance starts at 5% on Level 1 and rises with level and difficulty
to a maximum of 30%.

## Test modes

Level 1 object-test and enemy-test modes are isolated showcase branches near
the entrance. They may add their own fixtures while suppressing the affected
normal placement. They never activate on later levels, and disabled test modes
use the sparse normal budgets.
