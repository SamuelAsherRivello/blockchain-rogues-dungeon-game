import type { GameEvent } from "../../game/types.ts";

// Domain events, rather than input handlers, own feedback so keyboard, mouse,
// touch, gamepad and gridless interactions use the same sound policy.
export const EVENT_CUES = Object.freeze({
  "player.moved": "footstep",
  "player.waited": "playerWait",
  "player.sneak.changed": "playerSneak",
  "player.died": "playerDeath",
  "enemy.defeated": "enemyFall",
  "potion.consumed": "potion",
  "item.collected": "pickupClick",
  "item.collection.rejected": "pickupRejected",
  "item.dropped": "accepted",
  "item.drop.rejected": "rejected",
  "chest.opened": "chest",
  "crate.opened": "woodBreak",
  "realm.entered": "stairs",
  "stairs.entered": "stairsEnter",
  "barrel.pushed": "barrelSlide",
  "barrel.returned": "barrelReturn",
  "encounter.locked": "doorLocked",
  "encounter.cleared": "doorOpen",
  "xp.gained": "experienceGain",
  "xp.level.changed": "positiveShimmer",
  "progression.points.spent": "statUpgrade",
  "equipment.changed": "accepted",
  "ability.assignment.changed": "abilityAssign",
  "quick-slot.changed": "quickSlotAccepted",
  "quick-slot.use.rejected": "quickSlotRejected",
  "campaign.save.succeeded": "saveSucceeded",
  "campaign.save.failed": "saveFailed",
} as const);

export type AudioEvent = Pick<GameEvent, "type" | "facts"> & Partial<GameEvent>;

export function cuesForEvent(event: AudioEvent): string[] {
  const { type, facts } = event;
  // Rejections have audible feedback of their own. Never play a success cue for
  // a rejected event, including one supplied by a replay or third-party caller.
  if (type === "action.rejected") {
    if (facts.obstacle === "door") return ["doorLocked"];
    if (String(facts.actionType).includes("quick-slot")) return ["quickSlotRejected"];
    if (/equip|ability|drop/.test(String(facts.actionType))) return ["rejected"];
    return ["moveBlocked"];
  }
  if (event.outcome === "rejected" && !type.endsWith(".rejected")) return [];
  if (type === "floor-trigger.changed") return ["floorTrigger", facts.active ? "doorOpen" : "doorLocked"];
  if (type === "ability.used") return [facts.abilityId === "heal" ? "magicHeal" : facts.abilityId === "wand" ? "magicWand" : "magicAncient"];
  if (type === "combat.hit") {
    if (facts.source === "trap") return ["trapStrike"];
    const cues = !facts.source || facts.source === "player" ? ["weaponHit"] : [];
    if (typeof facts.roll === "number") cues.push("diceRoll");
    return cues;
  }
  if (type === "resource.changed") {
    if (facts.cause === "enemy-attack") return ["enemyHit"];
    if (facts.cause === "trap") return ["trapStrike"];
    // Routine movement stamina regeneration and changes to equipment caps are
    // not restoration actions. Rest and healing get one cue per transaction.
    if (["campfire-rest", "heal"].includes(String(facts.cause)) && Number(facts.current) > Number(facts.previous)) return ["resourceRestore"];
    return [];
  }
  const cue = EVENT_CUES[type as keyof typeof EVENT_CUES];
  return cue ? [cue] : [];
}
