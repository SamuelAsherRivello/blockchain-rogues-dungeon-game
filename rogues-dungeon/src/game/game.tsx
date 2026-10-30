import { itemSpriteFrame, worldPickupPresentation } from "../systems/rendering/world-object-sprite-system.ts";
import { InventoryRows } from "./controls/inventory-rows.tsx";
import { SlotItem, type SlotShineTokens } from "./controls/slot-item.tsx";
export { SlotItem, type SlotShineTokens } from "./controls/slot-item.tsx";
import { itemPresentation, stackInventoryItems, itemSlotCategory, itemDisplayName, modifierSummary } from "./inventory-presentation.ts";
export { itemPresentation, stackInventoryItems, itemSlotCategory, itemDisplayName } from "./inventory-presentation.ts";
import { LockboxWindow } from "./windows/lockbox-window.tsx";
import { createLockboxPersistence } from "../systems/persistence/save-system.ts";
import { reconcileLockboxRecovery, transferLockboxItem } from "../systems/persistence/lockbox-storage-system.ts";
import { prepareCampaignSave } from "../systems/procedural/world-procedural-system.ts";
import { MovementPromptController, movementDirection } from "./movement-prompt-controller.ts";
import { GridlessInteractionController, planGridlessInteraction, resolveGridlessInteraction, type GridlessInteraction } from "./gridless-interaction.ts";
import { PerformanceSession } from "./performance-session.ts";
import { PerformanceControls } from "./views/performance-controls.tsx";
import { performanceOptions, resetPerformanceOptions, setPerformanceOptions, timePerformance } from "../systems/rendering/performance-system.ts";
import type { PointerEvent as ReactPointerEvent, PointerEventHandler, ReactNode } from "react";
import type { Orientation } from "../ui/layout.ts";
import { SLOT_COLORS } from "../ui/slot-colors.ts";
import { RESOURCE_WILL_REPLENISH, type AbilityId, type Action, type Attributes, type AttributeName, type Campaign, type CampaignMode, type Direction, type DragSource, type DropDestination, type Entity, type EquipmentGroup, type Feedback, type Floor, type Item, type Position, type Preferences, type QuickSlot, type Resource, type ResourceName, type SelectedCell } from "./types.ts";
type Ability = typeof abilityCatalog[AbilityId];
interface Gain { from: number; to: number; max: number }
export type Gains = Partial<Record<ResourceName, Gain>>;
interface WithDispatch { campaign: Campaign; dispatch(action: Action): unknown }
interface PreferenceProps { preferences: Preferences; setPreference(value: Partial<Preferences>): void }
type PointerSource = DragSource;
export interface DragPresentation { source: PointerSource; item: PointerSource["item"]; x: number; y: number; destination: DropDestination | null }
interface PointerDrag { pointerId: number; source: PointerSource; startX: number; startY: number; active: boolean }
interface Movement { direction: string; sprint: boolean; source?: string }
const STAIR_CENTER_SETTLE_DELAY_MS = 100;
import { memo, Profiler, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { abilityCatalog, abilityItemInstance, attributeLabels, createRunCampaign, directions, effectiveAttributes, effectiveInventoryCapacity, hasAssignedWeapon, isQuickSlottableItem, REST_GOLD_COST, resourceState, rollStartingAttributes } from "../systems/procedural/world-procedural-system.ts";
import { isWalkable } from "../systems/procedural/level-grid-system.ts";
import { TRAP_CYCLE_MS, trapFrameAt, trapIsDangerous } from "../systems/procedural/world-hazards-system.ts";
import { describeInventoryDrop } from "./inventory-drag.ts";
import { itemComparisonStats } from "./item-comparison-stats.ts";
import { availableGameZoomPresets } from "../content/world/zoom.ts";
import { projectLogEvents, selectDeathRecapLines } from "./log-policy.ts";
import { createAudioManager } from "../systems/audio/audio-system.ts";
import { createAbilityParticle, createLevelUpSparkles, createSmokePuff, particleDurationMs, particleExpired, smokePuffDurationMs, type ParticleEffect } from "../systems/animation/particle-effects-system.ts";
import { projectDamageParticles } from "./damage-particle-projection.ts";
import { parseGameUrlOptions } from "./url-options.ts";
import { floorFromTiledRepairMap, serializeFloorToTiled } from "../systems/rendering/tile-map-system.ts";
import { buildManualTileScenario, getManualTileScenario } from "../systems/procedural/manual-tile-scenarios.ts";
import { createStoredZip } from "./zip.ts";
import { projectFloatingFeedback, removeFloatingFeedback } from "./floating-feedback.ts";
import { projectResourceChangeEffects, removeResourceChangeEffect, type ResourceChangeEffect } from "./resource-change-effects.ts";
import { claimMovement, getLatestMovement, getMovementKey, getMoveRepeatDelay, getMoveScheduleDelay } from "./keyboard-input.ts";
import { useGamepadMovement } from "./gamepad-input.ts";
import { ControlsArea } from "../ui/ControlsArea.tsx";
import { useUiMotion, type UiMotionStyle } from "../ui/ui-transition-system.tsx";
import { getMouseMovementFromSelectedCell, getMousePathResult, isMouseHazard, MAX_MOUSE_TRAVEL_STEPS, planMouseTravel } from "./mouse-selection.ts";
import { clearRoguesDungeonBrowserStorage, deleteSlot, formatSavedAgo, readPreferences, readSlot, readSlotSummary, readWorldSeed, writePreferences, writeSlot } from "../systems/persistence/save-system.ts";
import { runUrlForCampaign } from "./run-url-system.ts";
import { BabylonWorld, type DungeonTheme, type GameViewToUiAnimation } from "../systems/rendering/babylon-render-system.tsx";
import { ITEM_THROW_DURATION_MS, throwItems, type ItemThrow } from "../systems/animation/item-throw-animation-system.ts";
import { CHARACTER_MOVEMENT_DURATION_MS, INTERACTIVE_BUMP_APEX_MS, INTERACTIVE_BUMP_DURATION_MS, TurnPresentationSystem } from "../systems/animation/turn-presentation-system.ts";
import { createQuestGameSession as createGameSession, currentQuest } from "../systems/quests/quest-progression-system.ts";
import { dismissTooltips, Tooltip } from "../ui/Tooltip.tsx";
import { DEV_SETTINGS_STORAGE_KEYS, readDevBoolean, readDevGameViewShader, writeDevBoolean, writeDevGameViewShader } from "../ui/dev-settings.ts";
import { isCellDiscovered, revealDiscovery } from "../systems/procedural/map-discovery-system.ts";
import { renderTestEffects } from "../systems/rendering/render-test-system.ts";
import { effectiveRenderTestMode, nextRenderTestMode, RENDER_TEST_TOOLTIP, type RenderTestMode } from "../systems/rendering/render-test-system.ts";
import { gameViewShaderSystem, type GameViewShaderId } from "../systems/rendering/game-view-shader-system.ts";
import { LayoutContext } from "../ui/layout-context.ts";
import { dialogBounds, type DialogBounds, type DialogCenter } from "../ui/dialog.tsx";
import { ConfirmationDialog } from "../ui/confirmation-dialog.tsx";
import { GameScreen } from "./screens/game-screen.tsx";
import { MenuScreen } from "./screens/menu-screen.tsx";
import { MainMenuWindow } from "./windows/main-menu-window.tsx";
import { SettingsWindow } from "./windows/settings-window.tsx";
import { DeathRecapWindow } from "./windows/death-recap-window.tsx";
import { HowToPlayWindow } from "./windows/how-to-play-window.tsx";
import { ProgressionWindow } from "./windows/progression-window.tsx";
import { CreateCharacterWindow } from "./windows/create-character-window.tsx";
import { SelectModeWindow } from "./windows/select-mode-window.tsx";
import { CreateWorldWindow, type WorldIdentity } from './windows/create-world-window.tsx';
import { WorldProgressionWindow } from './windows/world-progression-window.tsx';
import type { WorldAttributes } from './types.ts';
import { DEFAULT_WORLD_ATTRIBUTES, rollWorldAttributes } from '../systems/procedural/world-attributes.ts';
import { MobileControls } from "./controls/mobile-controls.tsx";
import { ItemDragPreview } from "./controls/item-drag-preview.tsx";
import { TitleBar } from "./panels/title-bar.tsx";
import { StatusBar } from "./panels/status-bar.tsx";
import { InformationPanels, MobileInformationPanels } from "./panels/information-panels.tsx";
import { WorldViewRegion } from "./views/world-view-region.tsx";
import { ScrollArea } from "../ui/ScrollArea.tsx";
import { GameCard } from "./cards/game-card.tsx";
import { statusCapMarker } from "./status-cap-marker.ts";
import { AttributePanel, attributeHelp } from "./panels/attribute-panel.tsx";
import { battleGraceRemainingMs, gameMode } from "../systems/procedural/world-procedural-system.ts";
import { cellCenter, PixelMovementIntegrator } from "./player-position.ts";

export { DeltaValue } from "./panels/attribute-panel.tsx";

function memoCampaignView<P extends { campaign: Campaign }>(view: (props: P) => ReactNode, select: (campaign: Campaign) => unknown) {
  return memo(view, (previous, next) => {
    const left = previous as unknown as Record<string, unknown>, right = next as unknown as Record<string, unknown>;
    if (Object.keys(left).length !== Object.keys(right).length) return false;
    for (const key in left) if (key !== "campaign" && left[key] !== right[key]) return false;
    // These HUD views read only the selected values, never terrain or actor
    // positions. Keep callback, drag, cooldown and feedback props current.
    return JSON.stringify(select(previous.campaign)) === JSON.stringify(select(next.campaign));
  });
}
function createFpsStore() {
  let value: number | null = null;
  const listeners = new Set<() => void>();
  return {
    read: () => value,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    publish(next: number | null) { if (next === value) return; value = next; listeners.forEach(listener => listener()); },
  };
}
function FpsReadout({ source }: { source: ReturnType<typeof createFpsStore> }) {
  const fps = useSyncExternalStore(source.subscribe, source.read, source.read);
  return <output aria-live="off">FPS: {fps ?? "--"}</output>;
}
function emptySlotSummaries(): ReturnType<typeof readSlotSummary> {
  return ["1", "2", "3"].map(slot => ({ slot, occupied: false, level: null, xpLevel: null }));
}

const icons: Partial<Record<string, string>> = { health: "♥", stamina: "◈", offense: "⚔", defense: "⛨", mana: "✦", xp: "★", capacity: "▣" };
const resourceHelp: Record<ResourceName, string> = { health: "Health remaining; potions restore it.", stamina: "Low Stamina lowers damage.", offense: "Attack power after Stamina readiness.", defense: "Defense reduces incoming damage.", mana: "Mana is spent on abilities.", xp: "Experience toward next level." };
function ResourceBar({ name, value, gain, rank }: { name: ResourceName; value: Resource; gain?: Gain; rank?: number }) { const cap = name === "xp" ? Math.max(0, Math.min(100, value.currentMax ?? 100)) : statusCapMarker(rank ?? 1); const fill = Math.max(0, Math.min(cap, value.currentMax > 0 ? value.current / value.currentMax * cap : 0)); const gainStart = gain ? Math.min(cap, Math.max(0, gain.from / value.currentMax * cap)) : 0; const gainEnd = gain ? Math.min(cap, Math.max(0, gain.to / value.currentMax * cap)) : 0; const levelText = `LVL ${String(value.level).padStart(2, "0")}`; return <div className={"resource resource_" + name} data-will-replenish={RESOURCE_WILL_REPLENISH[name]} aria-label={name + ": " + value.current + " of " + value.currentMax}><span>{icons[name]}</span><div className="resource_track"><i style={{ width: fill + "%" }} />{gain && <strong className="resource_gain" style={{ left: gainStart + "%", width: Math.max(0, gainEnd - gainStart) + "%" }} />}<b style={{ left: cap + "%" }} />{name === "xp" && <><em className="resource_level resource_level--empty">{levelText}</em><em className="resource_level resource_level--filled" style={{ clipPath: `inset(0 ${100 - fill}% 0 0)` }}>{levelText}</em></>}</div></div>; }
function ResourceListView({ campaign, gains = {}, statusReplenishProgress = null }: { campaign: Campaign; gains?: Gains; statusReplenishProgress?: number | null }) { const resources = resourceState(campaign); return <div className="resource_list">{(["health", "stamina", "offense", "defense", "mana", "xp"] as const).map((name) => { const value = resources[name]; const progress = statusReplenishProgress == null || !RESOURCE_WILL_REPLENISH[name] ? 0 : Math.max(0, Math.min(1, statusReplenishProgress)); const replenishGain = gains[name]?.to === value.currentMax ? gains[name] : undefined; const baseline = replenishGain?.from ?? value.current; const displayedCurrent = progress === 0 ? value.current : baseline + (value.currentMax - baseline) * progress; const displayedValue = progress === 0 ? value : { ...value, current: displayedCurrent }; const segmentStart = progress >= 1 ? .5 : 0; const displayedGain = progress > 0 ? { from: baseline + (value.currentMax - baseline) * segmentStart, to: displayedCurrent, max: value.currentMax } : gains[name]; const prefix = name === "xp" ? `Level ${String(displayedValue.level).padStart(2, "0")}. ${displayedValue.current} / ${displayedValue.currentMax} XP.` : `${displayedValue.current} / ${displayedValue.currentMax}.`; return <Tooltip key={name} content={`${prefix} ${resourceHelp[name]}`}><button tabIndex={-1} type="button" className="resource_tooltip_trigger" aria-label={`${name}: ${displayedValue.current} of ${displayedValue.currentMax}`}><ResourceBar name={name} value={displayedValue} gain={displayedGain} rank={name === "xp" ? undefined : campaign.progression.attributes[name]} /></button></Tooltip>; })}</div>; }
export const ResourceList = memoCampaignView(ResourceListView, campaign => [resourceState(campaign), campaign.progression.attributes]);
/** Renders an attribute number that pulses only when its color changes to a delta. */
export function AttributeViewItemList({ campaign, preview = null }: { campaign: Campaign; preview?: Attributes | null }) { return <AttributePanel attributes={campaign.progression.attributes} preview={preview} help={attributeHelp} />; }
function abilityHelp(ability: Ability | null | undefined) { if (!ability) return "Assign an ability to fill this slot."; return ability.kind === "heal" ? `Heal: +${ability.amount} Health; costs ${ability.manaCost} Mana.` : `Wand: ${ability.damage} damage within ${ability.range} tiles; ${ability.manaCost} Mana.`; }
export function AbilityViewItem({ index, ability, disabled, onUse, shineTokens = {}, drag = null }: { index: number; ability?: Ability | null; disabled: boolean; onUse(): void; shineTokens?: SlotShineTokens; drag?: DragPresentation | null }) { const available = Boolean(ability && !disabled); return <SlotItem type="ability" slotType="ability" number={index} text={ability?.title} icon={ability?.icon} cost={ability?.manaCost} accentColor={SLOT_COLORS.ability} unavailable={!available} onClick={available ? onUse : undefined} className={["ability_row", drag?.source.kind === "ability" && drag.source.index === index && "drag_departure", drag?.destination?.kind === "ability" && drag.destination.index === index && "drag_landing"].filter(Boolean).join(" ")} shineKey={`ability:${index}`} shineTokens={shineTokens} dropTarget={{ "data-drop-ability": index }} dragSource={ability ? { "data-drag-kind": "ability", "data-drag-index": index, "aria-label": `Drag ${ability.title}` } : {}} empty={!ability} tooltip={abilityHelp(ability)} />; }
function AbilityViewItemListView({ campaign, dispatch, cooldowns = {}, shineTokens = {}, drag = null }: WithDispatch & { cooldowns?: Partial<Record<AbilityId, number>>; shineTokens?: SlotShineTokens; drag?: DragPresentation | null }) { const mana = campaign.player.resources.mana.current; const health = campaign.player.resources.health; const now = performance.now(); return <div className="view_list">{campaign.player.abilities.slice(0, 3).map((id, index) => { const ability = id ? abilityCatalog[id] : null; const fullHealth = ability?.kind === "heal" && health.current >= health.currentMax; return <AbilityViewItem drag={drag} key={index} index={index} ability={ability} disabled={Boolean(ability && (mana < ability.manaCost || fullHealth || (cooldowns[ability.id] ?? 0) > now))} shineTokens={shineTokens} onUse={() => dispatch({ type: "ability", index })} />; })}</div>; }
export const AbilityViewItemList = memoCampaignView(AbilityViewItemListView, campaign => [campaign.player.abilities, campaign.player.resources.health, campaign.player.resources.mana]);
function equipmentSlotHelp(item: Item | null) { const effect = modifierSummary(item); return item ? `${effect || "No stat change"}${item.slotSpan === 2 ? ". Uses both positions." : ""} Drag to replace.` : "Drag an item here to equip it."; }
function ItemComparisonItemPanel({ title, item, baseline }: { title: "Before" | "After"; item: Item | null; baseline: Item | null }) {
  const modifiers = itemComparisonStats(item, title === "After" ? baseline : null);
  const ability = item?.abilityId ? abilityCatalog[item.abilityId] : null;
  const description = ability ? abilityHelp(ability) : item?.consumableResource ? `Restores ${attributeLabels[item.consumableResource]}.` : "";
  return <GameCard title={title} className="item-comparison-panel__item">{item ? <strong>{itemDisplayName(item, item.quantity ?? 1)}</strong> : <p><i>(empty)</i></p>}<div className="item-comparison-panel__stats">{description && <span>{description}</span>}{modifiers.length ? modifiers.map(({ name, value, delta }) => <span key={name}>{icons[name] ?? "◆"} {value >= 0 ? "+" : ""}{value}{title === "After" && delta !== 0 && <em className={delta > 0 ? "item-comparison-panel__delta--positive" : "item-comparison-panel__delta--negative"}> ({delta > 0 ? "+" : ""}{delta})</em>}</span>) : item && !description && <span>No stat changes</span>}</div></GameCard>;
}
function ItemComparisonPanel({ before, after, destination }: { before: Item | null; after: Item | null; destination: DropDestination }) {
  const selector = destination.kind === "slot" ? `[data-drop-group="${destination.group}"][data-drop-index="${destination.index}"]` : destination.kind === "quick-slot" ? `[data-drop-quick-slot="${destination.index}"]` : destination.kind === "ability" ? `[data-drop-ability="${destination.index}"]` : destination.kind === "drop-item" ? "[data-drop-item]" : ".info-panel__inventory-card";
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = panel.current;
    const rect = document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const inventory = document.querySelector<HTMLElement>(".info-panel__inventory-card")?.getBoundingClientRect();
    const world = document.querySelector<HTMLElement>(".world-view-region")?.getBoundingClientRect();
    const screen = document.querySelector<HTMLElement>(".game-screen")?.getBoundingClientRect();
    if (!element || !rect || !inventory || !world || !screen) return;
    const left = Math.max(screen.left + 8, Math.min(inventory.left - 10 - element.offsetWidth, screen.right - element.offsetWidth - 8));
    const top = Math.max(screen.top + 8, Math.min(rect.top + rect.height / 2 - element.offsetHeight / 2, screen.bottom - element.offsetHeight - 8));
    element.style.left = `${left - world.left}px`;
    element.style.top = `${top - world.top}px`;
  }, [selector, before, after]);
  return <aside ref={panel} className="item-comparison-panel" aria-label="Equipment comparison"><GameCard title="Item Comparison"><ItemComparisonItemPanel title="Before" item={before} baseline={before} /><ItemComparisonItemPanel title="After" item={after} baseline={before} /></GameCard></aside>;
}
function EquipmentItem({ item, group, index, drag, shineTokens = {} }: { item: Item | null; group: EquipmentGroup; index: number; drag: DragPresentation | null; shineTokens?: SlotShineTokens }) { const secondary = item?.slotSpan === 2 && index === 1; const departure = !secondary && drag?.source.kind === "slot" && drag.source.group === group && drag.source.index === index; const landing = drag?.destination?.kind === "slot" && drag.destination.group === group && ((drag.source.item as Item).slotSpan === 2 || drag.destination.index === index); const effects = itemPresentation(item); return <SlotItem slotType="equipment" slotSubtype={group} text={item ? `${item.name}${secondary ? " (2)" : ""}` : ""} effects={effects} shineKey={`equipment:${group}:${index}`} shineTokens={shineTokens} className={["equipment_item", secondary && "slot_item--occupied-secondary", departure && "drag_departure", landing && "drag_landing"].filter(Boolean).join(" ")} dropTarget={{ "data-drop-group": group, "data-drop-index": index }} dragSource={item && !secondary ? { "data-drag-kind": "slot", "data-drag-id": item.id, "data-drag-group": group, "data-drag-index": index, "aria-label": `Drag ${item.name}` } : {}} empty={!item} tooltip={secondary ? `${item.name} occupies this position.` : equipmentSlotHelp(item)} />; }
function SlotListView({ campaign, drag = null, shineTokens = {} }: { campaign: Campaign; drag?: DragPresentation | null; shineTokens?: SlotShineTokens }) { return <div className="slot_scroll">{([["Weapons", "weapons"], ["Armor", "armor"], ["Jewels", "jewels"]] as const).map(([label, group]) => <div className="slot_group" key={group}><h3>{label}</h3>{campaign.player.equipment[group].map((item, index) => <EquipmentItem key={index} item={item} group={group} index={index} drag={drag} shineTokens={shineTokens} />)}</div>)}</div>; }
export const SlotList = memoCampaignView(SlotListView, campaign => campaign.player.equipment);
export function EquipmentComparison({ campaign, drag }: { campaign: Campaign; drag: DragPresentation | null }) {
  const destination = drag?.destination;
  if (!drag || !destination) return null;
  const targetItem = destination.kind === "slot" ? campaign.player.equipment[destination.group][destination.index] : destination.kind === "quick-slot" ? campaign.player.quickSlots?.[destination.index]?.item ?? null : null;
  const transfer = describeInventoryDrop(campaign, drag.source, destination, targetItem);
  if (!transfer || !("before" in transfer)) return null;
  return <ItemComparisonPanel before={transfer.before} after={transfer.after} destination={destination} />;
}
function quickSlotAvailable(campaign: Campaign, slot: QuickSlot | null) { const item = slot?.item; if (!item || !isQuickSlottableItem(item)) return false; if ((slot.quantity ?? 0) <= 0) return false; if (item.quickSlotAction === "throwing-knives") return true; const resource = resourceState(campaign)[item.consumableResource!]; return resource.current < resource.currentMax; }
function QuickSlotItem({ campaign, slot, index, drag, dispatch, shineTokens = {} }: { campaign: Campaign; slot: QuickSlot | null; index: number; drag: DragPresentation | null; dispatch(action: Action): unknown; shineTokens?: SlotShineTokens }) { const actual = slot?.item && isQuickSlottableItem(slot.item) ? slot.item : null; const available = quickSlotAvailable(campaign, slot); const landing = drag?.destination?.kind === "quick-slot" && drag.destination.index === index; return <SlotItem type="quick" slotType="quickslot" hotkey={index === 0 ? "Q" : "E"} text={actual ? `${actual.name} x ${slot?.quantity ?? 0}` : ""} shineKey={`quick:${index}`} shineTokens={shineTokens} className={["quick_slot", landing && "drag_landing", drag?.source.kind === "quick-slot" && drag.source.index === index && "drag_departure"].filter(Boolean).join(" ")} dropTarget={{ "data-drop-quick-slot": index }} dragSource={actual ? { "data-drag-kind": "quick-slot", "data-drag-id": actual.id, "data-drag-index": index, "aria-label": `Drag ${actual.name}` } : {}} empty={!actual} unavailable={!available} onClick={available ? () => dispatch({ type: "use-quick-slot", index }) : undefined} tooltip={actual ? `${actual.name}; press ${index === 0 ? "Q" : "E"} to use.` : "Drag a Health Potion, Stamina Potion, Mana Potion, or Throwing Knives here."} />; }
function QuickSlotsViewView({ campaign, dispatch, drag = null, shineTokens = {} }: WithDispatch & { drag?: DragPresentation | null; shineTokens?: SlotShineTokens }) { const slots = campaign.player.quickSlots ?? [null, null]; return <div className="quick_slots_list">{slots.map((slot, index) => <QuickSlotItem key={index} campaign={campaign} slot={slot} index={index} drag={drag} dispatch={dispatch} shineTokens={shineTokens} />)}</div>; }
export const QuickSlotsView = memoCampaignView(QuickSlotsViewView, campaign => [campaign.player.quickSlots, resourceState(campaign)]);
function InventoryViewItemsView({ campaign, drag = null, shineTokens = {} }: WithDispatch & { drag?: DragPresentation | null; shineTokens?: SlotShineTokens }) { return <InventoryRows items={campaign.player.inventory} capacity={effectiveInventoryCapacity(campaign)} drag={drag} shineTokens={shineTokens} />; }
export const InventoryViewItems = memoCampaignView(InventoryViewItemsView, campaign => [campaign.player.inventory, effectiveInventoryCapacity(campaign)]);
async function downloadDungeonBundle(entries: Parameters<typeof createStoredZip>[0], name: string) {
  const bundle = createStoredZip(entries);
  const url = URL.createObjectURL(bundle); const link = document.createElement("a");
  link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}
