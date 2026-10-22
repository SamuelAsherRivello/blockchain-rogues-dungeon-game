# Droppable Item Representation Table

This is the approval list for world representations. Existing atlas entries are
reused where noted. New art remains intentionally unregistered until this list
is approved and a target Tiled tileset is selected.

| Domain item | Source | World representation | Art status |
| --- | --- | --- | --- |
| Health Potion | Inventory consumable | Potion pickup, health frame | Reuse existing `items-static` entry |
| Mana Potion | Inventory consumable | Potion pickup, mana frame | Reuse existing `items-static` entry |
| Extra Space | Capacity item | Small capacity-bag / pack pickup | New sprite required |
| Heal | Ability item | Arcane star / healing sigil pickup | New sprite required |
| Wand | Ability item | Wand pickup | New sprite required |
| Dagger (Magic) | Weapon | Blue-glint dagger pickup | New sprite required |
| Sword | Weapon | Sword pickup | New sprite required |
| Two-Handed Sword | Weapon | Large two-handed sword pickup | New sprite required |
| Leg Armor (Magic) | Armor | Greaves pickup with blue glint | New sprite required |
| Chest Armor | Armor | Chest armor pickup | New sprite required |
| Suit of Armor | Armor | Full suit armor pickup | New sprite required |
| Oak Shield 03 | Weapon | Oak shield pickup | New sprite required |
| Wooden Stick | Weapon | Wooden stick pickup | New sprite required |
| Gold coin | Existing world reward | Animated coin pickup / throw | Reuse existing coin atlas entry |

All rows use the same ground shadow, depth ordering, pickup collision, and
throw-flight behavior. The new sprites should match the existing potion and coin
pixel-art scale and palette. The approved target tileset and atlas placement
remain a follow-up decision.
