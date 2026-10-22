import type { Action, Campaign, Direction, Position } from "./types.ts";
import { cellCenter, occupiedCell, precisePlayerPosition } from "./player-position.ts";
import { directions, gameMode, isObjectSetBlocked, type createGameSession } from "../systems/procedural/world-procedural-system.ts";
import { isWalkable } from "../systems/procedural/level-grid-system.ts";
import { CHARACTER_MOVEMENT_DURATION_MS, INTERACTIVE_BUMP_APEX_MS, INTERACTIVE_BUMP_DURATION_MS, TurnPresentationSystem } from "../systems/animation/turn-presentation-system.ts";

export interface GridlessInteraction {
  kind: "bump" | "push" | "entry" | "center";
  origin: Position;
  target: Position;
  direction: Direction;
  action: Action;
  campfire?: Position;
  barrelId?: string;
  rejectOnly?: boolean;
  /** The safe prefix of a long pixel request must commit before its interaction. */
  prefix?: Position;
}

const same = (a: Position, b: Position) => a.x === b.x && a.y === b.y;
const heading = (a: Position, b: Position): Direction => Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? b.x > a.x ? "e" : "w" : b.y > a.y ? "s" : "n";
const at = (a: Position, b: Position) => same(a, b);

function blocked(state: Campaign, cell: Position) {
  return !isWalkable(state.floor, cell.x, cell.y) || isObjectSetBlocked(state.floor, state.player, cell.x, cell.y)
    || state.floor.entities.some(e => at(e, cell) && (e.kind === "enemy" || e.kind === "campfire" || e.kind === "chest" || e.kind === "crate" && !e.opened));
}

function contact(state: Campaign, cell: Position, direction: Direction): Pick<GridlessInteraction, "kind" | "barrelId" | "campfire"> | null {
  const barrel = state.floor.objectSets?.find(s => s.kind === "floor-trigger-door-barrel" && at(s.barrel, cell));
  if (barrel) {
    const [dx, dy] = directions[direction]; const beyond = { x: cell.x + dx, y: cell.y + dy };
    const legal = isWalkable(state.floor, beyond.x, beyond.y) && !isObjectSetBlocked(state.floor, state.player, beyond.x, beyond.y)
      && !state.floor.entities.some(e => at(e, beyond));
    return legal ? { kind: "push", barrelId: `${barrel.id}-barrel` } : { kind: "bump" };
  }
  const entity = state.floor.entities.find(e => at(e, cell));
  if (entity?.kind === "campfire") return { kind: "bump", campfire: cell };
  return blocked(state, cell) ? { kind: "bump" } : null;
}

function specialEntry(state: Campaign, from: Position, to: Position) {
  return state.floor.entities.some(e => at(e, to) && !(e.kind === "crate" && e.opened || e.kind === "chest" && e.opened))
    || state.floor.decorations?.some(e => e.kind === "trap" && at(e, to))
    || state.floor.objectSets?.some(s => s.kind === "floor-trigger-door-barrel" ? at(s.trigger, from) || at(s.trigger, to) : !s.activated && s.triggers.some(t => at(t, to)))
    || state.floor.entities.some(e => e.kind === "enemy") && gameMode({ ...state, player: { ...state.player, ...to, pixel: cellCenter(to) } }) === "Battle";
}

/** Inspects the same whole-pixel segment as the simulation, before entry effects run. */
export function planGridlessInteraction(state: Campaign, action: Action): GridlessInteraction | null {
  const origin = { x: state.player.x, y: state.player.y };
  if (action.type === "center-player") {
    return same(state.player.pixel ?? cellCenter(origin), cellCenter(origin)) ? null
      : { kind: "center", origin, target: origin, direction: state.player.heading ?? "s", action };
  }
  if (action.type === "move") {
    const offset = directions[action.direction as Direction]; if (!offset) return null;
    const direction = action.direction as Direction;
    const target = { x: origin.x + offset[0], y: origin.y + offset[1] };
    return { origin, target, direction, action, ...contact(state, target, direction) ?? { kind: "entry" as const } };
  }
  if (action.type !== "move-pixels") return null;
  const pixel = state.player.pixel ?? cellCenter(origin);
  const dx = action.to.x - pixel.x, dy = action.to.y - pixel.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (!Number.isSafeInteger(steps) || steps > 4096) return null;
  let previous = pixel;
  for (let step = 1; step <= steps; step++) {
    const next = { x: pixel.x + Math.round(dx * step / steps), y: pixel.y + Math.round(dy * step / steps) };
    const cell = occupiedCell(next), from = occupiedCell(previous);
    if (!same(cell, from)) {
      const local = { ...state, player: { ...state.player, ...from, pixel: previous } };
      const direction = heading(from, cell);
      const corner = cell.x !== from.x && cell.y !== from.y && (blocked(local, { x: cell.x, y: from.y }) || blocked(local, { x: from.x, y: cell.y }));
      const hit = corner ? { kind: "bump" as const } : contact(local, cell, direction);
      if (hit || specialEntry(local, from, cell)) {
        return { origin: from, target: cell, direction, ...hit ?? { kind: "entry" as const },
          rejectOnly: Boolean(hit && cell.x !== from.x && cell.y !== from.y),
          action: hit ? { type: "move", direction } : { ...action, to: cellCenter(cell) },
          prefix: same(previous, pixel) ? undefined : previous };
      }
    }
    previous = next;
  }
  return null;
}