async function loadDungeonTilesetAssets() {
  const base = import.meta.env.BASE_URL;
  const assetUrl = (path: string) => new URL(`${base}assets/${path}`, window.location.origin).href;
  const [tileset, image] = await Promise.all([
    fetch(assetUrl("art/game-view/tilesets/data/tileset-dungeon.tsx")).then((response) => response.ok ? response.text() : Promise.reject(new Error("Dungeon tileset could not be loaded."))),
    fetch(assetUrl("art/game-view/tilesets/art/tileset-dungeon.png")).then((response) => response.ok ? response.arrayBuffer() : Promise.reject(new Error("Dungeon tileset image could not be loaded."))).then((bytes) => new Uint8Array(bytes)),
  ]);
  const portableTileset = tileset.replace('source="../art/tileset-dungeon.png"', 'source="tileset-dungeon.png"');
  if (portableTileset === tileset) throw new Error("Dungeon tileset image path could not be made portable.");
  return [["tileset-dungeon.tsx", portableTileset], ["tileset-dungeon.png", image as Uint8Array<ArrayBuffer>]] as Parameters<typeof createStoredZip>[0];
}
async function downloadCurrentMap(campaign: Campaign) {
    const name = `rogues-dungeon-world-${campaign.world}-level-${campaign.floor.level}-seed-${campaign.floor.seed}.tmj`;
    const editableMap = serializeFloorToTiled({ campaign });
    // The map, TSX, and PNG share the ZIP root, so extracted Tiled projects do
    // not depend on any repository-specific relative paths.
    editableMap.tilesets[0].source = "tileset-dungeon.tsx";
    await downloadDungeonBundle([[name, JSON.stringify(editableMap, null, 2)], ...await loadDungeonTilesetAssets()], name.replace(/\.tmj$/i, ".zip"));
}
function MapFixControls({ campaign, slot, onImport, error }: { campaign: Campaign; slot: string | null; onImport(file?: File): void; error: string }) {
  const exportMap = async () => { try { await downloadCurrentMap(campaign); } catch (error) { window.alert(error instanceof Error ? error.message : "Could not create the editable map bundle."); } };
  return <section className="map_fix_controls" aria-label="Map repair tools"><strong>Map Fix</strong><button tabIndex={-1} type="button" onClick={exportMap}>Open Editable Copy</button><label>Load repaired map<input tabIndex={-1} type="file" accept=".tmj,.json,application/json" onChange={(event) => onImport(event.target.files?.[0])} /></label>{slot && <span>Slot {slot}</span>}{error && <span role="alert">{error}</span>}</section>;
}
function MapTestControls({ campaign }: { campaign: Campaign }) {
  const openCurrentMap = async () => { try { await downloadCurrentMap(campaign); } catch (error) { window.alert(error instanceof Error ? error.message : "Could not create the current map bundle."); } };
  const openTileset = async () => { try { await downloadDungeonBundle(await loadDungeonTilesetAssets(), "rogues-dungeon-floor-wall-tileset.zip"); } catch (error) { window.alert(error instanceof Error ? error.message : "Could not create the floor/wall tileset bundle."); } };
  return <section className="map_fix_controls" aria-label="Map test tools"><strong>MapTest</strong><button tabIndex={-1} type="button" onClick={() => void openCurrentMap()}>Open Current Map</button><button tabIndex={-1} type="button" onClick={() => void openTileset()}>Open Floor/Wall Tileset</button></section>;
}
const keyboardControlRows = Object.freeze([
  { label: "Abilities:", keys: ["1", "2", "3"] },
  { label: "Quick:", keys: ["Q", "W", "E"] },
  { label: "Move:", keys: ["A", "S", "D"] },
  { label: "More:", keys: ["Z", "X", "C"] },
]);
const collapsedKeyboardGroups = Object.freeze([
  { label: "Move:", keys: ["W", "A", "S", "D"] },
  { label: "Abilities:", keys: ["1", "2", "3"] },
  { label: "Quick:", keys: ["Q", "E"] },
  { label: "More:", keys: ["Z", "X", "C"] },
]);
const keyboardKeyHelp: Readonly<Partial<Record<string, string>>> = Object.freeze({
  "1": "Use ability 1",
  "2": "Use ability 2",
  "3": "Use ability 3",
  Q: "Use Quickslot 1",
  W: "Move Up",
  E: "Use Quickslot 2",
  A: "Move Left",
  S: "Move Down",
  D: "Move Right",
  Z: "Toggle Controls",
  X: "Wait 1 time tick",
  C: "Toggle Panels",
});
const keyboardKeyCategory: Readonly<Partial<Record<string, string>>> = Object.freeze({ 1: "abilities", 2: "abilities", 3: "abilities", Q: "quick", W: "move", E: "quick", A: "move", S: "move", D: "move", Z: "more", X: "more", C: "more" });
const statusMovementDirections: Readonly<Record<string, Direction>> = Object.freeze({ W: "n", A: "w", S: "s", D: "e" });
type StatusKeyRole = "move" | "quick" | "abilities" | "more" | "default";
function statusKeyRole(key: string, fallback: StatusKeyRole): StatusKeyRole { return statusMovementDirections[key] ? "move" : /^[1-3]$/.test(key) ? "abilities" : key === "Q" || key === "E" ? "quick" : key === "Z" || key === "X" || key === "C" ? "more" : fallback; }
function movementAvailability(campaign: Campaign): Readonly<Record<Direction, boolean>> {
  return (Object.keys(directions) as Direction[]).reduce((available, direction) => {
    const [dx, dy] = directions[direction];
    const x = campaign.player.x + dx;
    const y = campaign.player.y + dy;
    const hasActionableEntity = campaign.floor.entities.some((entity) => entity.x === x && entity.y === y);
    available[direction] = isWalkable(campaign.floor, x, y) || hasActionableEntity;
    return available;
  }, {} as Record<Direction, boolean>);
}
const feedbackKeys = new Set(Object.keys(keyboardKeyHelp));
function InputKey({ keyLabel, category = keyboardKeyCategory[keyLabel], mode = "display", pressed = false, available = true, colorAvailable = available, className = "", onHoverStart, onHoverEnd, onActivate, onPressStart, onPressEnd }: { keyLabel: string; category?: string; mode?: string; pressed?: boolean; available?: boolean; colorAvailable?: boolean; className?: string; onHoverStart?(key: string): void; onHoverEnd?(key: string): void; onActivate?(): void; onPressStart?(key: string): void; onPressEnd?(key: string): void }) {
  const slotKey = category === "abilities" || category === "quick";
  const unavailableKey = slotKey || category === "move";
  const classes = ["input-key", category && `input-key--${category}`, unavailableKey && !colorAvailable && "input-key--unavailable", mode === "feedback" && pressed && "input-key--pressed", mode === "feedback" && pressed && "input-key--active", className].filter(Boolean).join(" ");
  return <kbd className={classes} aria-label={`Keyboard key ${keyLabel}`} aria-disabled={unavailableKey && !available} data-input-mode={mode} onClick={onActivate} onPointerDown={() => available && onPressStart?.(keyLabel)} onPointerUp={() => onPressEnd?.(keyLabel)} onPointerCancel={() => onPressEnd?.(keyLabel)} onPointerEnter={() => onHoverStart?.(keyLabel)} onPointerLeave={() => { onHoverEnd?.(keyLabel); onPressEnd?.(keyLabel); }}>{keyLabel}</kbd>;
}
function StatusControls({ campaign, performanceActive, onTogglePerformance, canOverride, orientation, onTogglePanels, onPanelToggle, onWait, fps, urlArgs, setUrlArgs, mapTest, setMapTest, itemTest, setItemTest, enemyTest, setEnemyTest, levelTest, setLevelTest, zoomTest, setZoomTest, gameViewShader, setGameViewShader, renderTestMode, setRenderTestMode, mobilePanel = "controls", setMobilePanel = () => {}, drag = null }: { campaign: Campaign; performanceActive: boolean; onTogglePerformance(): void; canOverride: boolean; orientation: Orientation; onTogglePanels(): void; onPanelToggle(expanded: boolean): void; onWait(): void; fps: ReturnType<typeof createFpsStore>; urlArgs: boolean; setUrlArgs(value: boolean): void; mapTest: boolean; setMapTest(value: boolean): void; itemTest: boolean; setItemTest(value: boolean): void; enemyTest: boolean; setEnemyTest(value: boolean): void; levelTest: boolean; setLevelTest(value: boolean): void; zoomTest: boolean; setZoomTest(value: boolean): void; gameViewShader: GameViewShaderId; setGameViewShader(value: GameViewShaderId): void; renderTestMode: RenderTestMode; setRenderTestMode(value: RenderTestMode): void; mobilePanel?: string; setMobilePanel?(value: string): void; drag?: DragPresentation | null }) {
  const { showPivotPoints, setShowPivotPoints, setAspectRatio } = useContext(LayoutContext);
  const [expanded, setExpanded] = useState(false);
  const [trayRetained, setTrayRetained] = useState(false);
  useEffect(() => {
    if (expanded) { setTrayRetained(true); return; }
    const timer = window.setTimeout(() => setTrayRetained(false), 250);
    return () => window.clearTimeout(timer);
  }, [expanded]);
  const [hoveredKey, setHoveredKey] = useState("");
  const [pressedKeys, setPressedKeys] = useState(() => new Set<string>());
  const movement = movementAvailability(campaign);
  const keyAvailable = (key: string, role: StatusKeyRole = "default") => {
    if ((drag?.source.kind === "ability" && key === String(drag.source.index + 1)) || (role === "quick" && drag?.source.kind === "quick-slot" && key === (drag.source.index === 0 ? "Q" : "E"))) return false;
    if (/^[1-3]$/.test(key)) { const abilityId = campaign.player.abilities[Number(key) - 1]; const ability = abilityId ? abilityCatalog[abilityId] : null; return Boolean(ability && campaign.player.resources.mana.current >= ability.manaCost); }
    if ((role === "move" || role === "default") && statusMovementDirections[key]) {
      return movement[statusMovementDirections[key]];
    }
    if (key === "Q" || key === "E") return quickSlotAvailable(campaign, campaign.player.quickSlots?.[key === "E" ? 1 : 0] ?? null);
    if (key === "Z" || key === "X" || key === "C") return true;
    return false;
  };
  useEffect(() => {
    const normalize = (event: KeyboardEvent) => String(event.key ?? "").toUpperCase();
    const down = (event: KeyboardEvent) => { const key = normalize(event); if (!feedbackKeys.has(key) || !keyAvailable(key)) return; if (key === "Z" && !event.repeat) { event.preventDefault(); setExpanded(!expanded); onPanelToggle(!expanded); } if (key === "C" && !event.repeat) { event.preventDefault(); onTogglePanels(); } if (expanded || trayRetained || key === "Z") setPressedKeys((current) => current.has(key) ? current : new Set(current).add(key)); };
    const up = (event: KeyboardEvent) => { const key = normalize(event); if (!feedbackKeys.has(key)) return; setPressedKeys((current) => { if (!current.has(key)) return current; const next = new Set(current); next.delete(key); return next; }); };
    const clear = () => setPressedKeys(current => current.size ? new Set() : current);
    // Record feedback before an action can update the campaign and replace these listeners.
    // Game owns keyboard actions, including X; the tray only owns its Z/C presentation.
    window.addEventListener("keydown", down, true); window.addEventListener("keyup", up, true); window.addEventListener("blur", clear);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); window.removeEventListener("blur", clear); };
  }, [campaign, drag, expanded, onTogglePanels, onPanelToggle, trayRetained]);
  const titleText = keyboardKeyHelp[hoveredKey] ?? "Controls";
  const titleVisible = Boolean(expanded || hoveredKey);
  const summaryMotion = useUiMotion("status-summary", { opacity: expanded ? 0 : 1, depth: 1 });
  const toggleExpanded = () => { setExpanded(!expanded); onPanelToggle(!expanded); };
  const inputKeyHoverProps = { onHoverStart: setHoveredKey, onHoverEnd: (key: string) => setHoveredKey((current) => current === key ? "" : current) };
  const setPointerPressed = (key: string, pressed: boolean) => setPressedKeys((current) => {
    if (!keyAvailable(key)) return current;
    const next = new Set(current);
    if (pressed) next.add(key); else next.delete(key);
    return next;
  });
  return <StatusBar>
    <div className="desktop_status">
      <div className={`keyboard_controls_region${expanded ? " keyboard_controls_region--expanded" : ""}`}>
        <div className="keyboard_collapsed_controls" aria-hidden={expanded} style={summaryMotion}><div className="keyboard_collapsed_summary" aria-label="Move WASD | Abilities: 123 | Quick: Q E | More ZXC">{collapsedKeyboardGroups.map(({ label, keys }) => <span className="keyboard_collapsed_group" key={label}><span className="status_shortcut"><span>{label}</span>{keys.map((key) => { const role = statusKeyRole(key, label === "Quick:" ? "quick" : label === "Move:" ? "move" : "default"); const available = keyAvailable(key, role); return <InputKey key={key} keyLabel={key} category={role} available={available} colorAvailable={available} onActivate={key === "Z" ? toggleExpanded : key === "C" ? onTogglePanels : undefined} />; })}</span></span>)}</div></div>
        <ControlsArea expanded={expanded} titleVisible={titleVisible} titleText={titleText} onToggle={toggleExpanded}>{(expanded || trayRetained) && keyboardControlRows.map(({ label, keys }) => <div className="keyboard_tray_row" key={label}><div className="keyboard_tray_keys">{keys.map((key) => { const role = statusKeyRole(key, label === "Quick:" ? "quick" : label === "Move:" ? "move" : "default"); const available = keyAvailable(key, role); return <InputKey key={key} keyLabel={key} category={role} mode="feedback" available={available} colorAvailable={available} pressed={pressedKeys.has(key)} className="keyboard_tray_key" onActivate={key === "Z" ? toggleExpanded : key === "X" ? onWait : key === "C" ? onTogglePanels : undefined} onPressStart={(pressedKey) => setPointerPressed(pressedKey, true)} onPressEnd={(pressedKey) => setPointerPressed(pressedKey, false)} {...inputKeyHoverProps} />; })}</div></div>)}</ControlsArea>
      </div>
      {canOverride && <div className="dev_settings"><span className="dev_settings_label">D Settings</span><Tooltip content="Switch the PC preview between landscape and portrait."><button tabIndex={-1} type="button" onClick={() => setAspectRatio(orientation === "landscape" ? "portrait" : "landscape")}>AR: {orientation === "landscape" ? "L" : "P"}</button></Tooltip><Tooltip content="Place one of each supported enemy near the World 1 Level 1 start."><button tabIndex={-1} type="button" aria-pressed={enemyTest} onClick={() => setEnemyTest(!enemyTest)}>E: {enemyTest ? 1 : 0}</button></Tooltip><Tooltip content="Place one of each supported item near the World 1 Level 1 start."><button tabIndex={-1} type="button" aria-pressed={itemTest} onClick={() => setItemTest(!itemTest)}>I: {itemTest ? 1 : 0}</button></Tooltip><Tooltip content="Place the home teleport arrow and one lockdown encounter four cells north of the World 1 Level 1 start."><button tabIndex={-1} type="button" aria-pressed={levelTest} onClick={() => setLevelTest(!levelTest)}>LT: {levelTest ? 1 : 0}</button></Tooltip><Tooltip content="Show the map-test controls for procedural map checks."><button tabIndex={-1} type="button" aria-pressed={mapTest} onClick={() => setMapTest(!mapTest)}>M: {mapTest ? 1 : 0}</button></Tooltip><Tooltip content="Show the temporary performance panel in the first information column. C moves or collapses it."><button tabIndex={-1} type="button" aria-pressed={performanceActive} onClick={onTogglePerformance}>P: {performanceActive ? 1 : 0}</button></Tooltip><Tooltip content="Show grid pivot coordinates on the selected cell."><button tabIndex={-1} type="button" aria-pressed={showPivotPoints} onClick={() => setShowPivotPoints((value) => !value)}>PV: {showPivotPoints ? 1 : 0}</button></Tooltip><Tooltip content={RENDER_TEST_TOOLTIP}><button tabIndex={-1} type="button" onClick={() => setRenderTestMode(nextRenderTestMode(renderTestMode))}>RT:{renderTestMode}</button></Tooltip><Tooltip content="Cycle the one active Game View shader. Shader 1 renders the game graphics in black and green."><button tabIndex={-1} type="button" aria-pressed={gameViewShader !== 0} onClick={() => setGameViewShader(gameViewShaderSystem.next(gameViewShader))}>S: {gameViewShader}</button></Tooltip><Tooltip content="Include run settings in generated share URLs."><button tabIndex={-1} type="button" aria-pressed={urlArgs} onClick={() => setUrlArgs(!urlArgs)}>URL: {urlArgs ? 1 : 0}</button></Tooltip><Tooltip content="Show all zoom presets; off keeps only 1x and 2x."><button tabIndex={-1} type="button" aria-pressed={zoomTest} onClick={() => setZoomTest(!zoomTest)}>Z: {zoomTest ? 1 : 0}</button></Tooltip><FpsReadout source={fps} /></div>}
    </div>
    <div className="mobile_status" role="group" aria-label="Bottom panel">{canOverride && <Tooltip content={RENDER_TEST_TOOLTIP}><button tabIndex={-1} type="button" onClick={() => setRenderTestMode(nextRenderTestMode(renderTestMode))}>RT:{renderTestMode}</button></Tooltip>}<Tooltip content="Show movement and ability controls."><button tabIndex={-1} type="button" aria-pressed={mobilePanel === "controls"} onClick={() => setMobilePanel("controls")}>Control</button></Tooltip><Tooltip content="Show stats, gear, quest, and log."><button data-ui-pickup-fallback tabIndex={-1} type="button" aria-pressed={mobilePanel === "info"} onClick={() => setMobilePanel("info")}>Info</button></Tooltip>{canOverride && <Tooltip content="Switch the PC preview between landscape and portrait."><button tabIndex={-1} type="button" onClick={() => setAspectRatio(orientation === "landscape" ? "portrait" : "landscape")}>AR: {orientation === "landscape" ? "L" : "P"}</button></Tooltip>}<Tooltip content="Show or exit the temporary performance panel.">{canOverride && <button tabIndex={-1} type="button" aria-pressed={performanceActive} onClick={onTogglePerformance}>P: {performanceActive ? 1 : 0}</button>}</Tooltip></div>
  </StatusBar>;
}
function itemDropTarget(target: Element | null, campaign: Campaign | null): { destination: DropDestination; targetItem?: Item | null } | null { const lockboxSlot = target?.closest<HTMLElement>("[data-drop-lockbox]"); if (lockboxSlot) return { destination: { kind: "lockbox", boxId: lockboxSlot.dataset.dropLockbox!, index: Number(lockboxSlot.dataset.dropIndex) } }; const dropItem = target?.closest<HTMLElement>("[data-drop-item]"); if (dropItem) return { destination: { kind: "drop-item" } }; const ability = target?.closest<HTMLElement>("[data-drop-ability]"); if (ability) return { destination: { kind: "ability", index: Number(ability.dataset.dropAbility) } }; const quick = target?.closest<HTMLElement>("[data-drop-quick-slot]"); if (quick) { const index = Number(quick.dataset.dropQuickSlot); return { destination: { kind: "quick-slot", index }, targetItem: campaign?.player.quickSlots?.[index]?.item ?? null }; } const slot = target?.closest<HTMLElement>("[data-drop-group]"); if (slot) { const group = slot.dataset.dropGroup as EquipmentGroup; const index = Number(slot.dataset.dropIndex); return { destination: { kind: "slot", group, index }, targetItem: campaign!.player.equipment[group]?.[index] }; } const inventorySlot = target?.closest<HTMLElement>("[data-drop-inventory-slot]"); if (inventorySlot) return { destination: { kind: "inventory", index: Number(inventorySlot.dataset.dropInventorySlot) } }; return null; }
function shineKeysForDestination(destination: DropDestination, item?: Item): string[] { if (destination.kind === "drop-item") return []; if (destination.kind === "ability") return [`ability:${destination.index}`]; if (destination.kind === "quick-slot") return [`quick:${destination.index}`]; if (destination.kind === "slot") return item?.slotSpan === 2 ? [0, 1].map((index) => `equipment:${destination.group}:${index}`) : [`equipment:${destination.group}:${destination.index}`]; return [item?.consumableResource ? `inventory-resource:${item.consumableResource}` : item ? `inventory:${item.id}` : "inventory"]; }

