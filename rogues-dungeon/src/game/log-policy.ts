import type { EventFacts, GameEvent, LogEntry } from "./types.ts";
const LOG_RULES: Readonly<Partial<Record<string, (facts: EventFacts) => string>>> = Object.freeze({
  "item.collected": (facts) => `You collect ${facts.name}.`,
  "item.dropped": (facts) => `You drop ${facts.name}.`,
  "item.drop.rejected": (facts) => `You cannot drop ${facts.name ?? "that item"}.`,
  "potion.consumed": (facts) => `You restore ${facts.resource === "health" ? "Health" : facts.resource === "stamina" ? "Stamina" : "Mana"}.`,
  "quick-slot.use.rejected": (facts) => `${facts.item ?? "Potion"} cannot be used while ${facts.resource === "health" ? "Health" : facts.resource === "stamina" ? "Stamina" : "Mana"} is full.`,
  "equipment.changed": (facts) => facts.item ? facts.action === "swapped" ? `You swap ${facts.item} for ${facts.displacedItems?.map((item) => item.name).join(" and ") ?? "equipped gear"}.` : `You ${facts.action === "enabled" ? "equip" : facts.action === "returned to inventory" ? "return" : "rearrange"} ${facts.item}.` : "You change your equipment.",
  "ability.used": (facts) => `You use ${facts.title}.`,
  "combat.hit": (facts) => facts.targetId === "player" ? `${facts.sourceName ?? "An enemy"} hits you for ${facts.damage ?? 0}.` : `You hit ${facts.target ?? "an enemy"} for ${facts.damage ?? 0}.`,
  "enemy.defeated": (facts) => `You defeat ${facts.name}.`,
  "encounter.locked": () => "The doors slam shut. Defeat every enemy to escape.",
  "encounter.cleared": () => "The doors unlock.",
  "realm.entered": (facts) => `You enter Level ${facts.level ?? facts.realm}.`,
  "player.died": () => "You died.",
  "campaign.save.failed": () => "You cannot save this game.",
});

export function formatLogEvent(event: Pick<GameEvent, "type" | "facts">) { return LOG_RULES[event.type]?.(event.facts) ?? null; }
export function projectLogEvents(currentLog: LogEntry[], events: (Pick<GameEvent, "type" | "facts"> & Partial<GameEvent>)[]): LogEntry[] {
  const known = new Set(currentLog.map((entry) => entry.id));
  const appended = [];
  for (const event of events) {
    const text = formatLogEvent(event);
    if (!text || known.has(event.eventId)) continue;
    known.add(event.eventId); appended.push({ id: event.eventId, text });
  }
  return [...currentLog, ...appended].slice(-200);
}

/** Bounded, combat-only recap projection. It deliberately ignores movement and transitions. */
export function selectDeathRecapLines(events: readonly (Pick<GameEvent, "type" | "facts"> & Partial<GameEvent>)[], maximum = 7) {
  const lines: string[] = [];
  for (const event of events) {
    if (event.type === "combat.hit" || event.type === "enemy.defeated") {
      const line = formatLogEvent(event);
      if (line) lines.push(line);
    }
    if (event.type === "player.died") {
      if (event.facts.sourceName) lines.push(`${event.facts.sourceName} defeats you.`);
      lines.push("You died.");
    }
  }
  return lines.slice(-maximum);
}