/** Uses the normal session transactions, so costs, rewards and enemy phases stay authoritative. */
export function resolveGridlessInteraction(session: ReturnType<typeof createGameSession>, plan: GridlessInteraction, now: number) {
  if (plan.kind === "bump" || plan.kind === "push") session.dispatch({ type: "center-player" });
  if (plan.campfire) return null;
  if (plan.rejectOnly) { session.publish("action.rejected", { reason: "blocked-pixel-movement" }); return null; }
  const action = plan.action.type === "move" || plan.action.type === "move-pixels" ? { ...plan.action, hazardElapsedMs: now } : plan.action;
  const result = session.dispatch(action);
  if (result?.accepted && "state" in result && plan.kind === "entry" && !result.events.some(e => e.type === "player.died" || e.type === "realm.entered")) {
    const center = cellCenter(result.state.player);
    if (!same(result.state.player.pixel ?? center, center)) session.dispatch({ type: "center-player" });
  }
  return result;
}

interface PendingInteraction {
  plan: GridlessInteraction;
  phase: "align" | "contact" | "arrival";
  start: number;
  committed: boolean;
  valid(): boolean;
  commit(now: number): void;
}

/** Owns presentation until contact/arrival. Only commit is allowed to change game state. */
export class GridlessInteractionController {
  private pending: PendingInteraction | null = null;
  constructor(private readonly presentation: TurnPresentationSystem) {}
  get active() { return this.pending !== null; }

  start(plan: GridlessInteraction, state: Campaign, now: number, valid: () => boolean, commit: (now: number) => void) {
    if (this.active) return false;
    this.presentation.stopPlayerPixelTravel();
    this.presentation.ownInteractionActor("player");
    if (plan.barrelId) this.presentation.ownInteractionActor(plan.barrelId);
    const align = plan.kind !== "entry" && plan.kind !== "center" && !same(precisePlayerPosition(state.player), plan.origin);
    const phase = align ? "align" : plan.kind === "bump" || plan.kind === "push" ? "contact" : "arrival";
    this.pending = { plan, phase, start: now, committed: false, valid, commit };
    this.presentation.faceInteraction(plan.direction);
    if (align) this.presentation.tweenInteractionActor("player", precisePlayerPosition(state.player), plan.origin, now);
    else this.beginPhase(this.pending, state, now);
    return true;
  }

  private beginPhase(pending: PendingInteraction, state: Campaign | null, now: number) {
    const { plan } = pending;
    if (pending.phase === "contact") this.presentation.beginBump("player", plan.origin, plan.direction, now);
    else {
      const from = state ? precisePlayerPosition(state.player) : this.presentation.playerPositionOf(plan.origin);
      this.presentation.tweenInteractionActor("player", from, plan.target, now);
      if (plan.barrelId) {
        const [dx, dy] = directions[plan.direction];
        this.presentation.tweenInteractionActor(plan.barrelId, plan.target, { x: plan.target.x + dx, y: plan.target.y + dy }, now);
      }
    }
    this.presentation.faceInteraction(plan.direction);
  }

  update(now: number) {
    const pending = this.pending;
    if (!pending) return;
    if (!pending.committed && !pending.valid()) { this.cancel(); return; }
    this.presentation.sample(now);
    if (pending.phase === "align" && now >= pending.start + CHARACTER_MOVEMENT_DURATION_MS) {
      pending.phase = "contact"; pending.start = now; this.beginPhase(pending, null, now);
    }
    if (pending.phase === "contact" && !pending.committed && now >= pending.start + INTERACTIVE_BUMP_APEX_MS) {
      if (pending.plan.kind === "push") {
        pending.phase = "arrival"; pending.start = now;
        this.presentation.endInteractionBump(); this.beginPhase(pending, null, now);
      } else { pending.committed = true; pending.commit(now); }
    }
    if (this.pending !== pending) return;
    const duration = pending.phase === "contact" ? INTERACTIVE_BUMP_DURATION_MS : CHARACTER_MOVEMENT_DURATION_MS;
    if (now >= pending.start + duration) {
      if (!pending.committed) { pending.committed = true; pending.commit(now); }
      if (this.pending === pending) { this.presentation.releaseInteractionActors(); this.pending = null; }
    }
  }

  cancel(state?: Campaign) {
    this.pending = null;
    this.presentation.releaseInteractionActors();
    if (state) this.presentation.reset(state);
  }
}