export function Game() {
  const [urlOptions] = useState(() => parseGameUrlOptions(window.location.search));
  const overworldPreview = urlOptions.worldFamily === "overworld";
  const [movementPrompts] = useState(() => new MovementPromptController());
  const [menuAssetsReady, setMenuAssetsReady] = useState(false);
  const { orientation, canOverride, showPivotPoints } = useContext(LayoutContext);
  const [selectedRenderTestMode, setRenderTestMode] = useState<RenderTestMode>(3);
  const renderTestMode = effectiveRenderTestMode(selectedRenderTestMode, canOverride);
  const renderTestModeRef = useRef(renderTestMode); renderTestModeRef.current = renderTestMode;
  const mouseCellAllowed = (state: Campaign, position: Position) => !renderTestEffects(renderTestModeRef.current).fog || isCellDiscovered(state, position);
  const [summaries, setSummaries] = useState<ReturnType<typeof readSlotSummary>>(() => {
    if (urlOptions.hasCompleteRunIdentity) return emptySlotSummaries();
    try { return readSlotSummary(localStorage); } catch { return emptySlotSummaries(); }
  });
  const [summaryNow, setSummaryNow] = useState(() => Date.now());
  const [slot, setSlot] = useState<string | null>(null); const [campaign, setCampaign] = useState<Campaign | null>(null); const [deathRecap, setDeathRecap] = useState<{ fatal: Campaign; recovery: Campaign | null; lines: string[] } | null>(null); const [deathSequence, setDeathSequence] = useState<{ fatal: Campaign; recovery: Campaign | null; lines: string[] } | null>(null); const [worldAlive, setWorldAlive] = useState(false); const [stairDepartureStartedAt, setStairDepartureStartedAt] = useState<number | null>(null); const [teleportDepartureRequested, setTeleportDepartureRequested] = useState(false); const [settings, setSettings] = useState(false); const [confirmingSaveAndExit, setConfirmingSaveAndExit] = useState(false); const [howToPlay, setHowToPlay] = useState(false); const [gameSettingsCenter, setGameSettingsCenter] = useState<DialogCenter | null>(null); const [menuDialogBounds, setMenuDialogBounds] = useState<DialogBounds | null>(null); const [progressionOpen, setProgressionOpen] = useState(false); const [modeSelectionSlot, setModeSelectionSlot] = useState<string | null>(null); const [creationMode, setCreationMode] = useState<CampaignMode | null>(null); const [creationSlot, setCreationSlot] = useState<string | null>(null); const [creationAttributes, setCreationAttributes] = useState<Attributes | null>(null); const [menuExiting, setMenuExiting] = useState(false); const [saveError, setSaveError] = useState(""); const [preview, setPreview] = useState<Attributes | null>(null); const [dragPresentation, setDragPresentation] = useState<DragPresentation | null>(null); const [gains, setGains] = useState<Gains>({}); const [floatingFeedback, setFloatingFeedback] = useState<Feedback[]>([]); const [resourceChangeEffects, setResourceChangeEffects] = useState<ResourceChangeEffect[]>([]); const [particleEffects, setParticleEffects] = useState<ParticleEffect[]>([]); const [itemThrows, setItemThrows] = useState<ItemThrow[]>([]); const [abilityCooldowns, setAbilityCooldowns] = useState<Partial<Record<AbilityId, number>>>({}); const [cameraAnimationToken, setCameraAnimationToken] = useState(0); const [fps] = useState(createFpsStore);
  const [worldCreation, setWorldCreation] = useState<{ identity: WorldIdentity; character: Attributes; mode: CampaignMode; attributes: WorldAttributes | null; preview: Campaign | null } | null>(null);
  const worldGrowthResult = campaign?.worldGrowth?.find(event => event.applied && !event.acknowledged);
  const [openLockbox, setOpenLockbox] = useState<string | null>(null);
  const openLockboxRef = useRef<string | null>(null);
  const lockboxPersistence = useRef<ReturnType<typeof createLockboxPersistence> | null>(null);
  const storagePanelState = useRef<{ primary: boolean; secondary: boolean; mobile: string } | null>(null);
  const panelState = useRef({ primary: true, secondary: true, mobile: "controls" });
  const pendingLockboxRef = useRef<string | null>(null);
  const lockboxOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressionDialogOpen = progressionOpen || Boolean(worldGrowthResult);
  const [primaryInfoOpen, setPrimaryInfoOpen] = useState(true); const [secondaryInfoOpen, setSecondaryInfoOpen] = useState(true); const [expandedPanelOpen, setExpandedPanelOpen] = useState(false); const [uiAnimations, setUiAnimations] = useState<GameViewToUiAnimation[]>([]); const [pendingUiCredits, setPendingUiCredits] = useState<{ id: string; previous: Campaign; shineKeys: string[] }[]>([]); const [shineTokens, setShineTokens] = useState<Record<string, number>>({});
  const [worldTextFocus, setWorldTextFocus] = useState(false);
  const worldInputEnabled = !deathSequence && !deathRecap && !expandedPanelOpen && !confirmingSaveAndExit && !dragPresentation && !worldTextFocus && !openLockbox;
  useEffect(() => {
    const sync = () => {
      const target = document.activeElement;
      setWorldTextFocus(target instanceof HTMLElement && Boolean(target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']")));
    };
    const focusOut = () => queueMicrotask(sync);
    document.addEventListener("focusin", sync); document.addEventListener("focusout", focusOut); sync();
    return () => { document.removeEventListener("focusin", sync); document.removeEventListener("focusout", focusOut); };
  }, []);
  useEffect(() => { setExpandedPanelOpen(false); }, [orientation]);
  const [selectedGridSpot, setSelectedGridSpot] = useState<SelectedCell | null>(null); const [campfireMenu, setCampfireMenu] = useState<Position | null>(null); const [campfireRestConfirming, setCampfireRestConfirming] = useState(false); const [campfireRestTransition, setCampfireRestTransition] = useState(false); const [interactionBumpActive, setInteractionBumpActive] = useState(false); const [statusReplenishProgress, setStatusReplenishProgress] = useState<number | null>(null); const [mobilePanel, setMobilePanel] = useState("controls"); const [mapTestState, setMapTestState] = useState(() => readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.mapTest)); const [itemTest, setItemTestState] = useState(() => readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.itemTest)); const [enemyTest, setEnemyTestState] = useState(() => readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.enemyTest)); const [levelTest, setLevelTestState] = useState(() => readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.leveltest)); const [zoomTest, setZoomTestState] = useState(() => readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.zoomTest)); const [gameViewShader, setGameViewShaderState] = useState<GameViewShaderId>(() => gameViewShaderSystem.normalize(readDevGameViewShader()));
  const mapTest = mapTestState; const setMapTest = (value: boolean) => { writeDevBoolean(DEV_SETTINGS_STORAGE_KEYS.mapTest, value); setMapTestState(value); }; const setItemTest = (value: boolean) => { writeDevBoolean(DEV_SETTINGS_STORAGE_KEYS.itemTest, value); setItemTestState(value); }; const setEnemyTest = (value: boolean) => { writeDevBoolean(DEV_SETTINGS_STORAGE_KEYS.enemyTest, value); setEnemyTestState(value); }; const setLevelTest = (value: boolean) => { writeDevBoolean(DEV_SETTINGS_STORAGE_KEYS.leveltest, value); setLevelTestState(value); };
  const [dungeonTheme, setDungeonTheme] = useState<DungeonTheme>(1);
  panelState.current = { primary: primaryInfoOpen, secondary: secondaryInfoOpen, mobile: mobilePanel };
  const gainTimers = useRef(new Map<ResourceName, ReturnType<typeof setTimeout>>()); const abilityTimers = useRef(new Set<ReturnType<typeof setTimeout>>()); const abilityCooldownsRef = useRef<Partial<Record<AbilityId, number>>>({}); const sessionGenerationRef = useRef(0); const settingsBoundsRef = useRef<DialogBounds | null>(null); const creationBoundsRef = useRef<DialogBounds | null>(null); const helpBoundsRef = useRef<DialogBounds | null>(null); const deathRecapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatingTimers = useRef(new Map<string | undefined, ReturnType<typeof setTimeout>>()); const resourceChangeEffectTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>()); const shineTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>()); const pendingMenuStartRef = useRef<(() => void) | null>(null);
  const turnPresentation = useRef(new TurnPresentationSystem()).current;
  const [gridlessInteractions] = useState(() => new GridlessInteractionController(turnPresentation));
  useEffect(() => { if (campaign) return; const interval = window.setInterval(() => setSummaryNow(Date.now()), 60_000); return () => window.clearInterval(interval); }, [campaign]);
  useEffect(() => () => { floatingTimers.current.forEach(clearTimeout); floatingTimers.current.clear(); resourceChangeEffectTimers.current.forEach(clearTimeout); resourceChangeEffectTimers.current.clear(); shineTimers.current.forEach(clearTimeout); shineTimers.current.clear(); abilityTimers.current.forEach(clearTimeout); abilityTimers.current.clear(); if (lockboxOpenTimer.current) clearTimeout(lockboxOpenTimer.current); if (deathRecapTimer.current) clearTimeout(deathRecapTimer.current); }, []);
  const [preferences, setPreferences] = useState<Preferences>(() => { try { const stored = readPreferences(localStorage); const presets = availableGameZoomPresets(zoomTest); return { ...stored, zoom: presets.includes(stored.zoom) ? stored.zoom : 1, urlArgs: readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.urlArgs, stored.urlArgs) }; } catch { return { movementMode: "grid-tween", zoom: 1, camera: "center", fullscreenDesired: false, sfxVolume: 80, musicVolume: 1, muteAll: false, urlArgs: readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.urlArgs) }; } });
  useEffect(() => { sessionGenerationRef.current++; }, [slot]);
  const urlRunStarted = useRef(false);
  const randomSeed = urlOptions.seed;
  const [audio] = useState(() => createAudioManager({ search: window.location.search }));
  useEffect(() => {
    const playLevelUpShimmer = (event: AnimationEvent) => {
      if (event.animationName !== "level-up-reminder" && event.animationName !== "level-up-reminder-reduced") return;
      if (document.hidden || !(event.target instanceof Element) || !event.target.closest(".game-card--level-up")) return;
      audio.playCue("positiveShimmer");
    };
    // CSS owns the reminder cadence. Follow its real passes, including reduced
    // motion, so hidden or dismissed panels do not leave an audio timer behind.
    document.addEventListener("animationstart", playLevelUpShimmer);
    document.addEventListener("animationiteration", playLevelUpShimmer);
    return () => {
      document.removeEventListener("animationstart", playLevelUpShimmer);
      document.removeEventListener("animationiteration", playLevelUpShimmer);
    };
  }, [audio]);
  useEffect(() => {
    if (campaign) return;
    const playMenuClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (button && !button.disabled) audio.playCue("menuClick");
    };
    document.addEventListener("click", playMenuClick);
    return () => document.removeEventListener("click", playMenuClick);
  }, [audio, campaign]);
  const togglePanels = () => { if (openLockboxRef.current) return; audio.playPanelToggle(!primaryInfoOpen); if (primaryInfoOpen && secondaryInfoOpen) setSecondaryInfoOpen(false); else if (primaryInfoOpen) setPrimaryInfoOpen(false); else if (secondaryInfoOpen) setPrimaryInfoOpen(true); else setSecondaryInfoOpen(true); };
  useEffect(() => {
    const next = runUrlForCampaign(window.location.href, preferences.urlArgs, campaign, slot);
    if (next !== window.location.href) window.history.replaceState(null, "", next);
  }, [campaign, preferences.urlArgs, slot]);
  useEffect(() => { audio.setPreferences(preferences); }, [audio, preferences]);
  const [, refreshBattleMode] = useState(0);
  const currentGameMode = campaign ? gameMode(campaign) : "General";
  useEffect(() => {
    if (!campaign) return;
    const remaining = battleGraceRemainingMs(campaign);
    if (!remaining) return;
    const timer = window.setTimeout(() => refreshBattleMode(value => value + 1), remaining + 1);
    return () => window.clearTimeout(timer);
  }, [campaign]);
  useEffect(() => { audio.setGameMode(currentGameMode); }, [audio, currentGameMode]);
  useEffect(() => () => audio.dispose(), [audio]);
  useEffect(() => { void audio.prewarm(); }, [audio]);
  useEffect(() => { const startMusic = () => audio.startMusic(); window.addEventListener("pointerdown", startMusic); window.addEventListener("keydown", startMusic); return () => { window.removeEventListener("pointerdown", startMusic); window.removeEventListener("keydown", startMusic); }; }, [audio]);
  const [fullscreenActual, setFullscreenActual] = useState(() => Boolean(document.fullscreenElement));
  const fullscreenStateRef = useRef(Boolean(document.fullscreenElement));
  const performanceSession = useRef(new PerformanceSession());
  const restorePerformanceRef = useRef<() => void>(() => {});
  const [performanceEpoch, setPerformanceEpoch] = useState(0);
  const [performanceError, setPerformanceError] = useState("");
  const sessionRef = useRef<ReturnType<typeof createGameSession> | null>(null);
  const pixelSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const campaignRef = useRef<Campaign | null>(null);
  const initialQuestShimmerPendingRef = useRef(false);
  const [initialWorldRevealComplete, setInitialWorldRevealComplete] = useState(false);
  const collectedItemIdsRef = useRef(new Set<string>());
  const shineSlot = useCallback((key: string) => {
    setShineTokens((current) => ({ ...current, [key]: (current[key] ?? 0) + 1 }));
    const previousTimer = shineTimers.current.get(key); if (previousTimer) clearTimeout(previousTimer);
    const timer = setTimeout(() => { shineTimers.current.delete(key); setShineTokens((current) => { const next = { ...current }; delete next[key]; return next; }); }, 1000);
    shineTimers.current.set(key, timer);
  }, []);
  const shineSlots = useCallback((keys: string[]) => { keys.forEach(shineSlot); }, [shineSlot]);
  useLayoutEffect(() => {
    const previous = campaignRef.current;
    if (campaign) {
      const previousQuest = previous ? currentQuest(previous) : null;
      const nextQuest = currentQuest(campaign);
      const questStarted = !previousQuest || previousQuest.id !== nextQuest.id || previousQuest.activeItemId === null && nextQuest.activeItemId !== null;
      const questFinished = previousQuest?.activeItemId !== null && nextQuest.activeItemId === null;
      if (questStarted || questFinished) {
        if (questStarted && !previousQuest) initialQuestShimmerPendingRef.current = true;
        if (!questStarted || initialWorldRevealComplete) {
          shineSlot("quest");
          initialQuestShimmerPendingRef.current = false;
        }
      }
    }
    if (initialWorldRevealComplete && initialQuestShimmerPendingRef.current) {
      shineSlot("quest");
      initialQuestShimmerPendingRef.current = false;
    }
    if (campaign && previous) for (const entity of previous.floor.entities) {
      const collected = collectedItemIdsRef.current.has(entity.id) || (entity.kind === "item" && collectedItemIdsRef.current.has(entity.item.id));
      if (entity.kind === "crate") continue;
      if (!collected || campaign.floor.entities.some((current) => current.id === entity.id) || entity.kind === "campfire" || !["item", "potion", "gold", "key"].includes(entity.kind)) continue;
      const id = `${entity.id}:${campaign.floor.time}`;
      const resource = entity.kind === "potion" ? entity.resource : entity.kind === "item" ? entity.item.consumableResource : null;
      const quickSlot = resource ? campaign.player.quickSlots?.findIndex((slot) => slot?.item.consumableResource === resource) ?? -1 : -1;
      const existingInventoryTarget = resource ? previous.player.inventory.some((item) => item.consumableResource === resource) : entity.kind === "item" && previous.player.inventory.some((item) => item.id === entity.item.id);
      const destination = entity.kind === "gold" || entity.kind === "key" ? "counter" : "row";
      const target = destination === "counter" ? `[data-ui-counter-icon="${entity.kind}"]` : quickSlot >= 0 ? `[data-drop-quick-slot="${quickSlot}"]` : existingInventoryTarget && resource ? `[data-inventory-resource="${resource}"]` : existingInventoryTarget && entity.kind === "item" ? `[data-inventory-item-id="${entity.item.id}"]` : "[data-drop-inventory-slot][data-slot-empty=\"true\"]";
      const shineKeys = quickSlot >= 0 ? [`quick:${quickSlot}`] : resource ? [`inventory-resource:${resource}`] : entity.kind === "item" ? [`inventory:${entity.item.id}`] : [];
      const presentation = worldPickupPresentation(entity);
      const frame = itemSpriteFrame(presentation.kind, presentation.resource);
      audio.playCue(entity.kind === "key" ? "key" : entity.kind === "potion" ? "collect" : "inventory");
      const mainSizePx = entity.kind === "key" ? 16 : 32;
      const mainOffsetPx = { x: 0, y: presentation.kind === "potion" ? -8 : 0 };
      setUiAnimations((current) => [...current, { id, kind: presentation.kind as GameViewToUiAnimation["kind"], resource: presentation.resource, itemName: entity.kind === "item" ? entity.item.name : undefined, x: entity.x, y: entity.y, frame, mainSizePx, mainOffsetPx, target, destination }]);
      setPendingUiCredits((current) => [...current, { id, previous, shineKeys }]);
    }
    collectedItemIdsRef.current.clear();
    campaignRef.current = campaign;
  }, [audio, campaign, initialWorldRevealComplete, shineSlot]);
  const pointerDragRef = useRef<PointerDrag | null>(null);
  const suppressSlotClickRef = useRef(false);
  const completeUiAnimation = useCallback((id: string) => {
    setUiAnimations((current) => current.filter((animation) => animation.id !== id));
    setPendingUiCredits((current) => current.filter((credit) => credit.id !== id));
  }, []);
  const restUiAnimation = useCallback((id: string) => {
    const credit = pendingUiCredits.find((entry) => entry.id === id);
    if (credit?.shineKeys.length) shineSlots(credit.shineKeys);
  }, [pendingUiCredits, shineSlots]);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const stairDepartureActiveRef = useRef(false);
  const heldMovements = useRef(new Map<string, { direction: Direction }>());
  const physicalMovementKeys = useRef(new Set<string>());
  const heldShift = useRef(new Set<string>());
  const mouseMovement = useRef<Movement | null>(null);
  const mouseScreenEdgeMove = useRef<{ target: Position; direction: Direction } | null>(null);
  const mouseDirection = mouseScreenEdgeMove.current?.direction ?? null;
  const previousSelectedGridSpot = useRef<SelectedCell | null>(null);
  const clickedDestination = useRef<SelectedCell | null>(null);
  const warnedMouseHazard = useRef<Position | null>(null);
  const mouseTravelBudget = useRef(MAX_MOUSE_TRAVEL_STEPS);
  const confirmedMouseHazard = useRef<Position | null>(null);
  const movementRuntime = useRef({ preferences, settings, confirmingSaveAndExit, progressionOpen: progressionDialogOpen, worldAlive, worldInputEnabled });
  movementRuntime.current = { preferences, settings, confirmingSaveAndExit, progressionOpen: progressionDialogOpen, worldAlive, worldInputEnabled };
  const effectiveMovementMode = preferences.movementMode === "gridless" && (interactionBumpActive || campaign && gameMode(campaign) === "Battle") ? "grid-tween" : preferences.movementMode;
  turnPresentation.setPlayerMode(effectiveMovementMode);
  const requestCampfireRest = useCallback(() => { if ((sessionRef.current?.getState().counters.gold ?? 0) < REST_GOLD_COST) return; setCampfireMenu(null); setStatusReplenishProgress(0); setCampfireRestTransition(true); }, []);
  const beginInteractionBump = useCallback((origin: Position, direction: Position, now: number) => { turnPresentation.beginBump("player", origin, direction, now); setInteractionBumpActive(true); const timer = setTimeout(() => { abilityTimers.current.delete(timer); setInteractionBumpActive(false); }, INTERACTIVE_BUMP_DURATION_MS); abilityTimers.current.add(timer); }, [turnPresentation]);
  const startGridlessInteraction = useCallback((plan: GridlessInteraction, current: Campaign, consequence?: () => void) => {
    const session = sessionRef.current; const generation = sessionGenerationRef.current;
    if (!session) return null;
    let expected = current;
    const started = gridlessInteractions.start(plan, current, performance.now(), () => {
      const valid = sessionRef.current === session && sessionGenerationRef.current === generation && session.getState() === expected;
      if (!valid) gridlessInteractions.cancel(sessionRef.current?.getState());
      return valid;
    }, (now) => {
      const result = resolveGridlessInteraction(session, plan, now);
      // Lock the same frame as arrival, before held input can move another pixel.
      if (plan.kind === "entry" && result?.accepted && "state" in result
        && result.state.floor.entities.some(entity => entity.kind === "teleport-arrow"
          && entity.x === result.state.player.x && entity.y === result.state.player.y)) {
        stairDepartureActiveRef.current = true;
      }
      if (consequence) consequence();
      else if (plan.campfire) setCampfireMenu(plan.campfire);
      else {
        if (result?.accepted && "state" in result && !result.events.some(event => event.type === "player.died" || event.type === "realm.entered")) {
          const trap = result.state.floor.decorations?.find(d => d.kind === "trap" && d.x === result.state.player.x && d.y === result.state.player.y);
          if (trap && trapIsDangerous(trapFrameAt(now))) trapStrikeRef.current = `${result.state.floor.seed}:${trap.id}:${Math.floor(now / TRAP_CYCLE_MS)}`;
          if (result.state.player.x !== current.player.x || result.state.player.y !== current.player.y) {
            if (clickedDestination.current) mouseTravelBudget.current--;
            mouseScreenEdgeMove.current = { target: { x: result.state.player.x, y: result.state.player.y }, direction: plan.direction };
          }
        }
      }
      expected = session.getState();
    });
    return started ? { accepted: true, deferred: true, events: [], state: current, ticks: 0 } : null;
  }, [gridlessInteractions]);
  const confirmCampfireRest = useCallback(() => {
    const current = sessionRef.current?.getState();
    if (!current || !campfireMenu || current.counters.gold < REST_GOLD_COST) return;
    const direction = { x: campfireMenu.x - current.player.x, y: campfireMenu.y - current.player.y };
    if (Math.abs(direction.x) + Math.abs(direction.y) !== 1) return;
    if (preferences.movementMode === "gridless") {
      const plan = planGridlessInteraction(current, { type: "move", direction: movementDirection(current.player, campfireMenu)! });
      if (plan) startGridlessInteraction(plan, current, () => { setCampfireRestConfirming(false); requestCampfireRest(); });
      return;
    }
    const now = performance.now();
    if (turnPresentation.isBumping("player", now)) return;
    beginInteractionBump(current.player, direction, now);
    setCampfireRestConfirming(true);
    const generation = sessionGenerationRef.current;
    const timer = setTimeout(() => {
      abilityTimers.current.delete(timer);
      if (generation !== sessionGenerationRef.current) return;
      setCampfireRestConfirming(false);
      requestCampfireRest();
    }, INTERACTIVE_BUMP_APEX_MS);
    abilityTimers.current.add(timer);
  }, [beginInteractionBump, campfireMenu, preferences.movementMode, requestCampfireRest, startGridlessInteraction, turnPresentation]);
  const dispatch = useCallback((action: Action) => { if (openLockboxRef.current || pendingLockboxRef.current && action.type !== "resolve-ability") return null; if (performanceSession.current.active && performanceOptions().simulation === "frozen") return sessionRef.current?.dispatch(action) ?? null; if (stairDepartureActiveRef.current || campfireRestTransition || gridlessInteractions.active && action.type !== "trap-strike") return null; if (campfireMenu && action.type !== "move" && action.type !== "move-pixels") setCampfireMenu(null); if (action.type === "move" || action.type === "move-pixels") {
    const current = sessionRef.current?.getState();
    if (current && turnPresentation.isBumping("player", performance.now())) return null;
    const direction = action.type === "move" ? action.direction as Direction : current ? movementDirection(current.player.pixel ?? cellCenter(current.player), action.to) : null;
    if (current && direction && movementPrompts.respondToMove(direction)) return { accepted: false, events: [], state: current, ticks: 0 };
  }
    if (preferences.movementMode !== "gridless" && action.type === "move") {
      const current = sessionRef.current?.getState(), offset = directions[action.direction as Direction];
      const box = current && offset ? current.floor.lockboxes?.find(entry => entry.x === current.player.x + offset[0] && entry.y === current.player.y + offset[1]) : null;
      if (current && offset && box) {
        beginInteractionBump(current.player, { x: offset[0], y: offset[1] }, performance.now());
        const generation = sessionGenerationRef.current;
        const timer = setTimeout(() => { abilityTimers.current.delete(timer); if (sessionGenerationRef.current === generation) sessionRef.current?.dispatch(action); }, INTERACTIVE_BUMP_APEX_MS);
        abilityTimers.current.add(timer);
        return { accepted: true, events: [], state: current, ticks: 0 };
      }
    }
    if (preferences.movementMode === "gridless") {
      let current = sessionRef.current?.getState();
      if (current && (action.type === "move" || action.type === "move-pixels" || action.type === "center-player")) {
        // Battle entry can already have a renderer tween pending.
        if (gameMode(current) === "Battle" && turnPresentation.isPlayerMoving) return null;
        let plan = planGridlessInteraction(current, action);
        if (plan?.prefix) {
          sessionRef.current?.dispatch({ type: "move-pixels", to: plan.prefix, hazardElapsedMs: performance.now() });
          current = sessionRef.current?.getState();
          if (!current) return null;
          plan = planGridlessInteraction(current, action);
        }
        if (plan) return startGridlessInteraction(plan, current);
      }
    }
    if (action.type === "move" && !Number.isFinite(action.hazardElapsedMs)) action = { ...action, hazardElapsedMs: performance.now() }; if (action.type === "move") { const current = sessionRef.current?.getState(); const direction = directions[action.direction as Direction]; const now = performance.now(); if (current && turnPresentation.isBumping("player", now)) return null; if (current && direction) { const [dx, dy] = direction; const target = current.floor.entities.find((entity) => entity.x === current.player.x + dx && entity.y === current.player.y + dy); if (target?.kind === "enemy" && !hasAssignedWeapon(current)) return sessionRef.current?.dispatch(action); if (target?.kind === "campfire") { setCampfireMenu({ x: target.x, y: target.y }); return { accepted: false, events: [], state: current, ticks: 0 }; } if (target && (target.kind === "enemy" || target.kind === "crate" && !target.opened || target.kind === "chest" && !target.opened)) { beginInteractionBump(current.player, { x: dx, y: dy }, now); const generation = sessionGenerationRef.current; const timer = setTimeout(() => { abilityTimers.current.delete(timer); if (generation === sessionGenerationRef.current) sessionRef.current?.dispatch(action); }, INTERACTIVE_BUMP_APEX_MS); abilityTimers.current.add(timer); return { accepted: true, events: [], state: current, ticks: 0 }; } } } if (action.type === "ability") { const current = sessionRef.current?.getState(); const id = current?.player.abilities[action.index]; if (id && (abilityCooldownsRef.current[id] ?? 0) > performance.now()) return null; const result = sessionRef.current?.dispatch(action); if (result?.accepted && id) { const generation = sessionGenerationRef.current; const cast = result.events.find((event) => event.type === "ability.used"); const origin = cast?.facts.position; if (origin) { const puff = createAbilityParticle(id, origin, cast?.facts.targetId); setParticleEffects((effects) => [...effects.filter((effect) => !particleExpired(effect)), puff]); const resolveTimer = setTimeout(() => { abilityTimers.current.delete(resolveTimer); if (sessionGenerationRef.current !== generation) return; setParticleEffects((effects) => effects.filter((effect) => effect.id !== puff.id)); sessionRef.current?.dispatch({ type: "resolve-ability", abilityId: id, targetId: cast?.facts.targetId }); }, particleDurationMs(puff)); abilityTimers.current.add(resolveTimer); } const until = performance.now() + 1000; abilityCooldownsRef.current = { ...abilityCooldownsRef.current, [id]: until }; setAbilityCooldowns(abilityCooldownsRef.current); const cooldownTimer = setTimeout(() => { abilityTimers.current.delete(cooldownTimer); if (sessionGenerationRef.current !== generation) return; const next = { ...abilityCooldownsRef.current }; delete next[id]; abilityCooldownsRef.current = next; setAbilityCooldowns(next); }, 1000); abilityTimers.current.add(cooldownTimer); } return result; } if (action.type === "use-quick-slot") { const result = sessionRef.current?.dispatch(action); const cast = result?.events.find((event) => event.type === "ability.used"); const id = cast?.facts.abilityId; if (result?.accepted && id && cast?.facts.position) { const generation = sessionGenerationRef.current; const puff = createAbilityParticle("wand", cast.facts.position, cast.facts.targetId); setParticleEffects((effects) => [...effects.filter((effect) => !particleExpired(effect)), puff]); const resolveTimer = setTimeout(() => { abilityTimers.current.delete(resolveTimer); if (sessionGenerationRef.current !== generation) return; setParticleEffects((effects) => effects.filter((effect) => effect.id !== puff.id)); sessionRef.current?.dispatch({ type: "resolve-ability", abilityId: id, targetId: cast.facts.targetId }); }, particleDurationMs(puff)); abilityTimers.current.add(resolveTimer); } return result; } const result = sessionRef.current?.dispatch(action); if (action.type === "move" && result?.accepted) { const trap = result.state.floor.decorations?.find((decoration) => decoration.kind === "trap" && decoration.x === result.state.player.x && decoration.y === result.state.player.y); if (trap && trapIsDangerous(trapFrameAt(action.hazardElapsedMs!))) trapStrikeRef.current = `${result.state.floor.seed}:${trap.id}:${Math.floor(action.hazardElapsedMs! / TRAP_CYCLE_MS)}`; } return result; }, [beginInteractionBump, campfireMenu, campfireRestTransition, gridlessInteractions, movementPrompts, preferences.movementMode, startGridlessInteraction, turnPresentation]);
  const noteMouseScreenEdgeMove = useCallback((before: Position, result: ReturnType<typeof dispatch>, direction: Direction) => {
    const after = result && "state" in result ? result.state.player : null;
    if (!after || (before.x === after.x && before.y === after.y)) return;
    mouseScreenEdgeMove.current = { target: { x: after.x, y: after.y }, direction };
  }, []);
  const completeCampfireRest = useCallback((progress: number) => { setStatusReplenishProgress(progress); shineSlot("status"); audio.playCue("positiveShimmer"); if (progress < 1) return; const result = sessionRef.current?.dispatch({ type: "rest" }); setCampfireRestTransition(false); return result; }, [audio, shineSlot]);
  useEffect(() => {
    const cancel = () => gridlessInteractions.cancel(sessionRef.current?.getState());
    window.addEventListener("blur", cancel);
    const visibility = () => { if (document.hidden) cancel(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", visibility); cancel(); };
  }, [gridlessInteractions]);
  useLayoutEffect(() => {
    if (gridlessInteractions.active) gridlessInteractions.cancel(sessionRef.current?.getState());
  }, [preferences.movementMode, campaign?.floor.seed, campaign?.floor.level, campaign?.activePrefab?.id, settings, confirmingSaveAndExit, progressionDialogOpen, expandedPanelOpen, worldAlive, gridlessInteractions]);
  const trapStrikeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!campaign) return;
    const strikeWhenSpikesRise = () => {
      if (openLockboxRef.current || performanceSession.current.active && performanceOptions().simulation === "frozen") return;
      const elapsedMs = performance.now();
      const trap = campaign.floor.decorations?.find((decoration) => decoration.kind === "trap" && decoration.x === campaign.player.x && decoration.y === campaign.player.y);
      const key = trap && trapIsDangerous(trapFrameAt(elapsedMs)) ? `${campaign.floor.seed}:${trap.id}:${Math.floor(elapsedMs / TRAP_CYCLE_MS)}` : null;
      if (key === trapStrikeRef.current) return;
      trapStrikeRef.current = key;
      if (key) dispatch({ type: "trap-strike", hazardElapsedMs: elapsedMs });
    };
    strikeWhenSpikesRise();
    const timer = window.setInterval(strikeWhenSpikesRise, 25);
    return () => window.clearInterval(timer);
  }, [campaign, dispatch]);
  const completeStairDeparture = useCallback(() => { stairDepartureActiveRef.current = false; setStairDepartureStartedAt(null); dispatch({ type: "enter-stairs" }); }, [dispatch]);
  const completeTeleportDeparture = useCallback(() => {
    // Keep input locked until the destination iris has finished revealing.
    stairDepartureActiveRef.current = true;
    sessionRef.current?.dispatch({ type: "enter-teleport" });
    setTeleportDepartureRequested(false);
  }, []);
  const handleWorldAliveChange = useCallback((alive: boolean) => {
    setWorldAlive(alive);
    if (alive) { stairDepartureActiveRef.current = false; setInitialWorldRevealComplete(true); }
  }, []);
  const playStairDescentStep = useCallback(() => { audio.playCue("footstep", performance.now()); }, [audio]);
  const stairArrivalCampaignRef = useRef<Campaign | null>(null);
  useEffect(() => {
    const previous = stairArrivalCampaignRef.current;
    stairArrivalCampaignRef.current = campaign;
    if (!previous || previous.floor.seed !== campaign?.floor.seed || (previous.player.x === campaign?.player.x && previous.player.y === campaign?.player.y)) return;
    const stair = campaign?.floor.entities.find((entity) => entity.kind === "stairs" && entity.x === campaign.player.x && entity.y === campaign.player.y);
    if (stair) {
      stairDepartureActiveRef.current = true;
      const timer = window.setTimeout(() => setStairDepartureStartedAt(performance.now()), (preferences.movementMode === "gridless" ? 0 : CHARACTER_MOVEMENT_DURATION_MS) + STAIR_CENTER_SETTLE_DELAY_MS);
      return () => window.clearTimeout(timer);
    }
  }, [campaign, preferences.movementMode]);
  const activeMovement = useRef<Movement | null>(null);
  const teleportArrivalCampaignRef = useRef<Campaign | null>(null);
  useEffect(() => {
    const previous = teleportArrivalCampaignRef.current;
    teleportArrivalCampaignRef.current = campaign;
    if (!campaign || !previous || previous.floor.seed !== campaign.floor.seed || previous.activePrefab?.id !== campaign.activePrefab?.id) return;
    const arrow = campaign.floor.entities.find((entity) => entity.kind === "teleport-arrow" && entity.x === campaign.player.x && entity.y === campaign.player.y);
    if (!arrow || previous.player.x === campaign.player.x && previous.player.y === campaign.player.y) return;
    stairDepartureActiveRef.current = true;
    clickedDestination.current = null; heldMovements.current.clear(); heldShift.current.clear();
    activeMovement.current = null; mouseMovement.current = null; mouseScreenEdgeMove.current = null;
    if (moveTimer.current) { clearTimeout(moveTimer.current); moveTimer.current = null; }
    // Gridless has already completed its arrival before committing entry.
    if (preferences.movementMode !== "gridless") sessionRef.current?.dispatch({ type: "center-player" });
    const timer = window.setTimeout(() => {
      const current = sessionRef.current?.getState();
      if (current) turnPresentation.reset(current);
      setTeleportDepartureRequested(true);
    }, (preferences.movementMode === "gridless" ? 0 : CHARACTER_MOVEMENT_DURATION_MS) + STAIR_CENTER_SETTLE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [campaign?.floor.seed, campaign?.floor.level, campaign?.activePrefab?.id, campaign?.player.x, campaign?.player.y, preferences.movementMode, turnPresentation]);
  // Keep A* stable while the pointer moves within the same grid cell.
  const selectedMouseResult = useMemo(() => getMousePathResult(selectedGridSpot, campaign, (position) => Boolean(campaign && mouseCellAllowed(campaign, position))), [renderTestMode,campaign?.floor, campaign?.player.x, campaign?.player.y, selectedGridSpot?.x, selectedGridSpot?.y]);
  const selectedMousePath = selectedMouseResult.path;
  const selectedCellReachable = selectedGridSpot ? selectedMouseResult.reachable : null;
  const returnToMainMenu = useCallback(() => {
    gridlessInteractions.cancel(sessionRef.current?.getState());
    if (moveTimer.current) { clearTimeout(moveTimer.current); clearInterval(moveTimer.current); moveTimer.current = null; }
    heldMovements.current.clear(); heldShift.current.clear(); mouseMovement.current = null; activeMovement.current = null;
    pointerDragRef.current = null; sessionGenerationRef.current++; sessionRef.current = null;
    gainTimers.current.forEach(clearTimeout); gainTimers.current.clear(); abilityTimers.current.forEach(clearTimeout); abilityTimers.current.clear(); abilityCooldownsRef.current = {}; setAbilityCooldowns({}); setGains({});
    floatingTimers.current.forEach(clearTimeout); floatingTimers.current.clear(); resourceChangeEffectTimers.current.forEach(clearTimeout); resourceChangeEffectTimers.current.clear(); setFloatingFeedback([]); setResourceChangeEffects([]); setParticleEffects([]); setItemThrows([]); setUiAnimations([]); setPendingUiCredits([]);
    if (deathRecapTimer.current) { clearTimeout(deathRecapTimer.current); deathRecapTimer.current = null; }
    stairDepartureActiveRef.current = false; setStairDepartureStartedAt(null); setTeleportDepartureRequested(false); setSelectedGridSpot(null); setCampfireMenu(null); setPreview(null); setDragPresentation(null); setDeathSequence(null); setDeathRecap(null); setShineTokens({}); shineTimers.current.forEach(clearTimeout); shineTimers.current.clear(); campaignRef.current = null; initialQuestShimmerPendingRef.current = false; setInitialWorldRevealComplete(false); setHowToPlay(false); setSettings(false); setConfirmingSaveAndExit(false); setMenuExiting(false); setWorldAlive(false); setCampaign(null); setSlot(null);
  }, []);
  const saveAndQuit = useCallback(() => {
    if (performanceSession.current.active) { restorePerformanceRef.current(); return; }
    const currentCampaign = sessionRef.current?.getState() ?? campaign;
    if (!currentCampaign || !slot) { returnToMainMenu(); return; }
    try {
      if (pixelSaveTimer.current) { clearTimeout(pixelSaveTimer.current); pixelSaveTimer.current = null; }
      if (!urlOptions.hasCompleteRunIdentity && !overworldPreview) {
        writeSlot(localStorage, slot, currentCampaign);
        audio.playEvents([{ type: "campaign.save.succeeded", facts: {} }]);
        setSummaries(readSlotSummary(localStorage));
      }
      setSaveError("");
    } catch {
      setSaveError("Saving is unavailable in this browser session.");
      audio.playEvents([{ type: "campaign.save.failed", facts: {} }]);
    } finally {
      // Confirming Save & Exit always leaves the running game, even if the
      // browser rejects the storage write. The error remains visible in the
      // main menu so the player can continue or retry.
      returnToMainMenu();
    }
  }, [audio, campaign, overworldPreview, returnToMainMenu, slot, urlOptions.hasCompleteRunIdentity]);
  useEffect(() => {
    const saveAndQuitWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat || settings || !campaign || !slot || event.defaultPrevented || pointerDragRef.current) return;
      event.preventDefault();
      saveAndQuit();
    };
    window.addEventListener("keydown", saveAndQuitWithEscape);
    return () => window.removeEventListener("keydown", saveAndQuitWithEscape);
  }, [campaign, saveAndQuit, settings, slot]);
  const syncMovement = useCallback((immediate = true, continuing = false) => {
    if (!worldAlive) return;
    const keyboard = getLatestMovement(heldMovements.current, heldShift.current.size > 0);
    const next = keyboard ?? mouseMovement.current;
    const previous = activeMovement.current;
    const source = keyboard ? heldMovements.current.has("gamepad") ? "gamepad" : "keyboard" : "pointer";
    if (previous?.direction === next?.direction && previous?.sprint === next?.sprint && previous?.source === source) return;
    activeMovement.current = next ? { ...next, source } : null;
    if (moveTimer.current) { clearTimeout(moveTimer.current); clearInterval(moveTimer.current); moveTimer.current = null; }
    if (!next) return;
    const current = sessionRef.current?.getState();
    const battle = current && gameMode(current) === "Battle";
    if (movementRuntime.current.preferences.movementMode === "gridless" && !battle) return;
    const move = () => {
      const before = sessionRef.current?.getState().player;
      const result = dispatch({ type: "move", direction: next.direction, hazardElapsedMs: performance.now() });
      if (source === "pointer" && before) noteMouseScreenEdgeMove(before, result, next.direction as Direction);
      else if (source !== "pointer") mouseScreenEdgeMove.current = null;
      return result;
    };
    if (immediate && (previous?.direction !== next.direction || previous?.source !== source || (!previous?.sprint && next.sprint))) move();
    if (battle) return;
    const repeat = move;
    const scheduleRepeat = (delay: number) => { moveTimer.current = setTimeout(() => {
      if (sessionRef.current && gameMode(sessionRef.current.getState()) === "Battle") return;
      repeat();
      if (activeMovement.current?.source === source && activeMovement.current.direction === next.direction && activeMovement.current.sprint === next.sprint) scheduleRepeat(getMoveRepeatDelay(next.sprint));
    }, delay); };
    scheduleRepeat(getMoveScheduleDelay(next.sprint, continuing));
  }, [dispatch, noteMouseScreenEdgeMove, worldAlive]);
  const activateSelectedCell = useCallback((selected: SelectedCell) => {
    if (gridlessInteractions.active) return;
    if (!campaign || !worldAlive || !worldInputEnabled || settings || confirmingSaveAndExit || progressionDialogOpen) return;
    const plan = planMouseTravel(selected, campaign, warnedMouseHazard.current, (position) => mouseCellAllowed(campaign, position));
    warnedMouseHazard.current = plan.warnedHazard; confirmedMouseHazard.current = plan.confirmedHazard;
    mouseTravelBudget.current = MAX_MOUSE_TRAVEL_STEPS;
    heldMovements.current.clear(); activeMovement.current = null;
    if (moveTimer.current) { clearTimeout(moveTimer.current); moveTimer.current = null; }
    if (gameMode(campaign) === "Battle") {
      clickedDestination.current = null;
      const movement = getMouseMovementFromSelectedCell(plan.destination, campaign, undefined, (position) => mouseCellAllowed(campaign, position));
      if (movement) dispatch({ type: "move", direction: movement.direction });
    } else {
      if (movementRuntime.current.preferences.movementMode === "gridless") dispatch({ type: "center-player" });
      clickedDestination.current = { ...plan.destination };
    }
  }, [campaign, dispatch, gridlessInteractions, worldAlive, worldInputEnabled, settings, confirmingSaveAndExit, progressionDialogOpen]);
  useEffect(() => {
    const freshPress = selectedGridSpot?.pressed && !previousSelectedGridSpot.current?.pressed;
    previousSelectedGridSpot.current = selectedGridSpot;
    if (freshPress) activateSelectedCell(selectedGridSpot);
  }, [selectedGridSpot, activateSelectedCell]);
  useLayoutEffect(() => {
    clickedDestination.current = null; heldMovements.current.clear(); heldShift.current.clear(); activeMovement.current = null; mouseMovement.current = null; mouseScreenEdgeMove.current = null;
    warnedMouseHazard.current = null; confirmedMouseHazard.current = null;
    if (moveTimer.current) { clearTimeout(moveTimer.current); moveTimer.current = null; }
    const current = sessionRef.current?.getState();
    if (current && (preferences.movementMode !== "gridless" || gameMode(current) === "Battle")) {
      const center = cellCenter(current.player);
      if (current.player.pixel?.x !== center.x || current.player.pixel?.y !== center.y) dispatch({ type: "center-player" });
    }
  }, [preferences.movementMode, campaign ? gameMode(campaign) : null, campaign?.floor.seed, campaign?.floor.level, campaign?.activePrefab?.id, worldAlive, settings, confirmingSaveAndExit, progressionDialogOpen, worldInputEnabled]);
  useEffect(() => {
    let frame = 0; let last = performance.now(); let nextGridStep = 0;
    const integrator = new PixelMovementIntegrator();
    let routeKey = ""; let route: ReturnType<typeof getMousePathResult> = { path: null, reachable: false };
    const animateMovement = (now: number) => {
      const elapsed = Math.max(0, now - last); last = now;
      gridlessInteractions.update(now);
      if (gridlessInteractions.active) { integrator.reset(); frame = requestAnimationFrame(animateMovement); return; }
      const runtime = movementRuntime.current; const current = sessionRef.current?.getState();
      if (current && runtime.worldAlive && runtime.worldInputEnabled && !runtime.settings && !runtime.confirmingSaveAndExit && !runtime.progressionOpen && !stairDepartureActiveRef.current && (gameMode(current) === "General" || performanceSession.current.active && performanceOptions().simulation === "frozen")) {
        const held = [...heldMovements.current.values()]; const target = clickedDestination.current;
        if (target && mouseTravelBudget.current <= 0) {
          const center = cellCenter(current.player);
          if (runtime.preferences.movementMode === "gridless" && (current.player.pixel?.x !== center.x || current.player.pixel?.y !== center.y)) dispatch({ type: "move-pixels", to: center, hazardElapsedMs: now });
          clickedDestination.current = null; turnPresentation.stopPlayerPixelTravel();
          frame = requestAnimationFrame(animateMovement); return;
        }
        if (runtime.preferences.movementMode === "gridless" && (held.length || target)) {
          let dx = 0; let dy = 0; let destination: Position | null = null;
          const pixel = current.player.pixel ?? cellCenter(current.player);
          if (held.length) {
            for (const { direction } of held) { const offset = directions[direction]; dx += offset[0]; dy += offset[1]; }
            dx = Math.sign(dx); dy = Math.sign(dy);
          } else if (target) {
            const key = `${current.floor.seed}:${current.floor.level}:${current.floor.time}:${current.player.x},${current.player.y}:${target.x},${target.y}`;
            if (key !== routeKey) { route = getMousePathResult(target, current, (position) => mouseCellAllowed(current, position)); routeKey = key; }
            const path = route.path;
            const center = cellCenter(current.player);
            const next = path?.[1];
            if (next && mouseCellAllowed(current, next) && isMouseHazard(current.floor, next) && (next.x !== confirmedMouseHazard.current?.x || next.y !== confirmedMouseHazard.current?.y)) {
              warnedMouseHazard.current = next; clickedDestination.current = null; dispatch({ type: "center-player" }); turnPresentation.stopPlayerPixelTravel();
              frame = requestAnimationFrame(animateMovement); return;
            }
            if (next) destination = next.x !== current.player.x && pixel.y !== center.y || next.y !== current.player.y && pixel.x !== center.x ? center : cellCenter(next);
            else if (target.x === current.player.x && target.y === current.player.y || pixel.x !== center.x || pixel.y !== center.y) destination = center;
            else {
              const bump = getMouseMovementFromSelectedCell({ ...target, pressed: true }, current, path, (position) => mouseCellAllowed(current, position));
              clickedDestination.current = null;
              if (bump) dispatch({ type: "move", direction: bump.direction });
            }
            if (destination) { dx = destination.x - pixel.x; dy = destination.y - pixel.y; }
          }
          const length = Math.hypot(dx, dy);
          const to = integrator.advance(pixel, { x: dx, y: dy }, elapsed, heldShift.current.size || target?.sprint ? 256 : 128, destination);
          if (length && (to.x !== pixel.x || to.y !== pixel.y)) {
            const result = dispatch({ type: "move-pixels", to, hazardElapsedMs: now });
            if (result && "deferred" in result) { integrator.reset(); frame = requestAnimationFrame(animateMovement); return; }
            if (target && result && "state" in result && (result.state.player.x !== current.player.x || result.state.player.y !== current.player.y)) mouseTravelBudget.current--;
            if (result?.accepted && "state" in result) {
              turnPresentation.notePlayerPixelTravel(current.player, result.state.player);
              if (target) {
                const dx = result.state.player.x - current.player.x; const dy = result.state.player.y - current.player.y;
                const direction = dx === 1 && dy === 0 ? "e" : dx === -1 && dy === 0 ? "w" : dx === 0 && dy === 1 ? "s" : dx === 0 && dy === -1 ? "n" : null;
                if (direction) noteMouseScreenEdgeMove(current.player, result, direction);
              }
            }
            const blocked = !result?.accepted || ("state" in result && result.state.player.pixel?.x === pixel.x && result.state.player.pixel?.y === pixel.y);
            if (blocked) turnPresentation.stopPlayerPixelTravel();
            if (blocked && held.length && now >= nextGridStep) {
              const direction = held.at(-1)!.direction; const [ox, oy] = directions[direction];
              const x = current.player.x + ox; const y = current.player.y + oy;
              if (x !== current.player.x || y !== current.player.y) dispatch({ type: "move", direction });
              nextGridStep = now + 250;
            }
            if (result && "state" in result && result.state.player.pixel?.x === pixel.x && result.state.player.pixel?.y === pixel.y) clickedDestination.current = null;
          } else if (!length) { turnPresentation.stopPlayerPixelTravel(); if (target) clickedDestination.current = null; }
        } else if (target && now >= nextGridStep) {
          const movement = getMouseMovementFromSelectedCell({ ...target, pressed: true }, current, undefined, (position) => mouseCellAllowed(current, position));
          if (movement) {
            const [dx, dy] = directions[movement.direction as Direction]; const next = { x: current.player.x + dx, y: current.player.y + dy };
            if (mouseCellAllowed(current, next) && isMouseHazard(current.floor, next) && (next.x !== confirmedMouseHazard.current?.x || next.y !== confirmedMouseHazard.current?.y)) { warnedMouseHazard.current = next; clickedDestination.current = null; }
            else { const result = dispatch({ type: "move", direction: movement.direction }); if (result?.accepted) { mouseTravelBudget.current--; noteMouseScreenEdgeMove(current.player, result, movement.direction as Direction); } else clickedDestination.current = null; }
          }
          else clickedDestination.current = null;
          nextGridStep = now + (target.sprint ? 125 : 250);
        } else if (!target && !held.length) { integrator.reset(); turnPresentation.stopPlayerPixelTravel(); }
      } else { integrator.reset(); turnPresentation.stopPlayerPixelTravel(); }
      frame = requestAnimationFrame(animateMovement);
    };
    frame = requestAnimationFrame(animateMovement);
    return () => { cancelAnimationFrame(frame); turnPresentation.stopPlayerPixelTravel(); };
  }, [dispatch, gridlessInteractions, noteMouseScreenEdgeMove, turnPresentation]);
  const advanceMouseScreenEdge = useCallback((direction: Direction) => { mouseScreenEdgeMove.current = null; clickedDestination.current = null; return Boolean(dispatch({ type: "move", direction, hazardElapsedMs: performance.now() })?.accepted); }, [dispatch]);
  const setPreference = useCallback((change: Partial<Preferences>) => {
    if (change.muteAll !== undefined) {
      const url = new URL(window.location.href);
      if (change.muteAll) url.searchParams.set("mute", "1");
      else url.searchParams.delete("mute");
      window.history.replaceState(window.history.state, "", url.href);
      audio.setMutedByUrl(change.muteAll);
    }
    audio.setPreferences({ ...preferences, ...change });
    if (change.muteAll === false || change.musicVolume !== undefined) audio.startMusic();
    if (change.sfxVolume !== undefined || change.musicVolume !== undefined || change.muteAll !== undefined) audio.playCue("audioControl");
    setPreferences((current) => { const next = { ...current, ...change }; try { writePreferences(localStorage, next); } catch { /* session fallback */ } return next; });
  }, [audio, preferences]);
  const setZoomTest = (value: boolean) => { writeDevBoolean(DEV_SETTINGS_STORAGE_KEYS.zoomTest, value); setZoomTestState(value); if (!value) setPreference({ zoom: 1 }); };
  const stepZoom = useCallback((step: number) => { setPreferences((current) => { const presets = availableGameZoomPresets(zoomTest); const index = presets.indexOf(current.zoom); const zoom = presets[Math.max(0, Math.min(presets.length - 1, (index < 0 ? 0 : index) + step))]; const next = { ...current, zoom }; try { writePreferences(localStorage, next); } catch { /* session fallback */ } return next; }); }, [zoomTest]);
  const cycleZoom = useCallback(() => { setPreferences((current) => { const presets = availableGameZoomPresets(zoomTest); const index = presets.indexOf(current.zoom); const zoom = presets[((index < 0 ? 0 : index) + 1) % presets.length]; const next = { ...current, zoom }; try { writePreferences(localStorage, next); } catch { /* session fallback */ } return next; }); }, [zoomTest]);
  const toggleFullscreen = useCallback(async () => { const desired = !document.fullscreenElement; setPreference({ fullscreenDesired: desired }); try { if (desired) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { /* browser gesture policy */ } }, [setPreference]);
  const clearLocalStorage = useCallback(() => {
    try { clearRoguesDungeonBrowserStorage(); window.location.reload(); } catch { setSaveError("Local storage could not be cleared in this browser session."); }
  }, []);
  useEffect(() => { const sync = () => { const actual = Boolean(document.fullscreenElement); if (fullscreenStateRef.current && !actual) setPreference({ fullscreenDesired: false }); fullscreenStateRef.current = actual; setFullscreenActual(actual); }; document.addEventListener("fullscreenchange", sync); sync(); return () => document.removeEventListener("fullscreenchange", sync); }, [setPreference]);
  const cancelPointerDrag = useCallback(() => { if (pointerDragRef.current?.active) suppressSlotClickRef.current = true; pointerDragRef.current = null; setPreview(null); setDragPresentation(null); }, []);
  const closeLockbox = useCallback(() => {
    cancelPointerDrag();
    openLockboxRef.current = null; pendingLockboxRef.current = null; setOpenLockbox(null);
    if (lockboxOpenTimer.current) clearTimeout(lockboxOpenTimer.current);
    const previous = storagePanelState.current;
    if (previous) { setPrimaryInfoOpen(previous.primary); setSecondaryInfoOpen(previous.secondary); setMobilePanel(previous.mobile); storagePanelState.current = null; }
    const current = sessionRef.current?.getState();
    const trap = current?.floor.decorations?.find(entry => entry.kind === "trap" && entry.x === current.player.x && entry.y === current.player.y);
    trapStrikeRef.current = trap && current ? `${current.floor.seed}:${trap.id}:${Math.floor(performance.now() / TRAP_CYCLE_MS)}` : null;
  }, [cancelPointerDrag]);
  const storageTransfer = useCallback((source: DragSource, destination: DropDestination) => {
    const boxId = openLockboxRef.current, current = sessionRef.current?.getState(), adapter = lockboxPersistence.current;
    if (!boxId || !current || !adapter || source.kind !== "inventory" && source.kind !== "lockbox") return null;
    if (source.kind === "inventory" && (destination.kind !== "lockbox" || destination.boxId !== boxId)) return null;
    if (source.kind === "lockbox" && (source.boxId !== boxId || destination.kind !== "inventory")) return null;
    if (destination.kind !== "inventory" && destination.kind !== "lockbox" || destination.index === undefined) return null;
    return transferLockboxItem(current, adapter.getState(), boxId, source.kind, source.item.id, destination.index);
  }, []);
  const commitStorageTransfer = useCallback((source: DragSource, destination: DropDestination) => {
    const current = sessionRef.current?.getState(), adapter = lockboxPersistence.current;
    const transaction = storageTransfer(source, destination);
    if (!current || !adapter || !transaction || !sessionRef.current) return false;
    if (pixelSaveTimer.current) { clearTimeout(pixelSaveTimer.current); pixelSaveTimer.current = null; }
    try {
      const committed = sessionRef.current.commitStorage(current, transaction.campaign, () => adapter.commit(transaction.campaign, transaction.storage));
      if (committed) setSaveError("");
      return committed;
    } catch { setSaveError("Saving is unavailable in this browser session."); return false; }
  }, [storageTransfer]);
  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const handle = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-drag-kind]") : null;
    if (!campaign || !handle || event.button !== 0) return;
    const kind = handle.dataset.dragKind; const id = handle.dataset.dragId; const index = Number(handle.dataset.dragIndex);
    if (openLockboxRef.current && kind !== "inventory" && kind !== "lockbox") return;
    const item = kind === "lockbox" ? lockboxPersistence.current?.getState().containers[openLockboxRef.current ?? ""]?.find(entry => entry.id === id) : kind === "ability" ? (campaign.player.abilities[index] ? abilityItemInstance(campaign.player.abilities[index]!, `ability-${campaign.player.abilities[index]}-${index}`) : null) : kind === "quick-slot" ? campaign.player.quickSlots?.[index]?.item : campaign.player.inventory.find((entry) => entry.id === id) ?? Object.values(campaign.player.equipment).flat().find((entry) => entry?.id === id);
    if (!item) return;
    dismissTooltips();
    const source = (kind === "lockbox" ? { kind, item, boxId: handle.dataset.dragContainer } : kind === "inventory" ? { kind, item } : kind === "quick-slot" ? { kind, item, index } : { kind, item, group: handle.dataset.dragGroup, index }) as PointerSource;
    handle.setPointerCapture?.(event.pointerId);
    suppressSlotClickRef.current = false;
    pointerDragRef.current = { pointerId: event.pointerId, source, startX: event.clientX, startY: event.clientY, active: false };
    event.preventDefault();
  }, [campaign]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = pointerDragRef.current; if (!campaign || !current || event.pointerId !== current.pointerId) return;
      if (!current.active && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 6) return;
      current.active = true;
      const target = document.elementFromPoint(event.clientX, event.clientY); const drop = itemDropTarget(target, campaign); const transfer = drop && describeInventoryDrop(campaign, current.source, drop.destination, drop.targetItem);
      if (openLockboxRef.current) {
        const valid = drop && storageTransfer(current.source, drop.destination);
        setPreview(null);
        setDragPresentation({ source: current.source, item: current.source.item, x: event.clientX, y: event.clientY, destination: valid && drop ? drop.destination : null });
        return;
      }
      if (current.source.kind === "inventory" || current.source.kind === "slot") setPreview((transfer || null)?.preview ?? null); else setPreview(null);
      setDragPresentation({ source: current.source, item: current.source.item, x: event.clientX, y: event.clientY, destination: (transfer || null)?.destination ?? null });
    };
    const finish = (event: PointerEvent) => {
      const current = pointerDragRef.current; if (!campaign || !current || event.pointerId !== current.pointerId) return;
      if (current.active && event.type === "pointerup") {
        const target = document.elementFromPoint(event.clientX, event.clientY); const drop = itemDropTarget(target, campaign); const transfer = drop && describeInventoryDrop(campaign, current.source, drop.destination, drop.targetItem);
        if (openLockboxRef.current) {
          if (target?.closest(".lockbox-window .dialog_close")) { closeLockbox(); return; }
          audio.playDropResult(Boolean(drop && commitStorageTransfer(current.source, drop.destination)));
          cancelPointerDrag(); return;
        }
        const action = (transfer || null)?.action ?? null;
         if (action) { const result = dispatch(action); if (!result?.events.length) audio.playDropResult(Boolean(result?.accepted)); if (result?.accepted) { const transferDestination = transfer && typeof transfer === "object" ? transfer.destination : null; if (transferDestination) shineSlots(shineKeysForDestination(transferDestination, current.source.kind === "ability" ? undefined : current.source.item)); else if (action.type === "assign-ability") shineSlot(`ability:${action.to}`); } }
        else if (drop) audio.playDropResult(false);
      }
      cancelPointerDrag();
    };
    const pointerCancel = () => cancelPointerDrag(); const cancel = (event: KeyboardEvent) => { if (event.key === "Escape" && pointerDragRef.current) { event.preventDefault(); cancelPointerDrag(); } };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", pointerCancel); window.addEventListener("keydown", cancel);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", pointerCancel); window.removeEventListener("keydown", cancel); };
  }, [audio, campaign, cancelPointerDrag, closeLockbox, commitStorageTransfer, dispatch, shineSlot, shineSlots, storageTransfer]);
  useEffect(() => {
    const editable = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']"));
    const clearHeldInput = () => { clickedDestination.current = null; heldMovements.current.clear(); heldShift.current.clear(); syncMovement(); };
    const blur = () => { physicalMovementKeys.current.clear(); clearHeldInput(); };
    const down = (event: KeyboardEvent) => {
      const movement = getMovementKey(event);
      const alreadyHeld = movement ? physicalMovementKeys.current.has(movement.code) : false;
      if (movement) physicalMovementKeys.current.add(movement.code);
      if (!worldAlive || settings || confirmingSaveAndExit || progressionDialogOpen || !worldInputEnabled || editable(event.target)) return;
      if (movement) { event.preventDefault(); if (event.repeat || alreadyHeld) return; clickedDestination.current = null; warnedMouseHazard.current = null; confirmedMouseHazard.current = null; claimMovement(heldMovements.current, movement.code, movement.direction); syncMovement(); return; }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") { event.preventDefault(); const oldSprint = heldShift.current.size > 0; heldShift.current.add(event.code); if (!oldSprint) syncMovement(true, true); return; }
      if (!event.repeat && event.code === "KeyT") { event.preventDefault(); setDungeonTheme((theme) => theme === 1 ? 2 : theme === 2 ? 3 : 1); return; }
      if (!event.repeat && /^Digit[1-3]$/.test(event.code || "")) { event.preventDefault(); dispatch({ type: "ability", index: Number(event.code.slice(-1)) - 1 }); }
      else if (!event.repeat && /^[1-3]$/.test(event.key)) { event.preventDefault(); dispatch({ type: "ability", index: Number(event.key) - 1 }); }
      else if (!event.repeat && /^[QE]$/i.test(event.key)) { event.preventDefault(); dispatch({ type: "use-quick-slot", index: event.key.toUpperCase() === "Q" ? 0 : 1 }); }
      else if (!event.repeat && /^[X]$/i.test(event.key)) { event.preventDefault(); dispatch({ type: "wait" }); }
      else if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && (event.code === "KeyV" || /^v$/i.test(event.key))) { event.preventDefault(); dispatch({ type: "toggle-sneak" }); }
    };
    const up = (event: KeyboardEvent) => {
      if (getMovementKey(event)) { const { code } = getMovementKey(event)!; physicalMovementKeys.current.delete(code); if (heldMovements.current.delete(code)) syncMovement(false); }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") { const oldSprint = heldShift.current.size > 0; heldShift.current.delete(event.code); if (oldSprint !== (heldShift.current.size > 0)) syncMovement(false); }
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    if (settings || confirmingSaveAndExit || progressionDialogOpen || !worldInputEnabled) clearHeldInput();
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [confirmingSaveAndExit, dispatch, progressionDialogOpen, settings, syncMovement, worldInputEnabled, worldAlive]);
  useGamepadMovement(
    worldAlive && worldInputEnabled && !settings && !progressionDialogOpen,
    `${preferences.movementMode}:${campaign?.floor.seed}:${campaign?.floor.level}:${campaign?.activePrefab?.id}:${campaign ? gameMode(campaign) : ""}`,
    (direction) => {
      const released = heldMovements.current.delete("gamepad");
      if (direction) {
        clickedDestination.current = null; warnedMouseHazard.current = null; confirmedMouseHazard.current = null;
        claimMovement(heldMovements.current, "gamepad", direction);
      }
      if (direction || released) syncMovement(Boolean(direction));
    },
  );
  const begin = (id: string, repairedFloor: Floor | null = null, attributes?: Attributes, previewedWorld?: Campaign, override?: Campaign) => {
    if (deathRecapTimer.current) { clearTimeout(deathRecapTimer.current); deathRecapTimer.current = null; }
    setDeathSequence(null);
    const unsavedUrlRun = urlOptions.hasCompleteRunIdentity || overworldPreview || performanceSession.current.active;
    const targetSlot = urlOptions.hasCompleteRunIdentity ? urlOptions.slot! : id;
    openLockboxRef.current = null; pendingLockboxRef.current = null; setOpenLockbox(null);
    if (lockboxOpenTimer.current) clearTimeout(lockboxOpenTimer.current);
    try { lockboxPersistence.current = createLockboxPersistence(unsavedUrlRun ? null : localStorage, targetSlot); }
    catch { setSaveError("Saving is unavailable in this browser session."); return; }
    let existing: Campaign | null = null;
    try { if (!unsavedUrlRun && !override) existing = readSlot(localStorage, targetSlot); }
    catch { setSaveError("This saved game is unavailable. Its data was left unchanged."); setSummaries(readSlotSummary(localStorage)); return; }
    floatingTimers.current.forEach(clearTimeout); floatingTimers.current.clear();
    resourceChangeEffectTimers.current.forEach(clearTimeout); resourceChangeEffectTimers.current.clear();
    setFloatingFeedback([]); setResourceChangeEffects([]); setParticleEffects([]); setItemThrows([]); setSelectedGridSpot(null);
    if (preferences.fullscreenDesired && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    const objectTest = itemTest || urlOptions.level1ObjectTestMode;
    const enemyTestMode = enemyTest || urlOptions.level1EnemyTestMode;
    const freshTestCampaign = () => {
      if (previewedWorld) return previewedWorld;
      const worldSeed = urlOptions.hasCompleteRunIdentity ? urlOptions.seed! : urlOptions.seed ?? randomSeed ?? readWorldSeed(localStorage);
      return createRunCampaign(worldSeed, Number(targetSlot), urlOptions.run, urlOptions.level, urlOptions.level, { level1TestMode: levelTest, level1ObjectTestMode: objectTest, level1EnemyTestMode: enemyTestMode, attributes, worldAttributes: levelTest ? existing?.worldAttributes ?? DEFAULT_WORLD_ATTRIBUTES : undefined, worldFamily: urlOptions.worldFamily });
    };
    const initial = override ?? (unsavedUrlRun || levelTest || objectTest || enemyTestMode ? freshTestCampaign() : existing ?? freshTestCampaign());
    if (overworldPreview) revealDiscovery(initial, { x: (initial.floor.width - 1) / 2, y: (initial.floor.height - 1) / 2 }, Math.hypot(initial.floor.width, initial.floor.height));
    if (!override && (!existing || unsavedUrlRun || levelTest || objectTest || enemyTestMode)) initial.world = urlOptions.world === 1 ? "One" : String(urlOptions.world);
    const scenario = urlOptions.mapFix ? getManualTileScenario(urlOptions.scenario) : null;
    const manualFloor = scenario ? buildManualTileScenario(scenario.name, randomSeed ?? 13579, urlOptions.level) : null;
    if (manualFloor && !repairedFloor && !override) {
      initial.floor = structuredClone(manualFloor); initial.player.x = manualFloor.start.x; initial.player.y = manualFloor.start.y; initial.realm = `Debug ${manualFloor.scenario}`;
    }
    if (repairedFloor) {
      initial.floor = structuredClone(repairedFloor); initial.player.x = repairedFloor.start.x; initial.player.y = repairedFloor.start.y; initial.realm = `Underground ${repairedFloor.level}`;
    }
    if (!override && !enemyTestMode && (initial.floor.level ?? initial.floor.depth ?? 1) === 1) {
      const withoutEnemyFixtures = initial.floor.entities.filter((entity) => !(entity.kind === "enemy" && entity.id.startsWith("test-")));
      if (withoutEnemyFixtures.length !== initial.floor.entities.length) {
        initial.floor.entities = withoutEnemyFixtures;
        if (initial.floors?.["1"]) initial.floors["1"].entities = initial.floors["1"].entities.filter((entity) => !(entity.kind === "enemy" && entity.id.startsWith("test-")));
      }
    }
    if (!override && !unsavedUrlRun && !existing) {
      try { if (!unsavedUrlRun) { writeSlot(localStorage, targetSlot, initial); setSummaries(readSlotSummary(localStorage)); audio.playEvents([{ type: "campaign.save.succeeded", facts: {} }]); } }
      catch { setSaveError("Saving is unavailable in this browser session."); audio.playEvents([{ type: "campaign.save.failed", facts: {} }]); return; }
    }
    if (!unsavedUrlRun) prepareCampaignSave(initial);
    const session = createGameSession(initial, {
      getInputPaused: () => Boolean(openLockboxRef.current),
      reconcileRecovery: recovered => reconcileLockboxRecovery(recovered, lockboxPersistence.current!.getState()),
      getSimulationFrozen: () => performanceSession.current.active && performanceOptions().simulation === "frozen",
      getEnemyLogicDisabled: () => performanceSession.current.active && !performanceOptions().enemyLogic,
      onCommit: (result) => {
        if (performanceSession.current.active) return;
        if (pixelSaveTimer.current) { clearTimeout(pixelSaveTimer.current); pixelSaveTimer.current = null; }
        if (!unsavedUrlRun && result.ticks === 0 && result.events.some((event) => event.type === "action.committed" && event.facts.actionType === "move-pixels")) {
          if (!unsavedUrlRun) pixelSaveTimer.current = setTimeout(() => { if (sessionRef.current !== session) return; try { writeSlot(localStorage, targetSlot, session.getState()); session.publish("campaign.save.succeeded"); } catch { setSaveError("Saving is unavailable in this browser session."); session.publish("campaign.save.failed"); } }, 150);
          return;
        }
        try {
          if (!unsavedUrlRun) {
            if (result.recovery === null) deleteSlot(localStorage, targetSlot);
            else if (!unsavedUrlRun) writeSlot(localStorage, targetSlot, result.recovery ?? result.state);
            setSummaries(readSlotSummary(localStorage));
            session.publish("campaign.save.succeeded");
          }
          setSaveError("");
        }
        catch (error) { setSaveError("Saving is unavailable in this browser session."); session.publish("campaign.save.failed", { message: error instanceof Error ? error.message : String(error) }); }
      },
    });
    campaignRef.current = null;
    session.subscribe((result) => {
      const storageEvent = result.events.find(event => event.type === "lockbox.opened");
      if (storageEvent?.facts.id) {
        const boxId = storageEvent.facts.id;
        pendingLockboxRef.current = boxId;
        clickedDestination.current = null; heldMovements.current.clear(); heldShift.current.clear();
        const generation = sessionGenerationRef.current;
        const openWhenSettled = () => {
          if (sessionGenerationRef.current !== generation || pendingLockboxRef.current !== boxId || session.getState().player.resources.health.current <= 0) return;
          if (abilityTimers.current.size) { lockboxOpenTimer.current = setTimeout(openWhenSettled, 30); return; }
          storagePanelState.current = { ...panelState.current };
          setPrimaryInfoOpen(true); setMobilePanel("info"); setExpandedPanelOpen(false);
          openLockboxRef.current = boxId; pendingLockboxRef.current = null;
          setOpenLockbox(boxId);
        };
        openWhenSettled();
      }
      audio.playEvents(result.events.filter((event) => event.type !== "xp.level.changed" && !(event.type === "resource.changed" && event.facts.cause === "campfire-rest")));
      if (!result.accepted && !result.system && !result.events.some((event) => event.type === "quick-slot.use.rejected")) return;
      const levelEvents = result.events.filter((event) => event.type === "xp.level.changed");
      const openedContainer = result.events.find((event) => (event.type === "chest.opened" || event.type === "crate.opened") && typeof event.facts.id === "string" && event.facts.position && typeof event.facts.position === "object")?.facts;
      if (openedContainer?.id && openedContainer.position && typeof openedContainer.position === "object") {
        const origin = openedContainer.position as { x: number; y: number };
        const items = result.state.floor.entities
          .filter((entity) => entity.kind === "gold" && (entity.id.startsWith(`chest-gold-${openedContainer.id}-`) || entity.id.startsWith(`crate-gold-${openedContainer.id}-`)))
          .map((coin) => ({ id: coin.id, kind: "gold" as const, destination: { x: coin.x, y: coin.y } }));
        setItemThrows(throwItems(origin, items));
        const timer = setTimeout(() => { abilityTimers.current.delete(timer); setItemThrows([]); }, ITEM_THROW_DURATION_MS);
        abilityTimers.current.add(timer);
      }
      const split = result.events.find((event) => event.type === "enemy.split" && typeof event.facts.id === "string" && event.facts.position && typeof event.facts.position === "object" && Array.isArray(event.facts.childIds))?.facts;
      if (split?.id && split.position && typeof split.position === "object" && split.childIds) {
        const origin = split.position as { x: number; y: number };
        const childIds = new Set(split.childIds);
        const items = result.state.floor.entities.filter((entity) => entity.kind === "enemy" && childIds.has(entity.id)).map((child) => ({ id: `split-burst-${child.id}`, kind: "gold", destination: { x: child.x, y: child.y } }));
        setItemThrows(throwItems(origin, items));
        const timer = setTimeout(() => { abilityTimers.current.delete(timer); setItemThrows([]); }, ITEM_THROW_DURATION_MS);
        abilityTimers.current.add(timer);
      }
      const droppedItems = result.events
        .filter((event) => event.type === "item.dropped" && event.facts.destination && typeof event.facts.destination === "object" && typeof event.facts.itemId === "string")
        .map((event) => {
          const destination = event.facts.destination as { x: number; y: number };
          const entity = result.state.floor.entities.find((entry): entry is Extract<Entity, { kind: "item" }> => entry.kind === "item" && entry.item.id === event.facts.itemId);
          return entity ? { id: entity.id, ...worldPickupPresentation(entity), itemName: entity.item.name, destination } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      if (droppedItems.length) {
        setItemThrows(throwItems({ x: result.state.player.x, y: result.state.player.y }, droppedItems));
        const timer = setTimeout(() => { abilityTimers.current.delete(timer); setItemThrows([]); }, ITEM_THROW_DURATION_MS);
        abilityTimers.current.add(timer);
      }
      const playerTookDamage = result.events.some((event) => event.type === "resource.changed" && event.facts.resource === "health" && event.facts.current! < event.facts.previous!);
      if (playerTookDamage) turnPresentation.beginDamageReaction("player", performance.now());
      if (result.events.some((event) => event.type === "resource.changed" && event.facts.resource === "health" && event.facts.cause === "enemy-attack" && event.facts.current! < event.facts.previous!)) setCameraAnimationToken((token) => token + 1);
      for (const event of result.events) if (event.type === "item.collected" && typeof event.facts.itemId === "string") collectedItemIdsRef.current.add(event.facts.itemId);
      const moved = result.events.find((event) => event.type === "player.moved" && typeof event.facts.from === "object" && event.facts.from !== null);
      if (moved) {
        const puff = createSmokePuff(moved.facts.from as { x: number; y: number });
        setParticleEffects((current) => [...current.filter((effect) => !particleExpired(effect)), puff]);
        setTimeout(() => setParticleEffects((current) => current.filter((effect) => effect.id !== puff.id)), smokePuffDurationMs);
      }
      const damageParticles = projectDamageParticles(result.events);
      if (damageParticles.length) {
        setParticleEffects((current) => [...current.filter((effect) => !particleExpired(effect)), ...damageParticles]);
        const timer = setTimeout(() => {
          abilityTimers.current.delete(timer);
          const ids = new Set(damageParticles.map((effect) => effect.id));
          setParticleEffects((current) => current.filter((effect) => !ids.has(effect.id)));
        }, particleDurationMs(damageParticles[0]!));
        abilityTimers.current.add(timer);
      }
      const levelsGained = levelEvents.length;
      if (levelsGained) {
        const origin = result.state.player;
        const sparkles = createLevelUpSparkles(origin, levelsGained);
        setParticleEffects((current) => [...current.filter((effect) => !particleExpired(effect)), ...sparkles]);
        const generation = sessionGenerationRef.current;
        const timer = setTimeout(() => { abilityTimers.current.delete(timer); if (sessionGenerationRef.current !== generation) return; const ids = new Set(sparkles.map((effect) => effect.id)); setParticleEffects((current) => current.filter((effect) => !ids.has(effect.id))); audio.playEvents(levelEvents); }, Math.max(...sparkles.map((effect) => effect.startedAt + particleDurationMs(effect))) - performance.now());
        abilityTimers.current.add(timer);
      }
      result.state.log = projectLogEvents(result.state.log, result.events);
      const feedback = projectFloatingFeedback(result.events);
      if (feedback.length) {
        setFloatingFeedback((current) => [...current, ...feedback].slice(-24));
        for (const effect of feedback) {
          const timer = setTimeout(() => { setFloatingFeedback((current) => removeFloatingFeedback(current, effect.id)); floatingTimers.current.delete(effect.id); }, effect.duration);
          floatingTimers.current.set(effect.id, timer);
        }
      }
      const resourceEffects = projectResourceChangeEffects(result.events);
      if (resourceEffects.length) {
        setResourceChangeEffects((current) => [...current, ...resourceEffects]);
        for (const effect of resourceEffects) {
          clearTimeout(resourceChangeEffectTimers.current.get(effect.id));
          const timer = setTimeout(() => { setResourceChangeEffects((current) => removeResourceChangeEffect(current, effect.id)); resourceChangeEffectTimers.current.delete(effect.id); }, effect.duration);
          resourceChangeEffectTimers.current.set(effect.id, timer);
        }
      }
      for (const event of result.events) {
        const facts = event.facts;
        if ((event.type === "resource.changed" && facts.current! > facts.previous!) || (event.type === "xp.gained" && facts.current! > facts.previous!)) {
          const name = event.type === "xp.gained" ? "xp" : facts.resource!;
          setGains((current) => ({ ...current, [name]: { from: facts.previous!, to: facts.current!, max: facts.currentMax ?? (name === "xp" ? undefined : initial.progression.attributes[name]) ?? 100 } }));
          clearTimeout(gainTimers.current.get(name));
          gainTimers.current.set(name, setTimeout(() => setGains((current) => { const next = { ...current }; delete next[name]; return next; }), 420));
        }
      }
      if (result.events.some((event) => event.type === "player.died")) {
        gridlessInteractions.cancel(result.state);
        sessionGenerationRef.current++;
        abilityTimers.current.forEach(clearTimeout); abilityTimers.current.clear();
        setParticleEffects([]); setItemThrows([]); setFloatingFeedback([]); setResourceChangeEffects([]); setCampfireMenu(null); setSelectedGridSpot(null);
        sessionRef.current = null;
        turnPresentation.reset(result.state);
        setDeathSequence({ fatal: structuredClone(result.state), recovery: result.recovery ?? null, lines: selectDeathRecapLines(result.events) });
        setCampaign(result.state);
        return;
      }
      setCampaign(result.state);
    });
    turnPresentation.reset(initial);
    sessionRef.current = session; setSlot(targetSlot); setCampaign(initial);
  };
  const recoverFromDeath = () => {
    if (!deathRecap?.recovery || !slot) return;
    const recovery = deathRecap.recovery;
    const targetSlot = slot;
    returnToMainMenu();
    // Restart the renderer even when the recovered map has the same identity.
    // Its death animation, camera, fog field, and reveal transition start fresh.
    setPerformanceEpoch(value => value + 1);
    begin(targetSlot, null, undefined, undefined, recovery);
  };
  const installPerformanceCampaign = (next: Campaign) => {
    const targetSlot = slot ?? "1";
    if (pixelSaveTimer.current) { clearTimeout(pixelSaveTimer.current); pixelSaveTimer.current = null; }
    returnToMainMenu(); clickedDestination.current = null; mouseScreenEdgeMove.current = null;
    setPerformanceError(""); setPerformanceEpoch(value => value + 1);
    begin(targetSlot, null, undefined, undefined, next);
  };
  restorePerformanceRef.current = () => {
    const reference = performanceSession.current.exit();
    resetPerformanceOptions();
    if (reference) installPerformanceCampaign(reference);
  };
  const enterPerformance = () => {
    const current = sessionRef.current?.getState(); if (!current) return;
    const next = performanceSession.current.enter(current);
    setPerformanceOptions({ enabled: true });
    setPrimaryInfoOpen(true);
    if (orientation === "portrait") setMobilePanel("info");
    installPerformanceCampaign(next);
  };
  const regeneratePerformance = (size: number) => {
    try { if (sessionRef.current?.getState().activePrefab) throw new Error("Leave the authored interior before regenerating."); installPerformanceCampaign(performanceSession.current.regenerate(size)); }
    catch (error) { setPerformanceError(error instanceof Error ? error.message : String(error)); }
  };
  const startEnemyScenario = () => {
    if (!performanceSession.current.active) return;
    try {
      const next = performanceSession.current.enemyScenario();
      setPerformanceOptions({ enabled: true, local: false, animated: true, dynamic: true, minimap: "live", simulation: "live" });
      installPerformanceCampaign(next);
    }
    catch (error) { setPerformanceError(error instanceof Error ? error.message : String(error)); }
  };
  useEffect(() => { if ((urlOptions.hasCompleteRunIdentity || overworldPreview) && !urlRunStarted.current && !campaign && !slot) { urlRunStarted.current = true; begin(urlOptions.slot ?? "1"); } }, [campaign, overworldPreview, slot, urlOptions]);
  const measureMenuDialogBounds = useCallback(() => {
    const menu = document.querySelector(".main-menu-window");
    return menu ? dialogBounds(menu) : null;
  }, []);
  const beginFromMenu = (id: string, origin?: Element | null) => {
    if (menuExiting) return;
    const entry = summaries.find((summary) => summary.slot === id);
    if (!entry?.occupied) { creationBoundsRef.current = origin ? dialogBounds(origin.closest(".main-menu-window")!) : null; setMenuDialogBounds(creationBoundsRef.current); setModeSelectionSlot(id); return; }
    setMenuExiting(true);
    pendingMenuStartRef.current = () => begin(id);
  };
  const completeMenuExit = useCallback(() => {
    const start = pendingMenuStartRef.current;
    pendingMenuStartRef.current = null;
    if (start) window.setTimeout(start, 100);
  }, []);
  const [mapFixError, setMapFixError] = useState("");
  const importRepairMap = async (file?: File) => {
    if (!file || !campaign || !urlOptions.mapFix) return;
    try { const repaired = floorFromTiledRepairMap(JSON.parse(await file.text()), campaign.floor); begin(slot ?? urlOptions.slot ?? "1", repaired); setMapFixError(""); }
    catch (error) { setMapFixError(error instanceof Error ? error.message : String(error)); }
  };
  const directSlotStarted = useRef(false);
  useEffect(() => { if (!urlOptions.slot || directSlotStarted.current) return; directSlotStarted.current = true; begin(urlOptions.slot); }, [urlOptions.slot]);
  const urlRepairLoaded = useRef(false);
  useEffect(() => {
    if (!urlOptions.mapFix || !urlOptions.map || !campaign || urlRepairLoaded.current) return;
    urlRepairLoaded.current = true;
    fetch(urlOptions.map).then((response) => { if (!response.ok) throw new Error(`Could not load repaired map (${response.status}).`); return response.json(); }).then((map) => {
      const repaired = floorFromTiledRepairMap(map, campaign.floor); begin(slot ?? urlOptions.slot ?? "1", repaired); setMapFixError("");
    }).catch((error) => setMapFixError(error.message));
  }, [campaign, slot, urlOptions.map, urlOptions.mapFix, urlOptions.slot]);
  const newGameLabel = randomSeed === null ? "New Game" : `New Game · Seed ${randomSeed}`;
  useEffect(() => {
    if (campaign || (!settings && !creationSlot && !worldCreation && !howToPlay)) return undefined;
    const sync = () => {
      const bounds = measureMenuDialogBounds();
      if (!bounds) return;
      setMenuDialogBounds(bounds);
      settingsBoundsRef.current = settings ? bounds : settingsBoundsRef.current;
      creationBoundsRef.current = creationSlot || worldCreation ? bounds : creationBoundsRef.current;
      helpBoundsRef.current = howToPlay ? bounds : helpBoundsRef.current;
    };
    const menu = document.querySelector(".main-menu-window");
    const observer = menu ? new ResizeObserver(sync) : null;
    observer?.observe(menu!);
    const viewport = document.getElementById("viewport");
    if (viewport) observer?.observe(viewport);
    window.addEventListener("resize", sync);
    document.addEventListener("fullscreenchange", sync);
    sync();
    const frame = requestAnimationFrame(sync);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", sync); document.removeEventListener("fullscreenchange", sync); };
  }, [campaign, creationSlot, howToPlay, measureMenuDialogBounds, modeSelectionSlot, orientation, settings, worldCreation]);
  const measureGameSettingsCenter = useCallback(() => {
    const view = document.querySelector(".world-view-region");
    if (!view) return null;
    const bounds = dialogBounds(view);
    return { left: bounds.left + bounds.width / 2, top: bounds.top + bounds.height / 2 };
  }, []);
  useLayoutEffect(() => {
    if (!openLockbox) return;
    const view = document.querySelector(".world-view-region");
    const update = () => setGameSettingsCenter(measureGameSettingsCenter());
    update();
    const observer = new ResizeObserver(update);
    if (view) observer.observe(view);
    window.addEventListener("resize", update); document.addEventListener("fullscreenchange", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); document.removeEventListener("fullscreenchange", update); };
  }, [openLockbox, orientation, measureGameSettingsCenter]);
  const completePlayerDeathAnimation = useCallback(() => {
    if (!deathSequence || deathRecapTimer.current) return;
    deathRecapTimer.current = setTimeout(() => {
      deathRecapTimer.current = null;
      setGameSettingsCenter(measureGameSettingsCenter());
      setDeathRecap(deathSequence);
      setDeathSequence(null);
    }, 1000);
  }, [deathSequence, measureGameSettingsCenter]);
  const openGameSettings = useCallback(() => { if (openLockboxRef.current) return; setGameSettingsCenter(measureGameSettingsCenter()); setSettings(true); }, [measureGameSettingsCenter]);
  const requestSaveAndQuit = useCallback(() => { if (openLockboxRef.current) return; setGameSettingsCenter(measureGameSettingsCenter()); setConfirmingSaveAndExit(true); }, [measureGameSettingsCenter]);
  useEffect(() => {
    if (!campaign || (!settings && !confirmingSaveAndExit && !progressionDialogOpen)) return undefined;
    const sync = () => setGameSettingsCenter(measureGameSettingsCenter());
    const view = document.querySelector(".world-view-region");
    const observer = view ? new ResizeObserver(sync) : null;
    observer?.observe(view!);
    const keydown = (event: KeyboardEvent) => { if (event.key.toLowerCase() === "c") requestAnimationFrame(sync); };
    window.addEventListener("resize", sync); document.addEventListener("fullscreenchange", sync); window.addEventListener("keydown", keydown);
    sync();
    return () => { observer?.disconnect(); window.removeEventListener("resize", sync); document.removeEventListener("fullscreenchange", sync); window.removeEventListener("keydown", keydown); };
  }, [campaign, confirmingSaveAndExit, measureGameSettingsCenter, progressionDialogOpen, settings]);
  const uiCampaign = useMemo(() => pendingUiCredits[0]?.previous ?? campaign, [campaign, pendingUiCredits]);
    if (worldCreation && !campaign) return <><MenuScreen onReady={setMenuAssetsReady}>{null}</MenuScreen><CreateWorldWindow attributes={worldCreation.attributes} preview={worldCreation.preview} identity={worldCreation.identity} bounds={menuDialogBounds ?? creationBoundsRef.current} onRandomize={() => audio.playCue("diceRoll")} onRoll={() => {
      const attributes = rollWorldAttributes();
      const { identity, character, mode } = worldCreation;
      const preview = createRunCampaign(identity.seed, identity.slot, identity.run, 1, identity.level, { worldAttributes: attributes, attributes: character, mode });
      setWorldCreation({ ...worldCreation, attributes, preview });
    }} onClose={() => { setCreationSlot(String(worldCreation.identity.slot)); setCreationAttributes(worldCreation.character); setCreationMode(worldCreation.mode); setWorldCreation(null); }} onConfirm={() => {
      if (!worldCreation.preview) return;
      const preview = worldCreation.preview; setWorldCreation(null); setCreationAttributes(null); setMenuExiting(true);
      pendingMenuStartRef.current = () => begin(String(worldCreation.identity.slot), null, worldCreation.character, preview);
      window.setTimeout(completeMenuExit, 100);
    }} /></>;
    if (!campaign) return <><MenuScreen onReady={setMenuAssetsReady}>{menuAssetsReady && <MainMenuWindow exiting={menuExiting} onExitComplete={completeMenuExit} footer={<><Tooltip content="Open game settings."><button tabIndex={-1} className="main-menu-window__settings" type="button" onClick={() => { const bounds = measureMenuDialogBounds(); settingsBoundsRef.current = bounds; setMenuDialogBounds(bounds); setSettings(true); }}>Settings</button></Tooltip><Tooltip content="Toggle Fullscreen"><button tabIndex={-1} className="main-menu-window__fullscreen" type="button" aria-label="Toggle Fullscreen" aria-pressed={fullscreenActual} onClick={toggleFullscreen}><span className="title-bar__icon title-bar__icon--fullscreen" aria-hidden="true">⛶</span></button></Tooltip></>}><h1 className="visually-hidden">Rogue's Dungeon</h1><h2 id="main-menu-window__heading">Start Game</h2><p className="body_text main-menu-window__intro">Choose a save slot.<br />Progress saves automatically.</p><div className="main-menu-window__saved-game-list" aria-labelledby="main-menu-window__heading">{summaries.map((entry) => <Tooltip key={entry.slot} content={entry.invalid ? `Saved Game ${entry.slot} is unavailable.` : entry.occupied ? `Continue Saved Game ${entry.slot}.` : `Start a new game in Saved Game ${entry.slot}.`}><button tabIndex={-1} disabled={entry.invalid} onClick={(event) => beginFromMenu(entry.slot, event.currentTarget)}><b>Saved Game {entry.slot}</b><span>{entry.invalid ? "Unavailable" : entry.occupied ? "Level " + String(entry.level).padStart(2, "0") + " · XP " + String(entry.xpLevel).padStart(2, "0") + " · " + formatSavedAgo(entry.savedAt, summaryNow) : newGameLabel}</span></button></Tooltip>)}</div>{saveError && <p role="alert">{saveError}</p>}</MainMenuWindow>}</MenuScreen>{modeSelectionSlot && <SelectModeWindow bounds={menuDialogBounds ?? creationBoundsRef.current} onClose={() => setModeSelectionSlot(null)} onConfirm={(mode) => { setModeSelectionSlot(null); setCreationMode(mode); setCreationSlot(modeSelectionSlot); setCreationAttributes(null); }} />}{creationSlot && <CreateCharacterWindow attributes={creationAttributes} bounds={menuDialogBounds ?? creationBoundsRef.current} onRandomize={() => audio.playCue("diceRoll")} onRoll={() => setCreationAttributes(rollStartingAttributes())} onClose={() => { setCreationSlot(null); setCreationAttributes(null); setCreationMode(null); }} onConfirm={() => { if (!creationAttributes || !creationMode) return; const id = creationSlot; const identity = { world: 1, level: 1, run: 1, slot: Number(id), seed: randomSeed ?? readWorldSeed(localStorage) }; setCreationSlot(null); setWorldCreation({ identity, character: { ...creationAttributes }, mode: creationMode, attributes: null, preview: null }); }} />}{settings && <SettingsWindow origin="menu" bounds={menuDialogBounds ?? settingsBoundsRef.current} onClose={() => setSettings(false)} onOpenHowToPlay={(bounds) => { helpBoundsRef.current = bounds; setHowToPlay(true); }} helpOpen={howToPlay} onSaveAndQuit={() => setSettings(false)} onClearLocalStorage={clearLocalStorage} onFullscreen={toggleFullscreen} fullscreenActual={fullscreenActual} preferences={preferences} setPreference={setPreference} mutedByUrl={audio.hardMuted} />}{howToPlay && <HowToPlayWindow origin="menu" bounds={helpBoundsRef.current} onClose={() => setHowToPlay(false)} />}</>;
  const activeUiCampaign = uiCampaign ?? campaign;
  const togglePerformance = () => { if (performanceSession.current.active) restorePerformanceRef.current(); else enterPerformance(); };
  const performancePanel = canOverride && performanceSession.current.active ? <PerformanceControls campaign={campaign} exit={() => restorePerformanceRef.current()} regenerate={regeneratePerformance} enemyScenario={startEnemyScenario} setEnemyLogic={(enabled) => { if (!performanceSession.current.active) return; if (!enabled) turnPresentation.settleEnemies(sessionRef.current?.getState() ?? campaign); setPerformanceOptions({ enemyLogic: enabled }); }} error={performanceError} /> : null;
  return <GameScreen storageOpen={Boolean(openLockbox)} orientation={orientation} onPointerDown={handlePointerDown} onClickCapture={(event) => { if (suppressSlotClickRef.current && event.target instanceof Element && event.target.closest(".slot_item")) { event.preventDefault(); event.stopPropagation(); suppressSlotClickRef.current = false; } }}>
    <TitleBar campaign={campaign} visibleCounters={pendingUiCredits[0]?.previous.counters} preferences={preferences} setPreference={setPreference} onFullscreen={toggleFullscreen} onSettings={openGameSettings} onSaveAndQuit={requestSaveAndQuit} fullscreenActual={fullscreenActual} zoomTest={zoomTest} />
    {urlOptions.mapFix && <MapFixControls campaign={campaign} slot={slot} onImport={importRepairMap} error={mapFixError} />}
    {canOverride && mapTest && <MapTestControls campaign={campaign} />}
    <Profiler id="game-world" onRender={(_id, _phase, actualDuration) => timePerformance("React commit", actualDuration)}><section className="game-screen__middle" data-primary-open={primaryInfoOpen} data-secondary-open={secondaryInfoOpen}><WorldViewRegion primaryOpen={primaryInfoOpen} secondaryOpen={secondaryInfoOpen} dimmed={expandedPanelOpen || Boolean(openLockbox)}><BabylonWorld key={performanceEpoch} renderTestMode={renderTestMode} campaign={campaign} theme={dungeonTheme} gameViewShader={gameViewShader} zoom={preferences.zoom} camera={preferences.camera} cameraAnimationToken={cameraAnimationToken} playerDeathAnimation={Boolean(deathSequence)} stairDepartureStartedAt={stairDepartureStartedAt} teleportDepartureRequested={teleportDepartureRequested} onTeleportDepartureComplete={completeTeleportDeparture} mouseInteraction={worldInputEnabled && !settings && !progressionDialogOpen} mouseScreenEdgeTarget={worldInputEnabled ? mouseScreenEdgeMove.current?.target ?? null : null} mouseDirection={mouseDirection} showPivotPoints={showPivotPoints} floatingFeedback={floatingFeedback} resourceChangeEffects={resourceChangeEffects} particleEffects={particleEffects} itemThrows={itemThrows} uiAnimations={uiAnimations} selectedCell={selectedGridSpot} selectedCellReachable={selectedCellReachable} mousePath={selectedMousePath} campfireMenu={campfireMenu} campfireRestConfirming={campfireRestConfirming} campfireRestTransition={campfireRestTransition} turnPresentation={turnPresentation} onCampfireRestReplenish={completeCampfireRest} movementPrompts={movementPrompts} onCampfireMenuCancelled={() => setCampfireMenu(null)} onCampfireRestRequested={confirmCampfireRest} onSelectedCellChange={setSelectedGridSpot} onSelectedCellClick={activateSelectedCell} onMouseScreenEdgeAdvance={advanceMouseScreenEdge} onWorldAliveChange={handleWorldAliveChange} onPlayerDeathAnimationComplete={completePlayerDeathAnimation} onStairDepartureComplete={completeStairDeparture} onStairDescentStep={playStairDescentStep} onWallAdjacentBarrelOffscreen={(setId) => Boolean(dispatch({ type: "return-barrel", setId })?.accepted)} onUiAnimationRest={restUiAnimation} onUiAnimationComplete={completeUiAnimation} onFpsChange={canOverride ? fps.publish : undefined} onZoom={stepZoom} onToggleZoom={cycleZoom} /><EquipmentComparison campaign={campaign} drag={dragPresentation} /></WorldViewRegion>{orientation === "landscape" && (<InformationPanels renderTestMode={renderTestMode} primaryOverlay={!openLockbox && orientation === "landscape" ? performancePanel : null} key={performanceEpoch} campaign={activeUiCampaign} theme={dungeonTheme} dispatch={dispatch} drag={dragPresentation} preview={preview} gains={gains} cooldowns={abilityCooldowns} shineTokens={shineTokens} primaryOpen={primaryInfoOpen} secondaryOpen={secondaryInfoOpen} statusReplenishProgress={statusReplenishProgress} turnPresentation={turnPresentation} onTogglePrimary={() => { audio.playPanelToggle(!primaryInfoOpen); setPrimaryInfoOpen(!primaryInfoOpen); }} onToggleSecondary={() => { audio.playPanelToggle(!secondaryInfoOpen); setSecondaryInfoOpen(!secondaryInfoOpen); }} onFocusedPanelChange={(focused) => { audio.playPanelToggle(focused); setExpandedPanelOpen(focused); }} onOpenProgression={() => { if (openLockboxRef.current) return; setGameSettingsCenter(measureGameSettingsCenter()); setProgressionOpen(true); }} />)}</section></Profiler>
<StatusControls renderTestMode={renderTestMode} setRenderTestMode={setRenderTestMode} performanceActive={performanceSession.current.active} onTogglePerformance={togglePerformance} campaign={campaign} canOverride={canOverride} orientation={orientation} onTogglePanels={togglePanels} onPanelToggle={audio.playPanelToggle} fps={fps} drag={dragPresentation} urlArgs={preferences.urlArgs} setUrlArgs={(urlArgs) => { writeDevBoolean(DEV_SETTINGS_STORAGE_KEYS.urlArgs, urlArgs); setPreference({ urlArgs }); }} mapTest={mapTest} setMapTest={setMapTest} itemTest={itemTest} setItemTest={setItemTest} enemyTest={enemyTest} setEnemyTest={setEnemyTest} levelTest={levelTest} setLevelTest={setLevelTest} zoomTest={zoomTest} setZoomTest={setZoomTest} gameViewShader={gameViewShader} setGameViewShader={(shader) => { writeDevGameViewShader(shader); setGameViewShaderState(shader); }} mobilePanel={mobilePanel} setMobilePanel={(value) => { if (value !== mobilePanel) audio.playPanelToggle(value === "info"); setMobilePanel(value); }} onWait={() => dispatch({ type: "wait" })} />
{orientation === "portrait" && (<section className="mobile_bottom"><MobileControls campaign={campaign} dispatch={dispatch} hidden={mobilePanel !== "controls"} />{mobilePanel === "info" && (<MobileInformationPanels renderTestMode={renderTestMode} primaryOverlay={!openLockbox && orientation === "portrait" ? performancePanel : null} campaign={activeUiCampaign} theme={dungeonTheme} dispatch={dispatch} drag={dragPresentation} preview={preview} gains={gains} cooldowns={abilityCooldowns} shineTokens={shineTokens} hidden={mobilePanel !== "info"} statusReplenishProgress={statusReplenishProgress} onOpenProgression={() => { if (openLockboxRef.current) return; setGameSettingsCenter(measureGameSettingsCenter()); setProgressionOpen(true); }} turnPresentation={turnPresentation} />)}</section>)}
    <ItemDragPreview campaign={campaign} drag={dragPresentation} />
    {openLockbox && <LockboxWindow boxId={openLockbox} items={lockboxPersistence.current?.getState().containers[openLockbox] ?? []} center={gameSettingsCenter} drag={dragPresentation} onClose={closeLockbox} onCancelDrag={cancelPointerDrag} />}
    {saveError && <div className="save_error">{saveError}</div>}
    {progressionOpen && <ProgressionWindow campaign={campaign} center={gameSettingsCenter} onClose={() => setProgressionOpen(false)} onConfirm={(allocation) => { const result = dispatch({ type: "spend-attribute-points", allocation }); if (result?.accepted) { shineSlot("attributes"); setProgressionOpen(false); } }} />}
    {worldGrowthResult && <WorldProgressionWindow event={worldGrowthResult} center={gameSettingsCenter} onContinue={() => dispatch({ type: 'acknowledge-world-growth', id: worldGrowthResult.id })} />}
    {settings && <SettingsWindow origin="game" center={gameSettingsCenter} onClose={() => setSettings(false)} onOpenHowToPlay={(bounds) => { helpBoundsRef.current = bounds; setHowToPlay(true); }} helpOpen={howToPlay} onSaveAndQuit={requestSaveAndQuit} onClearLocalStorage={clearLocalStorage} onFullscreen={toggleFullscreen} fullscreenActual={fullscreenActual} preferences={preferences} setPreference={setPreference} mutedByUrl={audio.hardMuted} />}
    {confirmingSaveAndExit && <ConfirmationDialog title="Are you sure?" message="Save your progress and exit." onConfirm={() => { setConfirmingSaveAndExit(false); saveAndQuit(); }} onCancel={() => setConfirmingSaveAndExit(false)} center={gameSettingsCenter} />}
    {howToPlay && <HowToPlayWindow origin="game" bounds={helpBoundsRef.current} onClose={() => setHowToPlay(false)} />}
    {deathRecap && <DeathRecapWindow campaign={deathRecap.fatal} lines={deathRecap.lines} center={gameSettingsCenter} onAction={(action) => { if (action === "recover") recoverFromDeath(); else returnToMainMenu(); }} />}
  </GameScreen>;
}
