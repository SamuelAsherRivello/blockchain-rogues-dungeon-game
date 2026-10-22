/** Category identity shared by slots, drag previews, and keyboard controls. */
export const SLOT_COLORS = Object.freeze({
  ability: "#c0aaff",
  quick: "#79c878",
  equipment: "#67b7e8",
});

export type SlotCategory = keyof typeof SLOT_COLORS;

export const slotColorProperties = {
  "--ability-color": SLOT_COLORS.ability,
  "--quick-slot-color": SLOT_COLORS.quick,
  "--equipment-slot-color": SLOT_COLORS.equipment,
};
