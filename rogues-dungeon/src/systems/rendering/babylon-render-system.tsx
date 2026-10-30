import { minimapBackgroundRevision, minimapMarkerEntries } from "./minimap-presentation.ts";
import { GamepadReticleController, useGamepadReticle } from "../../game/gamepad-reticle.ts";
import { createWorldPresentationField, FLOOR_FIELD_FRAGMENT } from "./world-presentation-field.ts";
import { createDiscoveryReader, discoveryStatistics, discoveryRevision } from "../procedural/map-discovery-system.ts";
import { renderTestEffects, type RenderTestMode } from "./render-test-system.ts";
import { AUTHORED_OBJECT_IMAGES, authoredDecorationFrame, authoredDecorationPresentation } from "./authored-decoration-system.ts";
import { countPerformance, gaugePerformance, performanceFrame, performanceOptions, timePerformance } from "./performance-system.ts";
import { patchSprite, readSpritePatch, rememberSpritePatch } from "./sprite-patch-system.ts";
import { createStaticLayerVisibility } from "./static-layer-visibility-system.ts";
import { createSharedEngineLifecycle } from "./shared-engine-lifecycle.ts";
import { BattleIndicator, TacticalAreaOverlay } from "../../game/views/battle-overlay.tsx";
import { tacticalRectangles } from "../../game/tactical-area.ts";
import type { CSSProperties, MouseEvent } from "react";
import type { EngineContext, SurfaceContext, Texture2D, DynamicTexture2D, SpriteAtlas, SpriteRenderer, Sprite2DHandle, Sprite2DLayer } from "@babylonjs/lite";
import { detectedEnemyIds } from "../../game/enemy-detection.ts"; import { resolveWorldCursor } from "../../game/world-cursor.ts"; import { gameMode, hasAssignedWeapon, REST_GOLD_COST } from "../procedural/world-procedural-system.ts"; import type { Campaign, Direction, EncounterLockdownSet, Enemy, Feedback, Position, Resources, SelectedCell } from "../../game/types.ts";
import type { ResourceChangeEffect } from "../../game/resource-change-effects.ts";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  addSprite2D as allocateSprite2D, addSpriteRendererLayer, removeSpriteRendererLayer, centerSprite2DView, createDynamicTexture, createEngine, createGridSpriteAtlas, createSprite2DCustomShader, createSpriteAtlasFromFrames, createSprite2DLayer,
  createSpriteRenderer, createSurface, disposeEngine, disposeSpriteAtlas, disposeSpriteRenderer, disposeSurface,
  enableSprite2DYSort, loadTexture2D, registerSpriteRenderer, releaseTexture, resizeSurface, unregisterSpriteRenderer, setSprite2DShaderParams, startEngine, updateDynamicTexture,
} from "@babylonjs/lite";
import { createWorldPresentationReader, performanceCellBounds, getCameraCenter, getMouseScreenEdgeExit, getVisibleWorldCellBounds, getWorldCellAtScreenPosition, getWorldCellScreenCenter, getWorldScreenPosition, isWorldCellVisible, isWorldChunkVisible, WorldRender, type PuzzleObjectPresentation } from "./world-render-system.ts";
import { getCutsceneBarHeightPx, getRenderedTileCssSize } from "../../content/world/zoom.ts";
import { pixelPerfectOptions } from "../../content/babylon/config.ts";
import { getInitializationMessage } from "../../content/babylon/initialization.ts";
import { findWorldTooltipPosition } from "../../content/world/tooltip-placement.ts";
import { CAMPFIRE_IDLE_FRAME_COUNT, CAMPFIRE_IDLE_FRAME_DURATION_MS, CAMPFIRE_IDLE_FRAME_SIZE_PX, campfireIdleSpriteSheetPath } from "../../content/world/campfire-idle-animation.ts";
import { isBlockingPathCell, resourceNames } from "../procedural/world-procedural-system.ts";
import { isWalkable } from "../procedural/level-grid-system.ts";
import { createHeroWarriorAnimationEntity, heroWarriorIdleAnimationForHeading, heroWarriorRunAnimationForHeading } from "../../content/characters/hero-warrior/hero-warrior-animation.ts";
import { createHeroWarriorAppearanceSelection } from "../../content/characters/hero-warrior/hero-warrior-appearance.ts";
import { createHeroWarriorVisualFrames } from "../../content/characters/hero-warrior/hero-warrior-visual-frames.ts";
import { heroWarriorAtlasFrameKey, loadHeroWarriorAtlasFrames, loadSpriteAtlasFrame } from "../../content/characters/hero-warrior/hero-warrior-atlas.ts";
import { createEnemyAnimationEntities, enemyCharacterDescriptor, enemyCharacterForName, enemyStaticIdleFramePath, ENEMY_CHARACTER_NAMES, type EnemyCharacterName } from "../../content/enemies/enemy-idle-animation.ts";
import { createFloorTriggerAnimationEntity } from "../../content/world/floor-trigger-animation.ts";
import { particleBoundsAt, particleBoundsAtTile, particleExpired, particleFrame, particleFrameUrl, particleOpacity, particlePosition, particleProgress, particleSizePx, type ParticleEffect } from "../animation/particle-effects-system.ts";
import { UiCutsceneTransition, UiIrisTransition, UiPassiveTransition, useUiMotion, type UiCutscenePhase, type UiIrisPhase } from "../../ui/ui-transition-system.tsx";
import { easeInCubic, easeOutCubic } from "../animation/tween-animation-system.ts";
import { GRID_RENDER_PASS, orderWorldRenderEntries, type GridRenderEntry } from "./grid-render-order-system.ts";
import { CHEST_MAIN_ART_ANCHOR_OFFSET_PX, DROPPABLE_ITEM_ATLAS_LAYOUT, DUNGEON_STAIR_UP_FRAME, doorMainArtAnchorOffset, droppableItemMainOffsetXPx, droppableItemSpriteFrame, droppableItemSpriteSizePx, itemSpriteFrame, OBJECTS_OVERLAY_CRATE_CLOSED_FRAME, pickupMainArtPresentation, puzzleObjectSpriteFrame } from "./world-object-sprite-system.ts";
import { pickupOscillationOffset, pickupShadowWidthScale } from "../animation/pickup-oscillation-system.ts";
import { CHARACTER_MOVEMENT_DURATION_MS, TurnPresentationSystem } from "../animation/turn-presentation-system.ts";
import { STAIR_DESCENT_DURATION_MS, STAIR_DESCENT_STEP_COUNT, STAIR_DESCENT_STEP_DURATION_MS, STAIR_DESCENT_STEP_INTERVAL_MS, stairDescentHeading, stairDescentIsMasked, stairDescentOffset } from "../animation/stair-descent-animation-system.ts";
import { CameraAnimationSystem, PLAYER_TAKE_DAMAGE_ANIMATION } from "../animation/camera-animation-system.ts";
import { trapFrameAt } from "../procedural/world-hazards-system.ts";
import { setCharacterSpriteTint, createCharacterSprite, hideCharacterSprite, PLAYER_HOP_HEIGHT_PX, setCharacterSpriteOrder, updateCharacterSprite, type CharacterSprite } from "./character-sprite-system.ts";
import { itemThrowExpired, itemThrowPosition, type ItemThrow } from "../animation/item-throw-animation-system.ts";
import { INTERACTION_COLORS } from "../../ui/interaction-colors.ts";
import { MovementPrompt } from "../../game/views/movement-prompt.tsx";
import { movementDirection, type MovementPromptController } from "../../game/movement-prompt-controller.ts";
import { EnemyPortrait } from "../../ui/enemy-portrait.tsx";
import { activateTooltip } from "../../ui/Tooltip.tsx";
import { DUNGEON_CANONICAL_RULES } from "./tileset-dungeon-wang.generated.ts";
import { ruleForMask } from "./tileset-wang-rules.ts";
import { gameViewShaderSystem, type GameViewShaderId } from "./game-view-shader-system.ts";


const layerSprites = new WeakMap<Sprite2DLayer, Sprite2DHandle[]>();
function addSprite2D(layer: Sprite2DLayer, options: Parameters<typeof allocateSprite2D>[1]) {
  const handle = allocateSprite2D(layer, options);
  const handles = layerSprites.get(layer) ?? []; handles.push(handle); layerSprites.set(layer, handles);
  rememberSpritePatch(handle, options);
  if (options.color) intrinsicColors.set(handle, [...options.color]);
  return handle;
}
const anchorTints = new WeakMap<Sprite2DHandle, readonly number[]>();
const intrinsicColors = new WeakMap<Sprite2DHandle, readonly number[]>();
function updateSprite2D(handle: Sprite2DHandle, patch: Parameters<typeof patchSprite>[1]) {
  if (!handle.layer.visible) return;
  if (patch.color) intrinsicColors.set(handle, [...patch.color]);
  const tint = anchorTints.get(handle), base = patch.color;
  patchSprite(handle, base && tint ? { ...patch, color: [base[0] * tint[0]!, base[1] * tint[1]!, base[2] * tint[2]!, base[3] * tint[3]!] } : patch);
}

export function isPositionOffscreen(position: Position, center: Position, halfWidth: number, halfHeight: number) {
  return position.x < center.x - halfWidth || position.x > center.x + halfWidth || position.y < center.y - halfHeight || position.y > center.y + halfHeight;
}

const texturePaths = {
  tiles: `${import.meta.env.BASE_URL}assets/art/game-view/tilesets/art/tileset-dungeon.png`,
  rat: `${import.meta.env.BASE_URL}assets/art/game-view/enemies/rat/frames/idle/00.png`,
  skeleton: `${import.meta.env.BASE_URL}assets/art/game-view/enemies/skeleton-warrior/frames/idle/down/00.png`,
  items: `${import.meta.env.BASE_URL}assets/art/game-view/tilesets/art/items-static.png`,
  droppableItems: `${import.meta.env.BASE_URL}assets/art/game-view/items/droppable-item-sprite-sheet.png`,
  itemsAnimated: `${import.meta.env.BASE_URL}assets/art/game-view/tilesets/art/items-animated.png`,
  campfire: campfireIdleSpriteSheetPath(import.meta.env.BASE_URL),
  propsAnimated: `${import.meta.env.BASE_URL}assets/art/game-view/tilesets/art/props-animated.png`,
  propsStatic: `${import.meta.env.BASE_URL}assets/art/game-view/tilesets/art/props-static.png`,
  objectsOverlay: `${import.meta.env.BASE_URL}assets/art/game-view/tilesets/art/objects-overlay.png`,
  teleportArrow: `${import.meta.env.BASE_URL}assets/art/game-view/teleport/teleport-arrows.png`,
};

export type DungeonTheme = 1 | 2 | 3;

function dungeonTileTexturePath(theme: DungeonTheme) {
  if (theme === 2) return `${import.meta.env.BASE_URL}assets/art/game-view/tilesets/custom/tileset-dungeon-theme-2.png`;
  if (theme === 3) return `${import.meta.env.BASE_URL}assets/art/game-view/tilesets/custom/tileset-dungeon-theme-3.png`;
  return texturePaths.tiles;
}

const torchFramePaths = Array.from({ length: 3 }, (_, index) => `${import.meta.env.BASE_URL}assets/art/game-view/props/animated/frames/torch/${String(index).padStart(2, "0")}.png`);
const smokePuffFramePaths = Array.from({ length: 9 }, (_, index) => `${import.meta.env.BASE_URL}assets/art/game-view/particles/smoke-poff/smoke-poff-${index + 1}.png`);
const projectileFramePaths = {
  arrow: `${import.meta.env.BASE_URL}assets/art/game-view/enemies/skeleton-archer/arrow.png`,
  magic: `${import.meta.env.BASE_URL}assets/art/game-view/enemies/skeleton-mage/projectile.png`,
  web: `${import.meta.env.BASE_URL}assets/art/game-view/props/static/cobweb2.png`,
  "throwing-knife": `${import.meta.env.BASE_URL}assets/art/game-view/items/throwing-knives.png`,
} as const;
export const CAMPFIRE_REST_PHASE_DURATION_MS = 1500;
export const CAMPFIRE_REST_SHIMMER_COUNT = 2;
const heroShadowPath = `${import.meta.env.BASE_URL}assets/art/game-view/characters/hero-warrior/shadow.png`;
const chestFramePaths = [
  `${import.meta.env.BASE_URL}assets/art/game-view/props/static/bronze-chest-closed.png`,
  `${import.meta.env.BASE_URL}assets/art/game-view/props/static/bronze-chest-open.png`,
];
const doorFramePaths = [
  `${import.meta.env.BASE_URL}assets/art/game-view/props/static/front-door-closed.png`,
  `${import.meta.env.BASE_URL}assets/art/game-view/props/static/front-door-open.png`,
  `${import.meta.env.BASE_URL}assets/art/game-view/props/static/side-door-closed.png`,
  `${import.meta.env.BASE_URL}assets/art/game-view/props/static/side-door-open.png`,
];
const barrelFramePaths = [
  `${import.meta.env.BASE_URL}assets/art/game-view/props/static/barrel.png`,
  `${import.meta.env.BASE_URL}assets/art/game-view/props/static/barrel-shadow.png`,
];
const enemyShadowPaths = {
  rat: `${import.meta.env.BASE_URL}assets/art/game-view/enemies/rat/shadow.png`,
  "skeleton-warrior": `${import.meta.env.BASE_URL}assets/art/game-view/enemies/skeleton-warrior/shadow.png`,
  slime: `${import.meta.env.BASE_URL}assets/art/game-view/enemies/slime/shadow.png`,
  spider: `${import.meta.env.BASE_URL}assets/art/game-view/enemies/spider/shadow.png`,
  "slime-blue": `${import.meta.env.BASE_URL}assets/art/game-view/enemies/slime-blue/shadow.png`,
  ghost: `${import.meta.env.BASE_URL}assets/art/game-view/enemies/ghost/shadow.png`,
  "skeleton-archer": `${import.meta.env.BASE_URL}assets/art/game-view/enemies/skeleton-archer/shadow.png`,
  "skeleton-mage": `${import.meta.env.BASE_URL}assets/art/game-view/enemies/skeleton-mage/shadow.png`,
} satisfies Record<EnemyCharacterName, string>;

const clear = { r: 0, g: 0, b: 0, a: 1 };
const TERRAIN_RENDER_ORDER = 0;
const FLOOR_DECAL_RENDER_ORDER = 10;
const FLOOR_TRAP_RENDER_ORDER = FLOOR_DECAL_RENDER_ORDER + 1;
const OVERLAY_RENDER_ORDER = 1_000_000;
const WORLD_TIE_BREAK = { wall: 0, decoration: 10, stair: 20, prop: 30, pickup: 40, entity: 50, effect: 60 } as const;
const LANDED_DAMAGE_PARTICLE_RENDER_ORDER = FLOOR_TRAP_RENDER_ORDER + 1;
const CUTSCENE_OPENING_DELAY_MS = 200;

interface WorldDepthEntry extends GridRenderEntry {
  applyOrder(order: number): void;
}

function applyWorldDepth(entries: readonly WorldDepthEntry[]) {
  for (const { entry, order } of orderWorldRenderEntries(entries)) entry.applyOrder(order);
}

function groundContactY({ y }: Position) { return y * 32 + 32; }

const PIVOT_MARKER_FRAMES = { grid: 0, main: 1, shadow: 2 } as const;

function updatePivotMarkers(markers: readonly Sprite2DHandle[], character: CharacterSprite, positionPx: readonly [number, number], visible: boolean) {
  if (!visible) {
    markers.forEach((marker) => updateSprite2D(marker, { positionPx: [-10000, -10000] }));
    return;
  }
  const [x, y] = positionPx;
  updateSprite2D(markers[PIVOT_MARKER_FRAMES.grid], { positionPx: [x, y] });
  updateSprite2D(markers[PIVOT_MARKER_FRAMES.main], { positionPx: [x + character.main.offsetPx[0], y + character.main.offsetPx[1]] });
  updateSprite2D(markers[PIVOT_MARKER_FRAMES.shadow], { positionPx: [x + character.shadow.offsetPx[0], y + character.shadow.offsetPx[1]] });
}

export function renderParticle(effect: ParticleEffect, x: number, y: number, width: number, height: number, zIndex: number) {
  const bounds = particleBoundsAt(x, y, width, height);
  return <img key={effect.id} className="world-view__particle" src={particleFrameUrl(effect)} width={bounds.width} height={bounds.height} style={{ left: bounds.x, top: bounds.y, zIndex }} alt="" aria-hidden="true" />;
}

export function renderParticleAtTile(effect: ParticleEffect, request: Parameters<typeof particleBoundsAtTile>[0], zIndex: number) {
  const bounds = particleBoundsAtTile(request);
  return renderParticle(effect, bounds.x, bounds.y, bounds.width, bounds.height, zIndex);
}
const sharedEngineLifecycle = createSharedEngineLifecycle({
  create: (canvas: HTMLCanvasElement) => createEngine(canvas, pixelPerfectOptions.engine),
  start: async (engine) => { await startEngine(engine); },
  dispose: disposeEngine,
});
const sharedTextures = new Map<string, { refs: number; promise: Promise<Texture2D> }>();
const resourceIcons = { health: "♥", stamina: "◈", offense: "⚔", defense: "⛨", mana: "✦", xp: "★" };

function EnemyResourceRows({ resources }: { resources: Resources }) {
  return <div className="resource_list world-view__enemy-tooltip-resources">{resourceNames.map((name) => {
    const value = resources[name]; const fill = value.currentMax > 0 ? Math.max(0, Math.min(100, value.current / value.currentMax * 100)) : 0;
    return <div key={name} className={`resource resource_${name}`} aria-label={`${name}: ${value.current} of ${value.currentMax}`}><span>{resourceIcons[name]}</span><div className="resource_track"><i style={{ width: `${fill}%` }} /><b style={{ left: "100%" }} />{name === "xp" && <em>{String(value.level ?? 1).padStart(2, "0")}</em>}</div></div>;
  })}</div>;
}

async function acquireSharedSurface(canvas: HTMLCanvasElement) {
  const record = await sharedEngineLifecycle.acquire(canvas);
  try {
    const surface = canvas === record.primaryCanvas ? record.engine : createSurface(record.engine, canvas);
    let released = false;
    return { ...record, surface, release() {
      if (released) return;
      released = true;
      try { if (surface !== record.engine) disposeSurface(surface); }
      finally { record.release(); }
    } };
  } catch (error) {
    record.release();
    throw error;
  }
}

async function acquireSharedTexture(engine: EngineContext, path: string) {
  let entry = sharedTextures.get(path);
  if (!entry) { entry = { refs: 0, promise: loadTexture2D(engine, path, pixelPerfectOptions.texture) }; sharedTextures.set(path, entry); }
  entry.refs++;
  try { return await entry.promise; }
  catch (error) { entry.refs--; if (!entry.refs) sharedTextures.delete(path); throw error; }
}

function releaseSharedTexture(path: string) {
  const entry = sharedTextures.get(path); if (!entry) return;
  entry.refs--;
  if (entry.refs <= 0) { entry.promise.then(releaseTexture).catch(() => {}); sharedTextures.delete(path); }
}

/** A visual transfer from a world cell to the UI element that receives it. */
export interface GameViewToUiAnimation extends Position {
  id: string;
  kind: "item" | "potion" | "key" | "gold" | "chest" | "discovery" | "enemy" | "stairs" | "teleport-arrow";
  itemName?: string;
  resource?: "health" | "mana" | "stamina" | null;
  frame: number;
  mainSizePx: number;
  mainOffsetPx: Position;
  target: string;
  destination: "row" | "counter";
}
export const STAIR_DEPARTURE_DURATION_MS = STAIR_DESCENT_DURATION_MS;
function mapContextKey(campaign: Campaign) { return `${campaign.floor.seed}:${campaign.floor.level}:${campaign.activePrefab?.id ?? "dungeon"}`; }

function visibleTarget(selector: string) {
  return [...document.querySelectorAll<HTMLElement>(`${selector}, [data-ui-pickup-fallback]`)].find((element) => {
    const rect = element.getBoundingClientRect();
    return getComputedStyle(element).display !== "none" && rect.width > 0 && rect.height > 0;
  });
}

export function BabylonWorld({ campaign, theme = 1, gameViewShader = 0, renderTestMode = 3, zoom = 1, minimap = false, camera = "center", cameraAnimationToken = 0, playerDeathAnimation = false, stairDepartureStartedAt = null, teleportDepartureRequested = false, onTeleportDepartureComplete, mouseInteraction = false, mouseScreenEdgeTarget = null, mouseDirection = null, showPivotPoints = false, floatingFeedback = [], resourceChangeEffects = [], particleEffects = [], itemThrows = [], uiAnimations = [], selectedCell = null, selectedCellReachable = null, mousePath = null, campfireMenu = null, campfireRestConfirming = false, campfireRestTransition = false, turnPresentation, onCampfireRestReplenish, onCampfireRestRequested, onCampfireMenuCancelled, movementPrompts, onSelectedCellChange, onSelectedCellClick, onMouseScreenEdgeAdvance, onWorldAliveChange, onPlayerDeathAnimationComplete, onStairDepartureComplete, onStairDescentStep, onWallAdjacentBarrelOffscreen, onUiAnimationRest, onUiAnimationComplete, onFpsChange, onZoom, onToggleZoom }: { campaign: Campaign; theme?: DungeonTheme; gameViewShader?: GameViewShaderId; renderTestMode?: RenderTestMode; zoom?: number; minimap?: boolean; camera?: string; cameraAnimationToken?: number; playerDeathAnimation?: boolean; stairDepartureStartedAt?: number | null; teleportDepartureRequested?: boolean; onTeleportDepartureComplete?(): void; mouseInteraction?: boolean; mouseScreenEdgeTarget?: Position | null; mouseDirection?: Direction | null; showPivotPoints?: boolean; floatingFeedback?: Feedback[]; resourceChangeEffects?: ResourceChangeEffect[]; particleEffects?: ParticleEffect[]; itemThrows?: ItemThrow[]; uiAnimations?: GameViewToUiAnimation[]; selectedCell?: SelectedCell | null; selectedCellReachable?: boolean | null; mousePath?: readonly Position[] | null; campfireMenu?: Position | null; campfireRestConfirming?: boolean; campfireRestTransition?: boolean; turnPresentation?: TurnPresentationSystem; onCampfireRestReplenish?(progress: number): void; onCampfireRestRequested?(): void; onCampfireMenuCancelled?(): void; movementPrompts?: MovementPromptController; onSelectedCellChange?(cell: SelectedCell | null): void; onSelectedCellClick?(cell: SelectedCell): void; onMouseScreenEdgeAdvance?(direction: Direction): boolean; onWorldAliveChange?(alive: boolean): void; onPlayerDeathAnimationComplete?(): void; onStairDepartureComplete?(): void; onStairDescentStep?(): void; onWallAdjacentBarrelOffscreen?(setId: string): boolean; onUiAnimationRest?(id: string): void; onUiAnimationComplete?(id: string): void; onFpsChange?(fps: number | null): void; onZoom?(step: number): void; onToggleZoom?(): void }) {
  const tooltipOwner = useId();
  const knownCell = useMemo(() => createDiscoveryReader(campaign), [campaign]);
  const presentationAllowed = (position: Position) => !renderTestEffects(renderTestMode).fog || knownCell(position);
  const [presentedContext, setPresentedCampaign] = useState(campaign);
  const presentedSnapshotRef = useRef(campaign);
  const contextMatches = minimap || mapContextKey(campaign) === mapContextKey(presentedContext);
  const presentedCampaign = contextMatches ? campaign : presentedSnapshotRef.current;
  const hostRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null); const sceneRef = useRef<{ draw(): void; activate(): void; beginStairClip(origin: Position): void; clearStairClip(): void; setTheme(theme: DungeonTheme): void } | null>(null); const latestRef = useRef({ campaign: presentedCampaign, renderTestMode, zoom, minimap, camera, showPivotPoints, particleEffects, itemThrows, playerDeathAnimation, stairDescentStartedAt: null as number | null });
  const cameraCenterRef = useRef<(Position & { key: string }) | null>(null);
  // This is updated only by the completed world draw, so pickup flights can
  // launch from the camera framing the player actually saw before a move.
  const renderedCameraCenterRef = useRef<Position | null>(null);
  const renderedProjectionRef = useRef<{ rect: DOMRect; center: Position; tileCssSize: number } | null>(null);
  const launchedFlightsRef = useRef(new Set<string>());
  const mouseDownRef = useRef(false);
  const pointerRef = useRef<Position | null>(null);
  const reticleInput = useRef(new GamepadReticleController());
  const previousViewButtonPressed = useRef(false);
  const selectedCellRef = useRef(selectedCell);
  const onFpsChangeRef = useRef(onFpsChange);
  const onPlayerDeathAnimationCompleteRef = useRef(onPlayerDeathAnimationComplete);
  const previousCampaignRef = useRef(campaign);
  const cameraAnimation = useRef(new CameraAnimationSystem()).current;
  const cameraTransformRef = useRef({ positionPx: [0, 0] as [number, number], scale: 1 });
  const [message, setMessage] = useState(`Entering Level: ${campaign.floor.level}`);
  const [irisPhase, setIrisPhase] = useState<UiIrisPhase>("closed");
  const [irisMounted, setIrisMounted] = useState(true);
  const [irisRequested, setIrisRequested] = useState(false);
  const [campfireRestPhase, setCampfireRestPhase] = useState<"idle" | "resting">("idle");
  const [campfireRestMessage, setCampfireRestMessage] = useState("Resting ...");
  const campfireRestReplenishmentCompleteRef = useRef(false);
  const [cutscenePhase, setCutscenePhase] = useState<UiCutscenePhase>("open");
  const [cutsceneMounted, setCutsceneMounted] = useState(false);
  const [stairDescentStartedAt, setStairDescentStartedAt] = useState<number | null>(null);
  const cutsceneOpeningTimerRef = useRef<number | null>(null);
  const teleportDepartureAwaitingIrisRef = useRef(false);
  const stairDepartureAwaitingIrisRef = useRef(false);
  const stairCutsceneActiveRef = useRef(false);
  const [rendererLoaded, setRendererLoaded] = useState(false);
  const [worldAlive, setWorldAlive] = useState(minimap);
  const animationsEnabledRef = useRef(worldAlive);
  animationsEnabledRef.current = worldAlive;
  // The DOM overlay is projected from the renderer's current camera. Keep a
  // tiny revision counter so camera pans and viewport changes invalidate that
  // projection without rebuilding the Babylon scene.
  const [, refreshPathOverlay] = useState(0);
  const pathOverlayProjectionKeyRef = useRef("");
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
  const [tooltipEnemy, setTooltipEnemy] = useState<Enemy | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const deactivate = (event: Event) => {
      if ((event as CustomEvent<string>).detail === tooltipOwner) return;
      setTooltipVisible(false);
      setTooltipEnemy(null);
      setTooltipPosition(null);
    };
    window.addEventListener("tooltip-activate", deactivate);
    window.addEventListener("tooltip-dismiss", deactivate);
    return () => {
      window.removeEventListener("tooltip-activate", deactivate);
      window.removeEventListener("tooltip-dismiss", deactivate);
    };
  }, [tooltipOwner]);
  const campfireMenuRef = useRef<HTMLElement>(null);
  const [campfireMenuPosition, setCampfireMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const recoveredBarrelIdsRef = useRef(new Set<string>());
  latestRef.current = { campaign: presentedCampaign, renderTestMode, zoom, minimap, camera, showPivotPoints, particleEffects, itemThrows, playerDeathAnimation, stairDescentStartedAt };
  selectedCellRef.current = selectedCell;
  onFpsChangeRef.current = onFpsChange;
  onPlayerDeathAnimationCompleteRef.current = onPlayerDeathAnimationComplete;
  useEffect(() => {
    if (!irisRequested || irisPhase !== "open") return undefined;
    // Mount in its open state, then close on the next frame. This keeps the
    // mask absent before a transition while preserving its closing animation.
    setIrisMounted(true);
    const frame = requestAnimationFrame(() => setIrisPhase("closing"));
    return () => cancelAnimationFrame(frame);
  }, [irisPhase, irisRequested]);
  useEffect(() => {
    // Startup begins fully covered. The renderer is allowed to finish loading
    // behind the mask, then the closed-iris effect below opens it.
    if (!minimap && rendererLoaded && !irisRequested && irisPhase === "open" && !stairCutsceneActiveRef.current) setWorldAlive(true);
  }, [irisPhase, irisRequested, minimap, rendererLoaded]);
  useEffect(() => {
    if (minimap || irisPhase !== "closed" || !rendererLoaded || campfireRestPhase !== "resting" || campfireRestReplenishmentCompleteRef.current) return undefined;
    let openingTimer: number | null = null;
    const messageTimer = window.setTimeout(() => {
      setCampfireRestMessage("Replenishing status ...");
      let shimmerPass = 0;
      const advanceReplenishment = () => {
        shimmerPass++;
        if (shimmerPass === CAMPFIRE_REST_SHIMMER_COUNT) campfireRestReplenishmentCompleteRef.current = true;
        onCampfireRestReplenish?.(shimmerPass / CAMPFIRE_REST_SHIMMER_COUNT);
        if (shimmerPass < CAMPFIRE_REST_SHIMMER_COUNT) openingTimer = window.setTimeout(advanceReplenishment, CAMPFIRE_REST_PHASE_DURATION_MS / CAMPFIRE_REST_SHIMMER_COUNT);
        else openingTimer = window.setTimeout(() => setIrisPhase("opening"), CAMPFIRE_REST_PHASE_DURATION_MS / CAMPFIRE_REST_SHIMMER_COUNT);
      };
      advanceReplenishment();
    }, CAMPFIRE_REST_PHASE_DURATION_MS);
    return () => { window.clearTimeout(messageTimer); if (openingTimer !== null) window.clearTimeout(openingTimer); };
  }, [campfireRestPhase, irisPhase, minimap, onCampfireRestReplenish, rendererLoaded]);

  useEffect(() => {
    if (!minimap && irisPhase === "closed" && rendererLoaded && campfireRestPhase !== "resting") {
      // A level is only installed after the iris covers the old scene. Resetting
      // this cache makes every camera policy start from the player's position.
      if (mapContextKey(presentedCampaign) !== mapContextKey(campaign)) {
        // The destination player must be placed, never interpolated from the
        // departed floor. Do this while the iris still covers the renderer.
        turnPresentation?.reset(campaign);
        previousCampaignRef.current = campaign;
        // A prefab is a self-contained local map. Clear both camera caches so
        // the first frame is centered on the destination player instead of
        // briefly inheriting the departed dungeon's pixel transform.
        cameraCenterRef.current = null;
        cameraTransformRef.current.positionPx = [campaign.player.x * 32 + 16, campaign.player.y * 32 + 16];
        setRendererLoaded(false);
        setPresentedCampaign(campaign);
        return undefined;
      }
      if (teleportDepartureRequested) return undefined;
      cameraCenterRef.current = null;
      sceneRef.current?.draw();
      const frame = requestAnimationFrame(() => setIrisPhase("opening"));
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [campaign, campfireRestPhase, irisPhase, minimap, presentedCampaign, rendererLoaded, teleportDepartureRequested]);
  useLayoutEffect(() => {
    if (contextMatches) {
      presentedSnapshotRef.current = campaign;
      return;
    }
    // Stop all world input before the new floor can be drawn. The old floor
    // remains presented until the closed-iris effect above installs this one.
    setWorldAlive(false);
    selectCell(null);
    setMessage(`Entering Level: ${campaign.floor.level}`);
    setIrisRequested(true);
  }, [campaign, contextMatches, minimap, presentedCampaign]);
  useEffect(() => {
    if (minimap || !teleportDepartureRequested) return;
    teleportDepartureAwaitingIrisRef.current = true;
    setWorldAlive(false);
    selectCell(null);
    setIrisRequested(true);
  }, [cameraAnimation, minimap, teleportDepartureRequested]);
  useEffect(() => { if (!minimap && campfireRestTransition) { campfireRestReplenishmentCompleteRef.current = false; setCampfireRestMessage("Resting ..."); setCampfireRestPhase("resting"); setWorldAlive(false); setIrisRequested(true); } }, [campfireRestTransition, minimap]);
  useEffect(() => { onWorldAliveChange?.(worldAlive); if (worldAlive) sceneRef.current?.activate(); }, [onWorldAliveChange, worldAlive]);
  useEffect(() => {
    if (minimap) return undefined;
    const invalidate = () => refreshPathOverlay((revision) => revision + 1);
    window.addEventListener("resize", invalidate);
    window.visualViewport?.addEventListener("resize", invalidate);
    window.visualViewport?.addEventListener("scroll", invalidate);
    return () => {
      window.removeEventListener("resize", invalidate);
      window.visualViewport?.removeEventListener("resize", invalidate);
      window.visualViewport?.removeEventListener("scroll", invalidate);
    };
  }, [minimap]);
  useEffect(() => {
    if (!stairDepartureStartedAt || minimap) return undefined;
    stairCutsceneActiveRef.current = true;
    setWorldAlive(false);
    setStairDescentStartedAt(null);
    setCutsceneMounted(true);
    setCutscenePhase("open");
    const frame = requestAnimationFrame(() => setCutscenePhase("closing"));
    return () => cancelAnimationFrame(frame);
  }, [minimap, stairDepartureStartedAt]);
  useEffect(() => {
    if (!stairDescentStartedAt || minimap) return undefined;
    const stairOrigin = { x: campaign.player.x, y: campaign.player.y };
    const maskStartAt = stairDescentStartedAt + CHARACTER_MOVEMENT_DURATION_MS;
    const clipTimer = window.setTimeout(() => sceneRef.current?.beginStairClip(stairOrigin), Math.max(0, maskStartAt - performance.now()));
    let animationFrame = 0;
    const footstepTimers = Array.from({ length: STAIR_DESCENT_STEP_COUNT }, (_, index) => window.setTimeout(
      () => onStairDescentStep?.(),
      Math.max(0, maskStartAt + index * STAIR_DESCENT_STEP_INTERVAL_MS + STAIR_DESCENT_STEP_DURATION_MS - performance.now()),
    ));
    const completeWhenMasked = () => {
      const elapsed = performance.now() - stairDescentStartedAt - CHARACTER_MOVEMENT_DURATION_MS;
      if (stairDescentIsMasked(elapsed)) {
        footstepTimers.forEach(window.clearTimeout);
        stairDepartureAwaitingIrisRef.current = true;
        setIrisRequested(true);
      }
      else animationFrame = requestAnimationFrame(completeWhenMasked);
    };
    animationFrame = requestAnimationFrame(completeWhenMasked);
    return () => { window.clearTimeout(clipTimer); cancelAnimationFrame(animationFrame); footstepTimers.forEach(window.clearTimeout); if (!stairDepartureAwaitingIrisRef.current) sceneRef.current?.clearStairClip(); };
  }, [campaign.player.x, campaign.player.y, minimap, onStairDepartureComplete, onStairDescentStep, stairDescentStartedAt]);
  useEffect(() => { sceneRef.current?.setTheme(theme); }, [theme]);
  useEffect(() => {
    if (!cameraAnimationToken || minimap || !worldAlive) return;
    cameraAnimation.play(PLAYER_TAKE_DAMAGE_ANIMATION, { transform: cameraTransformRef.current, render: () => sceneRef.current?.draw() });
  }, [cameraAnimation, cameraAnimationToken, minimap, worldAlive]);
  useEffect(() => () => cameraAnimation.dispose(), [cameraAnimation]);
  useEffect(() => () => {
    if (cutsceneOpeningTimerRef.current !== null) window.clearTimeout(cutsceneOpeningTimerRef.current);
  }, []);
  useEffect(() => {
    if (minimap || !worldAlive || !turnPresentation) return;
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const center = getViewCenter(rect, campaign);
    const cellSize = cellSizeAt(rect);
    const visibleEnemyIds = new Set(campaign.floor.entities.filter((entity): entity is Enemy => entity.kind === "enemy" && Math.abs(entity.x - center.x) <= rect.width / cellSize / 2 + 1 && Math.abs(entity.y - center.y) <= rect.height / cellSize / 2 + 1).map((enemy) => enemy.id));
    turnPresentation.begin(previousCampaignRef.current, campaign, visibleEnemyIds, performance.now());
    previousCampaignRef.current = campaign;
  }, [campaign, minimap, turnPresentation, worldAlive]);
  useEffect(() => {
    if (!worldAlive || minimap || !uiAnimations.length || !hostRef.current) return undefined;
    const host = hostRef.current; const fallbackRect = host.getBoundingClientRect();
    const projection = renderedProjectionRef.current ?? { rect: fallbackRect, center: renderedCameraCenterRef.current ?? getViewCenter(fallbackRect), tileCssSize: cellSizeAt(fallbackRect) };
    for (const flight of uiAnimations) {
      if (launchedFlightsRef.current.has(flight.id)) continue;
      const { rect, center, tileCssSize } = projection;
      const cellOrigin = getWorldCellScreenCenter({ ...flight, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize });
      const pixelScale = tileCssSize / 32;
      const origin = { left: cellOrigin.left + (flight.mainOffsetPx.x + droppableItemMainOffsetXPx(flight.itemName)) * pixelScale, top: cellOrigin.top + flight.mainOffsetPx.y * pixelScale };
      const target = visibleTarget(flight.target);
      const destinationLayer = target?.closest<HTMLElement>(flight.destination === "counter" ? ".game-screen" : ".game-screen__middle");
      if (!target || !destinationLayer) { onUiAnimationRest?.(flight.id); onUiAnimationComplete?.(flight.id); continue; }
      launchedFlightsRef.current.add(flight.id);
      const transfer = document.createElement("span"); transfer.className = "world-view__ui-animation"; transfer.setAttribute("aria-hidden", "true");
      const goldCoin = flight.kind === "gold";
      const droppableFrame = droppableItemSpriteFrame(flight.itemName);
      const staminaPotion = flight.kind === "potion" && flight.resource === "stamina";
      const dedicatedItem = !goldCoin && droppableFrame !== null;
      const image = document.createElement("img"); image.className = `world-view__ui-animation-sprite${goldCoin ? " world-view__ui-animation-sprite--gold" : dedicatedItem ? " world-view__ui-animation-sprite--droppable" : ""}`; image.src = goldCoin ? texturePaths.itemsAnimated : dedicatedItem ? texturePaths.droppableItems : texturePaths.items; image.alt = "";
      if (staminaPotion) { image.src = `${import.meta.env.BASE_URL}assets/art/game-view/items/stamina-potion.png`; image.style.width = "100%"; image.style.height = "100%"; }
      if (!goldCoin && !staminaPotion) {
        const columns = dedicatedItem ? DROPPABLE_ITEM_ATLAS_LAYOUT.columns : 3;
        const rows = dedicatedItem ? DROPPABLE_ITEM_ATLAS_LAYOUT.rows : 3;
        if (dedicatedItem) { image.style.setProperty('--droppable-atlas-width', `${columns * 100}%`); image.style.setProperty('--droppable-atlas-height', `${rows * 100}%`); }
        const frame = dedicatedItem ? droppableFrame : flight.frame;
        image.style.transform = `translate(${-100 * (frame % columns) / columns}%, ${-100 * Math.floor(frame / columns) / rows}%)`;
      }
      transfer.append(image);
      const mainSize = flight.mainSizePx * pixelScale * (dedicatedItem ? droppableItemSpriteSizePx(flight.itemName) / 32 : 1);
      Object.assign(transfer.style, { left: `${rect.left + origin.left}px`, top: `${rect.top + origin.top}px`, width: `${mainSize}px`, height: `${mainSize}px`, transform: "translate(-50%, -50%)" });
      destinationLayer.append(transfer);
      requestAnimationFrame(() => {
        const targetRect = target.getBoundingClientRect();
        const counter = flight.destination === "counter";
        const targetHeight = targetRect.height;
        Object.assign(transfer.style, counter ? { left: `${targetRect.left + targetRect.width / 2}px`, top: `${targetRect.top + targetRect.height / 2}px`, width: `${Math.min(targetRect.width, targetHeight)}px`, height: `${Math.min(targetRect.width, targetHeight)}px`, transform: "translate(-50%, -50%)" } : { left: `${targetRect.left}px`, top: `${targetRect.top + targetHeight / 2}px`, width: `${targetHeight}px`, height: `${targetHeight}px`, transform: "translate(-50%, -50%)" });
      });
      // The transfer reaches its target at 500ms and holds at the slot's
      // height briefly before the destination glimmer and in-place shrink.
      window.setTimeout(() => {
        onUiAnimationRest?.(flight.id);
        window.setTimeout(() => transfer.classList.add("world-view__ui-animation--shrinking"), 100);
      }, 500);
      window.setTimeout(() => { transfer.remove(); launchedFlightsRef.current.delete(flight.id); onUiAnimationComplete?.(flight.id); }, 900);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiAnimations, worldAlive, minimap]);
  const cellSizeAt = (rect: DOMRect, zoomValue = latestRef.current.zoom) => {
    const canvas = canvasRef.current;
    const backingPixelsPerCssPixel = canvas && canvas.width > 0 && rect.width > 0 ? canvas.width / rect.width : window.devicePixelRatio || 1;
    return getRenderedTileCssSize({ zoom: typeof zoomValue === "number" ? zoomValue : 1, devicePixelRatio: window.devicePixelRatio || 1, backingPixelsPerCssPixel });
  };
  const getViewCenter = (rect: DOMRect, state = latestRef.current.campaign) => {
    const { camera: cameraNow, zoom: zoomNow } = latestRef.current;
    const tileCss = cellSizeAt(rect, zoomNow); const visibleWidth = rect.width / tileCss; const visibleHeight = rect.height / tileCss;
    const mapWidth = state.floor.width ?? state.floor.cells?.[0]?.length ?? 0; const mapHeight = state.floor.height ?? state.floor.cells?.length ?? 0;
    // Viewport dimensions deliberately do not reset camera history: the resize
    // observer redraws on every animated game-view width, and dead-zone mode
    // must keep its current camera position while adapting its bounds. Center
    // and screen modes derive their centers directly from the new dimensions.
    const resetKey = [state.floor.seed, mapWidth, mapHeight, cameraNow, zoomNow].join(":");
    const playerPosition = turnPresentation?.playerPositionOf(state.player) ?? state.player;
    const previousCenter = cameraCenterRef.current?.key === resetKey ? cameraCenterRef.current : playerPosition;
    // Teleport prefabs are local scenes: keep their camera locked to the
    // arriving player regardless of the dungeon camera policy.
    const center = state.activePrefab
      ? { x: playerPosition.x, y: playerPosition.y }
      : getCameraCenter({ mode: cameraNow, player: playerPosition, previousCenter, visibleWidth, visibleHeight, mapWidth, mapHeight });
    cameraCenterRef.current = { key: resetKey, ...center };
    return center;
  };
  const tacticalArea = useMemo(() => minimap ? [] : tacticalRectangles(campaign), [campaign, minimap]);
  const detected = useMemo(() => detectedEnemyIds(campaign), [campaign]); const targetKindAt = (x: number | undefined, y: number | undefined) => {
    if (x === undefined || y === undefined) return "neutral";
    if (campaign.player.x === x && campaign.player.y === y) return "invalid";
    if (!presentationAllowed({ x, y })) return isWalkable(campaign.floor, x, y) ? "valid" : "invalid";
    if (campaign.floor.decorations?.some(entry => entry.kind === "trap" && entry.x === x && entry.y === y)) return "hazard";
    const entity = campaign.floor.entities.find((entry) => entry.x === x && entry.y === y && (entry.kind !== "enemy" || detected.has(entry.id)));
    const barrel = campaign.floor.objectSets?.some((set) => set.kind === "floor-trigger-door-barrel" && set.barrel.x === x && set.barrel.y === y);
    if (barrel) return "item";
    return entity?.kind === "enemy" ? "enemy" : entity && ["item", "potion", "key", "gold", "chest", "campfire", "stairs"].includes(entity.kind) ? "item" : isWalkable(campaign.floor, x ?? NaN, y ?? NaN) ? "valid" : "invalid";
  };
  const targetAtScreenPosition = (point: Position, rect: DOMRect) => {
    const cellSize = cellSizeAt(rect);
    const center = getViewCenter(rect);
    const { x, y } = getWorldCellAtScreenPosition({ screenX: point.x, screenY: point.y, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: cellSize });
    return { x, y, pixel: { x: Math.round((center.x + (point.x - rect.width / 2) / cellSize + .5) * 32), y: Math.round((center.y + (point.y - rect.height / 2) / cellSize + .5) * 32) }, kind: targetKindAt(x, y), ...getWorldCellScreenCenter({ x, y, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: cellSize }), size: cellSize };
  };
  const targetAt = (event: MouseEvent<HTMLDivElement>) => {
    if (!mouseInteraction || !worldAlive) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointerRef.current = point;
    return targetAtScreenPosition(point, rect);
  };
  const selectCell = (target: SelectedCell | null, pressed = false, sprint = false) => {
    const next = target && { ...target, pressed, sprint };
    selectedCellRef.current = next;
    onSelectedCellChange?.(next);
  };
  const targetAtNeighbor = (offset: Position, rect: DOMRect) => {
    const player = latestRef.current.campaign.player;
    const x = player.x + offset.x; const y = player.y + offset.y;
    const size = cellSizeAt(rect);
    return { x, y, pixel: { x: (x + .5) * 32, y: (y + .5) * 32 }, kind: targetKindAt(x, y), ...getWorldCellScreenCenter({ x, y, center: getViewCenter(rect), viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: size }), size };
  };
  const pointerMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reticleInput.current.mouseMoved({ x: event.clientX, y: event.clientY }) && !mouseDownRef.current) selectCell(targetAt(event));
  };
  const pointerDown = (event: MouseEvent<HTMLDivElement>) => { const target = targetAt(event); if (!target) return; reticleInput.current.claimMouse(); event.preventDefault(); mouseDownRef.current = true; selectCell(target, true, event.button === 2); };
  const pointerUp = (event: MouseEvent<HTMLDivElement>) => { if (reticleInput.current.source !== "mouse") return; mouseDownRef.current = false; selectCell(targetAt(event)); };
  const pointerLeave = () => { if (reticleInput.current.source === "mouse" && !mouseDownRef.current) { pointerRef.current = null; selectCell(null); } };
  useGamepadReticle(
    !minimap && mouseInteraction && worldAlive,
    `${campaign.run}:${campaign.floor.seed}:${campaign.floor.level}:${campaign.activePrefab?.id}:${gameMode(campaign)}`,
    (input) => {
      const viewButtonPressed = Boolean(input.buttons?.[8]);
      if (viewButtonPressed && !previousViewButtonPressed.current) onToggleZoom?.();
      previousViewButtonPressed.current = viewButtonPressed;
      const rect = hostRef.current?.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) return;
      const target = selectedCellRef.current;
      const update = reticleInput.current.advance(input, movementPrompts?.revision ?? 0, movementPrompts?.hasRightStickPrompt ?? false);
      if (!update) return;
      mouseDownRef.current = false;
      pointerRef.current = null;
      if (update.prompt) { movementPrompts?.respondToRightStick(update.prompt); selectCell(null); return; }
      if (update.click !== null && target) onSelectedCellClick?.({ ...target, pressed: true, sprint: update.click === 2 });
      selectCell(update.offset ? targetAtNeighbor(update.offset, rect) : null);
    },
    () => {
      previousViewButtonPressed.current = false;
      const wasGamepad = reticleInput.current.source === "gamepad";
      reticleInput.current.reset();
      if (wasGamepad || !mouseInteraction) {
        pointerRef.current = null; mouseDownRef.current = false;
        if (selectedCellRef.current) selectCell(null);
      }
    },
  );

  useEffect(() => {
    if (minimap || !mouseInteraction || !mouseScreenEdgeTarget || !mouseDirection || !onMouseScreenEdgeAdvance) return;
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const size = cellSizeAt(rect);
    const center = getViewCenter(rect, campaign);
    const direction = getMouseScreenEdgeExit({ mode: camera, player: campaign.player, target: mouseScreenEdgeTarget, direction: mouseDirection, previousCenter: center, visibleWidth: rect.width / size, visibleHeight: rect.height / size, mapWidth: campaign.floor.width, mapHeight: campaign.floor.height });
    if (!direction) return;
    const [dx, dy] = direction === "e" ? [1, 0] : direction === "w" ? [-1, 0] : direction === "s" ? [0, 1] : [0, -1];
    const next = { x: campaign.player.x + dx, y: campaign.player.y + dy };
    if (!isWalkable(campaign.floor, next.x, next.y) || campaign.floor.entities.some((entity) => entity.x === next.x && entity.y === next.y)) return;
    selectCell(null);
    onMouseScreenEdgeAdvance(direction);
  }, [camera, campaign, minimap, mouseDirection, mouseInteraction, mouseScreenEdgeTarget, onMouseScreenEdgeAdvance]);

  useEffect(() => {
    const host = hostRef.current!; const canvas = canvasRef.current!;
    let cancelled = false; let engine: EngineContext | null = null; let surface: SurfaceContext | null = null; let renderer: SpriteRenderer | null = null; let atlases: SpriteAtlas[] = []; let textures: Record<string, Texture2D> = {}; let acquiredTexturePaths: string[] = []; let observers: { disconnect(): void }[] = []; let tileTexture: DynamicTexture2D | null = null; const tileThemeImages = new Map<DungeonTheme, ImageBitmap>(); let debugTexture: DynamicTexture2D | null = null; let pivotTexture: DynamicTexture2D | null = null; let pickupShadowTexture: DynamicTexture2D | null = null; let animationFrameId = 0; let fpsSampleStartedAt = 0; let fpsFrameCount = 0; let heroAnimation: ReturnType<typeof createHeroWarriorAnimationEntity> | null = null; let enemyAnimations: ReturnType<typeof createEnemyAnimationEntities> | null = null; const triggerAnimations = new Map<string, ReturnType<typeof createFloorTriggerAnimationEntity>>();
    let acquiredSurface: Awaited<ReturnType<typeof acquireSharedSurface>> | null = null;
    const readWorld = createWorldPresentationReader();
    const field = createWorldPresentationField();
    let fieldTexture: DynamicTexture2D | null = null;
    const fieldCanvas = document.createElement("canvas"); fieldCanvas.width = campaign.floor.width; fieldCanvas.height = campaign.floor.height;
    const fieldContext = fieldCanvas.getContext("2d")!;
    const releaseSetup = () => {
      cancelAnimationFrame(animationFrameId); observers.forEach(observer => observer.disconnect()); observers = [];
      if (renderer) { disposeSpriteRenderer(renderer); renderer = null; }
      atlases.forEach(disposeSpriteAtlas); atlases = [];
      field.dispose(); if (fieldTexture) { releaseTexture(fieldTexture); fieldTexture = null; }
      if (tileTexture) { releaseTexture(tileTexture); tileTexture = null; }
      tileThemeImages.forEach(image => image.close()); tileThemeImages.clear();
      if (debugTexture) { releaseTexture(debugTexture); debugTexture = null; }
      if (pivotTexture) { releaseTexture(pivotTexture); pivotTexture = null; }
      if (pickupShadowTexture) { releaseTexture(pickupShadowTexture); pickupShadowTexture = null; }
      heroAnimation?.dispose(); heroAnimation = null;
      Object.values(enemyAnimations ?? {}).forEach(animation => animation.dispose()); enemyAnimations = null;
      triggerAnimations.forEach(animation => animation.dispose()); triggerAnimations.clear();
      acquiredTexturePaths.forEach(releaseSharedTexture); acquiredTexturePaths = []; textures = {};
      acquiredSurface?.release(); acquiredSurface = null; surface = null; engine = null;
    };
    const loadFrames = async (paths: string[]) => {
      const frames = await Promise.all(paths.map(loadSpriteAtlasFrame));
      if (cancelled) throw new Error("Renderer setup cancelled");
      return frames;
    };
    const setup = async () => {
      try {
        if (!navigator.gpu) throw new Error("WebGPU is not available in this browser.");
        const acquired = await acquireSharedSurface(canvas); acquiredSurface = acquired; engine = acquired.engine; surface = acquired.surface;
        if (cancelled) { acquired.release(); acquiredSurface = null; surface = null; return; }
        if (minimap) {
          const semanticCanvas = document.createElement("canvas"); semanticCanvas.width = campaign.floor.width; semanticCanvas.height = campaign.floor.height;
          const semanticContext = semanticCanvas.getContext("2d")!;
          tileTexture = createDynamicTexture(engine, semanticCanvas.width, semanticCanvas.height, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
          const semanticAtlas = createGridSpriteAtlas(tileTexture, { cellWidthPx: semanticCanvas.width, cellHeightPx: semanticCanvas.height, columns: 1, rows: 1, pivot: [.5, .5] });
          const semanticLayer = createSprite2DLayer(semanticAtlas);
          addSprite2D(semanticLayer, { positionPx: [semanticCanvas.width * 16, semanticCanvas.height * 16], sizePx: [semanticCanvas.width * 32, semanticCanvas.height * 32] });
          const colors = ["#f7efd4", "#cf5f5f", "#76c878", "#e4b85e", "#8ab9e1", "#cb8fe0"];
          const palette = document.createElement("canvas"); palette.width = colors.length; palette.height = 1;
          const context = palette.getContext("2d")!;
          colors.forEach((color, x) => { context.fillStyle = color; context.fillRect(x, 0, 1, 1); });
          pickupShadowTexture = createDynamicTexture(engine, colors.length, 1, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
          updateDynamicTexture(engine, pickupShadowTexture, palette, { invertY: false });
          const markerAtlas = createGridSpriteAtlas(pickupShadowTexture, { cellWidthPx: 1, cellHeightPx: 1, columns: colors.length, rows: 1 });
          const markerLayer = createSprite2DLayer(markerAtlas, { order: 1 });
          const markers: Sprite2DHandle[] = [];
          renderer = createSpriteRenderer(surface, { layers: [semanticLayer, markerLayer], clear: true, clearValue: clear });
          registerSpriteRenderer(renderer);
          let registered = true, backgroundKey = "", painted = false;
          let lastWorld: ReturnType<typeof WorldRender.Render> | null = null, staticKey = "";
          let detectedKey = "", detectedMarkers: ReadonlySet<string> = new Set();
          const prepareMinimap = () => {
            if (cancelled) return;
            const rect = host.getBoundingClientRect();
            const mode = performanceOptions().minimap;
            canvas.style.visibility = mode === "off" ? "hidden" : "visible";
            const visible = rect.width > 0 && rect.height > 0 && mode !== "off";
            if (!visible) { if (registered) { unregisterSpriteRenderer(renderer!); registered = false; } return; }
            if (!registered) { registerSpriteRenderer(renderer!); registered = true; }
            if (mode === "frozen" && painted) return;
            const started = performance.now(); countPerformance("minimap preparations");
            const state = latestRef.current.campaign;
            const fog = renderTestEffects(latestRef.current.renderTestMode).fog;
            const isKnown = fog ? createDiscoveryReader(state) : () => true;
            const permitted = (position: Position) => !fog || isKnown(position);
            const discovery = fog ? discoveryRevision(state) : "fog-off";
            const world = readWorld({ cells: state.floor.cells, entities: state.floor.entities, decorations: state.floor.decorations, objectSets: state.floor.objectSets, player: state.player, groundTiles: state.floor.tiledGrounds, wallTiles: state.floor.tiledWalls, isDiscovered: permitted }, discovery);
            if (world !== lastWorld) {
              staticKey = minimapBackgroundRevision(world, discovery);
              lastWorld = world;
            }
            if (backgroundKey !== staticKey || !painted) {
              semanticContext.fillStyle = "#000"; semanticContext.fillRect(0, 0, semanticCanvas.width, semanticCanvas.height);
              semanticContext.fillStyle = "#6f7180"; world.terrain.filter(permitted).forEach(({ x, y }) => semanticContext.fillRect(x, y, 1, 1));
              semanticContext.fillStyle = "#292837"; world.walls.filter(permitted).forEach(({ x, y }) => semanticContext.fillRect(x, y, 1, 1));
              for (const object of world.objects) { semanticContext.fillStyle = object.kind === "stairs" ? colors[3] : colors[2]; semanticContext.fillRect(object.x, object.y, 1, 1); }
              updateDynamicTexture(engine!, tileTexture!, semanticCanvas, { invertY: false }); countPerformance("minimap uploads");
              backgroundKey = staticKey; painted = true;
            }
            const detection = [state.floor.time, state.player.x, state.player.y, discovery].join(":");
            if (detection !== detectedKey) { detectedMarkers = detectedEnemyIds(state); detectedKey = detection; }
            const entries = minimapMarkerEntries(world, turnPresentation?.playerPositionOf(state.player) ?? state.player, detectedMarkers, (id, fallback) => turnPresentation?.positionOf(id, fallback) ?? fallback).filter((entry) => permitted(entry.position));
            for (let i = 0; i < Math.max(markers.length, entries.length); i++) {
              const entry = entries[i];
              if (!markers[i]) markers[i] = addSprite2D(markerLayer, { positionPx: [0, 0], sizePx: [32, 32] });
              updateSprite2D(markers[i], entry ? { visible: true, positionPx: [entry.position.x * 32 + 16, entry.position.y * 32 + 16], sizePx: [32, 32], frame: entry.frame } : { visible: false });
            }
            const width = canvas.width || host.clientWidth, height = canvas.height || host.clientHeight;
            const scale = Math.min(width / (world.width * 32), height / (world.height * 32)) * .92;
            for (const layer of [semanticLayer, markerLayer]) { layer.view.zoom = scale; centerSprite2DView(layer.view, world.width * 16, world.height * 16, width, height); }
            timePerformance("minimap preparation", performance.now() - started);
          };
          let activated = false;
          const draw = () => { if (!activated) prepareMinimap(); };
          const animate = () => { if (cancelled) return; prepareMinimap(); animationFrameId = requestAnimationFrame(animate); };
          const activate = () => { if (activated) return; activated = true; animationFrameId = requestAnimationFrame(animate); };
          sceneRef.current = { draw, activate, beginStairClip: () => {}, clearStairClip: () => {}, setTheme: () => {} };
          const resizeAndDraw = () => { const rect = host.getBoundingClientRect(); if (rect.width <= 0 || rect.height <= 0) return; resizeSurface(surface!); draw(); };
          const observer = new ResizeObserver(resizeAndDraw); observer.observe(host); observers.push(observer); resizeAndDraw();
          await acquired.start();
          if (cancelled) { releaseSetup(); return; }
          window.addEventListener("resize", resizeAndDraw); observers.push({ disconnect: () => window.removeEventListener("resize", resizeAndDraw) });
          activate(); setRendererLoaded(true); setWorldAlive(true); setMessage("");
          return;
        }
        heroAnimation = createHeroWarriorAnimationEntity(import.meta.env.BASE_URL);
        const activeHeroAnimation = heroAnimation;
        const heroVisuals = createHeroWarriorVisualFrames(import.meta.env.BASE_URL);
        const selectHeroAppearance = createHeroWarriorAppearanceSelection();
        let playerDeathCompletionNotified = false;
        enemyAnimations = createEnemyAnimationEntities(import.meta.env.BASE_URL);
        const activeEnemyAnimations = enemyAnimations;
        for (const [key, path] of Object.entries(texturePaths).filter(([key]) => key !== "tiles")) {
          const texture = await acquireSharedTexture(engine, path); acquiredTexturePaths.push(path);
          if (cancelled) { releaseSetup(); return; }
          textures[key] = texture;
        }
        const loadedTileThemes = await Promise.all(([1, 2, 3] as const).map(async (tileTheme) => {
          const response = await fetch(dungeonTileTexturePath(tileTheme));
          if (!response.ok) {
            if (tileTheme === theme) throw new Error(`Could not load dungeon theme ${tileTheme}.`);
            return null;
          }
          try {
            return [tileTheme, await createImageBitmap(await response.blob())] as const;
          } catch (error) {
            if (tileTheme === theme) throw error;
            return null;
          }
        }));
        loadedTileThemes.forEach((entry) => { if (entry) tileThemeImages.set(entry[0], entry[1]); });
        if (cancelled) { releaseSetup(); return; }
        tileTexture = createDynamicTexture(engine, 384, 288, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
        updateDynamicTexture(engine, tileTexture, tileThemeImages.get(theme)!, { invertY: false });
        const tileAtlas = createGridSpriteAtlas(tileTexture, { cellWidthPx: 32, cellHeightPx: 32, columns: 12, rows: 9, pivot: [0.5, 0.5] });
        const quarterAtlas = createGridSpriteAtlas(tileTexture, { cellWidthPx: 16, cellHeightPx: 16, columns: 24, rows: 18, pivot: [0.5, 0.5] });
        const wallAtlas = { ...tileAtlas, frames: [...tileAtlas.frames, ...tileAtlas.frames.flatMap((_, source) => [0, 1, 2, 3].map(q => quarterAtlas.frames[(Math.floor(source / 12) * 2 + Math.floor(q / 2)) * 24 + source % 12 * 2 + q % 2]))] };
        const debugCanvas = document.createElement("canvas"); debugCanvas.width = 32; debugCanvas.height = 32;
        const contextGetter = "getContext"; const debugContext = debugCanvas[contextGetter]("2d")!; debugContext.strokeStyle = "#ff3b3b"; debugContext.lineWidth = 3; debugContext.strokeRect(1.5, 1.5, 29, 29);
        debugTexture = createDynamicTexture(engine, 32, 32, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
        updateDynamicTexture(engine, debugTexture, debugCanvas, { invertY: false });
        const debugAtlas = createGridSpriteAtlas(debugTexture, { cellWidthPx: 32, cellHeightPx: 32, columns: 1, rows: 1, pivot: [0.5, 0.5] });
        const pivotCanvas = document.createElement("canvas"); pivotCanvas.width = 15; pivotCanvas.height = 5;
        const pivotContext = pivotCanvas[contextGetter]("2d")!;
        ["#ff3b3b", "#3b8cff", "#56d364"].forEach((color, index) => { pivotContext.fillStyle = "#101014"; pivotContext.fillRect(index * 5, 0, 5, 5); pivotContext.fillStyle = color; pivotContext.fillRect(index * 5 + 1, 1, 3, 3); });
        pivotTexture = createDynamicTexture(engine, 15, 5, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
        updateDynamicTexture(engine, pivotTexture, pivotCanvas, { invertY: false });
        const pivotAtlas = createGridSpriteAtlas(pivotTexture, { cellWidthPx: 5, cellHeightPx: 5, columns: 3, rows: 1, pivot: [0.5, 0.5] });
        const pickupShadowCanvas = document.createElement("canvas"); pickupShadowCanvas.width = 32; pickupShadowCanvas.height = 32;
        const pickupShadowContext = pickupShadowCanvas[contextGetter]("2d")!;
        pickupShadowContext.fillStyle = "rgba(0, 0, 0, 0.38)"; pickupShadowContext.beginPath(); pickupShadowContext.ellipse(16, 23, 10, 3, 0, 0, Math.PI * 2); pickupShadowContext.fill();
        pickupShadowTexture = createDynamicTexture(engine, 32, 32, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
        updateDynamicTexture(engine, pickupShadowTexture, pickupShadowCanvas, { invertY: false });
        const pickupShadowAtlas = createGridSpriteAtlas(pickupShadowTexture, { cellWidthPx: 32, cellHeightPx: 32, columns: 1, rows: 1, pivot: [0.5, 0.5] });
        const enemyFramePaths = [...new Set(Object.values(activeEnemyAnimations).flatMap((animation) => animation.listAnimations().flatMap(({ frames }) => frames.map(({ path }) => path))))];
        const enemyAtlasPaths = [...enemyFramePaths, ...Object.values(enemyShadowPaths)];
        const enemyAtlas = createSpriteAtlasFromFrames(engine, await loadFrames(enemyAtlasPaths), { paddingPx: 1, sampling: "nearest" });
        atlases.push(enemyAtlas);
        const itemAtlas = createGridSpriteAtlas(textures.items, { cellWidthPx: 32, cellHeightPx: 32, columns: 3, rows: 3, pivot: [0.5, 0.5] });
        const teleportArrowAtlas = createGridSpriteAtlas(textures.teleportArrow, { cellWidthPx: 32, cellHeightPx: 32, columns: 4, rows: 1, pivot: [0.5, 0.5] });
        const droppableItemAtlas = createGridSpriteAtlas(textures.droppableItems, { ...DROPPABLE_ITEM_ATLAS_LAYOUT, pivot: [0.5, 0.5] });
        const specialItemFramePaths = [
          `${import.meta.env.BASE_URL}assets/art/game-view/items/stamina-potion.png`,
          `${import.meta.env.BASE_URL}assets/art/game-view/items/throwing-knives.png`,
        ];
        const specialItemAtlas = createSpriteAtlasFromFrames(engine, await loadFrames(specialItemFramePaths), { paddingPx: 1, sampling: "nearest" });
        atlases.push(specialItemAtlas);
        const propsAnimatedAtlas = createGridSpriteAtlas(textures.propsAnimated, { cellWidthPx: 32, cellHeightPx: 32, columns: 7, rows: 5, pivot: [0.5, 1] });
        const propsStaticAtlas = createGridSpriteAtlas(textures.propsStatic, { cellWidthPx: 32, cellHeightPx: 32, columns: 4, rows: 2, pivot: [0.5, 1] });
        const objectsOverlayAtlas = createGridSpriteAtlas(textures.objectsOverlay, { cellWidthPx: 32, cellHeightPx: 32, columns: 7, rows: 6, pivot: [0.5, 1] });
        const heroAtlasFrames = [...heroVisuals.frames, { path: heroShadowPath, widthPx: 32, heightPx: 32 }];
        const heroPixels = await loadHeroWarriorAtlasFrames(heroAtlasFrames);
        if (cancelled) throw new Error("Renderer setup cancelled");
        const heroAtlas = createSpriteAtlasFromFrames(engine, heroPixels, { paddingPx: 1, sampling: "nearest" });
        if (heroAtlas) atlases.push(heroAtlas);
        const goldCoinAtlas = createGridSpriteAtlas(textures.itemsAnimated, { cellWidthPx: 32, cellHeightPx: 32, columns: 4, rows: 2, pivot: [0.5, 0.5] });
        const authoredDecorations = campaign.floor.tiledDecorations ?? [];
        const authoredObjectAtlas = authoredDecorations.some(({ gid }) => gid >= 144 && gid <= 163)
          ? createSpriteAtlasFromFrames(engine, await loadFrames(AUTHORED_OBJECT_IMAGES.map(([name]) => `${import.meta.env.BASE_URL}assets/art/game-view/props/static/${name}.png`)), { paddingPx: 1, sampling: "nearest" })
          : null;
        if (authoredObjectAtlas) atlases.push(authoredObjectAtlas);
        const authoredAtlases = { tiles: tileAtlas, propsAnimated: propsAnimatedAtlas, authoredObjects: authoredObjectAtlas, itemsAnimated: goldCoinAtlas, items: itemAtlas, propsStatic: propsStaticAtlas };
        const authoredDecorationLayers: Sprite2DLayer[] = [];
        let authoredFloorLayer: Sprite2DLayer | undefined;
        const authoredSprites = authoredDecorations.map(({ gid, x, y }, index) => {
          const presentation = authoredDecorationPresentation({ gid, x, y });
          const layer = presentation.floorDecal && authoredFloorLayer || createSprite2DLayer(authoredAtlases[presentation.group]!, { pivot: [0.5, 0.5], order: FLOOR_DECAL_RENDER_ORDER });
          if (!authoredDecorationLayers.includes(layer)) authoredDecorationLayers.push(layer);
          if (presentation.floorDecal) authoredFloorLayer = layer;
          const handle = addSprite2D(layer, { positionPx: presentation.positionPx, sizePx: presentation.sizePx, frame: presentation.frame });
          return { x, y, gid, id: `authored-${index}`, layer, handle, visible: true, ...presentation };
        });
        const chestAtlas = createSpriteAtlasFromFrames(engine, await loadFrames(chestFramePaths), { paddingPx: 1, sampling: "nearest" });
        atlases.push(chestAtlas);
        const doorAtlas = createSpriteAtlasFromFrames(engine, await loadFrames(doorFramePaths), { paddingPx: 1, sampling: "nearest" });
        atlases.push(doorAtlas);
        const barrelAtlas = createSpriteAtlasFromFrames(engine, await loadFrames(barrelFramePaths), { paddingPx: 1, sampling: "nearest" });
        atlases.push(barrelAtlas);
        const torchAtlas = createSpriteAtlasFromFrames(engine, await loadFrames(torchFramePaths), { paddingPx: 1, sampling: "nearest" });
        const campfireAtlas = createGridSpriteAtlas(textures.campfire, { cellWidthPx: CAMPFIRE_IDLE_FRAME_SIZE_PX, cellHeightPx: CAMPFIRE_IDLE_FRAME_SIZE_PX, columns: CAMPFIRE_IDLE_FRAME_COUNT, rows: 1, pivot: [0.5, 0.5] });
        atlases.push(torchAtlas);
        const particleAtlas = minimap ? null : createSpriteAtlasFromFrames(engine, await loadFrames(smokePuffFramePaths), { paddingPx: 1, sampling: "nearest" });
        if (particleAtlas) atlases.push(particleAtlas);
        const projectileAtlasPaths = Object.values(projectileFramePaths);
        const projectileAtlas = createSpriteAtlasFromFrames(engine, await loadFrames(projectileAtlasPaths), { paddingPx: 1, sampling: "nearest" });
        atlases.push(projectileAtlas);
        const heroFrameIndexes = new Map(heroAtlasFrames.map((frame, index) => [heroWarriorAtlasFrameKey(frame), index]));
        const enemyFrameIndexes = new Map(enemyAtlasPaths.map((path, index) => [path, index]));
        const model = WorldRender.Render({ cells: campaign.floor.cells, entities: campaign.floor.entities, decorations: campaign.floor.decorations, objectSets: campaign.floor.objectSets, player: campaign.player, start: campaign.floor.start, groundTiles: campaign.floor.tiledGrounds, wallTiles: campaign.floor.tiledWalls, isDiscovered: () => true, view: minimap ? "minimap" : "game", detail: minimap ? "simplified" : "full" });
        const startRoomDecorations = model.wallDecorations.filter((decoration) => decoration.kind === "start-room-wall");
        const startRoomDecorationKeys = new Set(startRoomDecorations.map(({ x, y }) => `${x},${y}`));
        host.dataset.startRoomDecorations = String(startRoomDecorations.length);
        host.dataset.startRoomDecorationFrames = JSON.stringify(startRoomDecorations.map(({ x, y, frame }) => ({ x, y, frame })));
        host.dataset.wangDiagnostics = String(model.diagnostics.length + model.wallDiagnostics.length);
        host.dataset.wangWallTile5 = String(model.walls.filter((entry) => entry.frame === 5).length);
        host.dataset.wangWallTile17 = String(model.walls.filter((entry) => entry.frame === 17).length);
        host.dataset.wangRule112 = String(ruleForMask(DUNGEON_CANONICAL_RULES, "Generated wall boundary", 112)?.tileId ?? "");
        host.dataset.wangRule64 = String(ruleForMask(DUNGEON_CANONICAL_RULES, "Generated wall boundary", 64)?.tileId ?? "");
        host.dataset.wangCells = JSON.stringify(model.walls.map(({ x, y, frame, quarters }) => ({ x, y, frame, quarters })));
        const diagnosticsEnabled = new URLSearchParams(window.location.search).get("debug-wang") === "1";
        host.dataset.wangDebug = String(diagnosticsEnabled);
        // Static tiles are allocated once into fixed-size chunks.  A chunk is a
        // renderer-level culling boundary: hidden chunks have no draw work and
        // do not receive view updates while the camera is elsewhere.
        const staticChunkSize = 16;
        const staticChunks = new Map<string, { minX: number; maxX: number; minY: number; maxY: number; terrain: Sprite2DLayer; walls: Map<number, Sprite2DLayer>; sprites: { x: number; y: number; handle: Sprite2DHandle; visible: boolean; wall?: boolean }[]; floorTiles: typeof model.grounds }>();
        const chunkFor = (x: number, y: number) => {
          const chunkX = Math.floor(x / staticChunkSize); const chunkY = Math.floor(y / staticChunkSize); const key = `${chunkX},${chunkY}`;
          let chunk = staticChunks.get(key);
          if (!chunk) {
            chunk = { minX: chunkX * staticChunkSize, maxX: chunkX * staticChunkSize + staticChunkSize - 1, minY: chunkY * staticChunkSize, maxY: chunkY * staticChunkSize + staticChunkSize - 1, terrain: createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5], order: TERRAIN_RENDER_ORDER }), walls: new Map(), sprites: [], floorTiles: [] };
            staticChunks.set(key, chunk);
          }
          return chunk;
        };
        model.grounds.forEach((tile) => { if (tile.frame === null) return; const chunk = chunkFor(tile.x, tile.y); chunk.floorTiles.push(tile); const handle = addSprite2D(chunk.terrain, { positionPx: [tile.worldX, tile.worldY], sizePx: [32, 32], frame: tile.frame }); chunk.sprites.push({ x: tile.x, y: tile.y, handle, visible: true }); });
        model.walls.forEach((tile) => {
          if (startRoomDecorationKeys.has(`${tile.x},${tile.y}`)) return;
          const chunk = chunkFor(tile.x, tile.y);
          const wallLayer = chunk.walls.get(tile.y) ?? createSprite2DLayer(wallAtlas, { pivot: [0.5, 0.5] });
          chunk.walls.set(tile.y, wallLayer);
          if (tile.frame !== null && !tile.quarters) { const handle = addSprite2D(wallLayer, { positionPx: [tile.worldX, tile.worldY], sizePx: [32, 32], frame: tile.frame }); chunk.sprites.push({ x: tile.x, y: tile.y, handle, visible: true, wall: true }); }
          else if (tile.frame !== null) for (let q = 0; q < 4; q++) {
            const source = tile.quarters?.[q]?.tileId ?? tile.frame;
            const dx = q % 2; const dy = Math.floor(q / 2);
            const frame = 108 + source * 4 + q;
            const handle = addSprite2D(wallLayer, { positionPx: [tile.worldX + dx * 16 - 8, tile.worldY + dy * 16 - 8], sizePx: [16, 16], frame }); chunk.sprites.push({ x: tile.x, y: tile.y, handle, visible: true, wall: true });
          }
        });
        const startRoomDecorationLayers = new Map<number, Sprite2DLayer>();
        const startRoomDecorationSprites = !minimap ? startRoomDecorations.filter((decoration) => Number.isInteger(decoration.frame)).map((decoration) => {
          const layer = startRoomDecorationLayers.get(decoration.y) ?? createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5] });
          startRoomDecorationLayers.set(decoration.y, layer);
          const handle = addSprite2D(layer, { positionPx: [decoration.worldX, decoration.worldY], sizePx: [32, 32], frame: decoration.frame! });
          return { ...decoration, handle, visible: true };
        }) : [];
        host.dataset.startRoomDecorationRendered = String(startRoomDecorationSprites.length);
        const staticChunkList = [...staticChunks.values()];
        const staticChunkVisibility = new Map(staticChunkList.map((chunk) => [chunk, createStaticLayerVisibility([chunk.terrain, ...chunk.walls.values()], chunk.sprites)]));
        const startRoomVisibility = createStaticLayerVisibility([...startRoomDecorationLayers.values()], startRoomDecorationSprites);
        let staticVisibilityKey = "";
        const debugLayer = createSprite2DLayer(debugAtlas, { pivot: [0.5, 0.5] });
        const lockdownDoorMarkerLayer = createSprite2DLayer(debugAtlas, { pivot: [0.5, 0.5], order: OVERLAY_RENDER_ORDER + 3 });
        lockdownDoorMarkerLayer.visible = false;
        const pivotMarkerLayer = createSprite2DLayer(pivotAtlas, { pivot: [0.5, 0.5] });
        debugLayer.order = OVERLAY_RENDER_ORDER;
        debugLayer.visible = diagnosticsEnabled;
        pivotMarkerLayer.order = OVERLAY_RENDER_ORDER + 1;
        const actorLayers = Object.fromEntries(ENEMY_CHARACTER_NAMES.map((key) => [key, Array.from({ length: 40 }, () => ({ shadow: createSprite2DLayer(enemyAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(enemyAtlas, { pivot: [0.5, enemyCharacterDescriptor(key).dimensions[1] > 32 ? 1 : 0.5] }) }))])) as Record<EnemyCharacterName, { shadow: Sprite2DLayer; main: Sprite2DLayer }[]>;
        const itemLayers = Array.from({ length: 40 }, () => ({ shadow: createSprite2DLayer(pickupShadowAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(itemAtlas, { pivot: [0.5, 0.5] }) }));
        const droppableItemLayers = Array.from({ length: 40 }, () => ({ shadow: createSprite2DLayer(pickupShadowAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(droppableItemAtlas, { pivot: [0.5, 0.5] }) }));
        const specialItemLayers = Array.from({ length: 40 }, () => ({ shadow: createSprite2DLayer(pickupShadowAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(specialItemAtlas, { pivot: [0.5, 0.5] }) }));
        const chestLayers = Array.from({ length: 40 }, () => ({ shadow: createSprite2DLayer(pickupShadowAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(chestAtlas, { pivot: [0.5, 1] }) }));
        const closedCrateLayers = Array.from({ length: 40 }, () => createSprite2DLayer(objectsOverlayAtlas, { pivot: [0.5, 1] }));
        const openCrateLayers = Array.from({ length: 40 }, () => createSprite2DLayer(propsStaticAtlas, { pivot: [0.5, 1] }));
        const doorLayers = Array.from({ length: 4 }, () => createSprite2DLayer(doorAtlas, { pivot: [0.5, 1] }));
        const barrelLayers = Array.from({ length: 4 }, () => ({ shadow: createSprite2DLayer(barrelAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(barrelAtlas, { pivot: [0.5, 1] }) }));
        const triggerLayers = Array.from({ length: 4 }, () => createSprite2DLayer(propsAnimatedAtlas, { pivot: [0.5, 1] }));
        const goldCoinLayers = Array.from({ length: 40 }, () => ({ shadow: createSprite2DLayer(pickupShadowAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(goldCoinAtlas, { pivot: [0.5, 0.5] }) }));
        const torchLayers = Array.from({ length: 40 }, () => createSprite2DLayer(torchAtlas, { pivot: [0.5, 0.5] }));
        const trapLayers = Array.from({ length: 20 }, () => createSprite2DLayer(propsAnimatedAtlas, { pivot: [0.5, 0.5] }));
        const campfireLayers = Array.from({ length: 20 }, () => createSprite2DLayer(campfireAtlas, { pivot: [0.5, 0.5] }));
        const stairLayers = Array.from({ length: 4 }, () => createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5] }));
        const teleportArrowLayers = Array.from({ length: 4 }, () => createSprite2DLayer(teleportArrowAtlas, { pivot: [0.5, 0.5] }));
        const particleLayers = particleAtlas ? Array.from({ length: 64 }, () => createSprite2DLayer(particleAtlas, { pivot: [0.5, 0.5] })) : [];
        const projectileLayers = Array.from({ length: 16 }, () => createSprite2DLayer(projectileAtlas, { pivot: [0.5, 0.5] }));
        const stairClipShader = createSprite2DCustomShader({ fragment: "if (fx.params.z > 0.5 && in.p.y >= fx.params.x) { discard; } return textureSample(atlasTex, atlasSamp, in.uv) * in.tint * L.opacityMul;" });
        const playerLayers = heroAtlas ? { shadow: createSprite2DLayer(heroAtlas, { pivot: [0.5, 0.5], customShader: stairClipShader }), main: createSprite2DLayer(heroAtlas, { pivot: [0.5, 1], customShader: stairClipShader }) } : null;
        const playerSprite = playerLayers ? createCharacterSprite(
          { handle: addSprite2D(playerLayers.main, { positionPx: [-10000, -10000], sizePx: [32, 48], frame: 0 }), offsetPx: [-1, 6] },
          { handle: addSprite2D(playerLayers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: heroFrameIndexes.get(heroShadowPath) ?? 0 }), offsetPx: [0, -5] },
        ) : null;
        const debugHandles = [...model.diagnostics, ...model.wallDiagnostics].map(({ worldX, worldY }) => addSprite2D(debugLayer, { positionPx: [worldX, worldY], sizePx: [32, 32], frame: 0 }));
        const lockdownDoorMarkers = Array.from({ length: 4 }, () => addSprite2D(lockdownDoorMarkerLayer, { positionPx: [-10000, -10000], sizePx: [36, 36], frame: 0 }));
        const actors = Object.fromEntries(ENEMY_CHARACTER_NAMES.map((key) => [key, [] as CharacterSprite[]])) as Record<EnemyCharacterName, CharacterSprite[]>;
        const actorPivotMarkers = Object.fromEntries(ENEMY_CHARACTER_NAMES.map((key) => [key, [] as Sprite2DHandle[][]])) as Record<EnemyCharacterName, Sprite2DHandle[][]>;
        for (const key of ENEMY_CHARACTER_NAMES) for (let i = 0; i < 40; i++) {
          const [mainWidth, mainHeight] = enemyCharacterDescriptor(key).dimensions;
          actors[key].push(createCharacterSprite(
            { handle: addSprite2D(actorLayers[key][i].main, { positionPx: [-10000, -10000], sizePx: [mainWidth, mainHeight], frame: 0 }), offsetPx: [0, mainHeight > 32 ? 6 : -5] },
            { handle: addSprite2D(actorLayers[key][i].shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: enemyFrameIndexes.get(enemyShadowPaths[key]) ?? 0 }), offsetPx: [0, -5] },
          ));
          actorPivotMarkers[key].push(Object.values(PIVOT_MARKER_FRAMES).map((frame) => addSprite2D(pivotMarkerLayer, { positionPx: [-10000, -10000], sizePx: [5, 5], frame })));
        }
        const playerPivotMarkers = Object.values(PIVOT_MARKER_FRAMES).map((frame) => addSprite2D(pivotMarkerLayer, { positionPx: [-10000, -10000], sizePx: [5, 5], frame }));
        const items = itemLayers.map((layers, i) => createCharacterSprite(
          { handle: addSprite2D(layers.main, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: i % 9 }), offsetPx: [0, 0] },
          { handle: addSprite2D(layers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 0] },
        ));
        const droppableItems = droppableItemLayers.map((layers) => createCharacterSprite(
          { handle: addSprite2D(layers.main, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 0] },
          { handle: addSprite2D(layers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 0] },
        ));
        const specialItems = specialItemLayers.map((layers) => createCharacterSprite(
          { handle: addSprite2D(layers.main, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 0] },
          { handle: addSprite2D(layers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 0] },
        ));
        const chests = chestLayers.map((layers) => ({ shadow: addSprite2D(layers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), main: addSprite2D(layers.main, { positionPx: [-10000, -10000], sizePx: [32, 48], frame: 0 }) }));
        const closedCrates = closedCrateLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: OBJECTS_OVERLAY_CRATE_CLOSED_FRAME }));
        const openCrates = openCrateLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 1 }));
        const doors = doorLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const barrels = barrelLayers.map((layers) => createCharacterSprite(
          { handle: addSprite2D(layers.main, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 11] },
          { handle: addSprite2D(layers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 1 }), offsetPx: [0, -5] },
        ));
        const triggers = triggerLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        let previousTriggerDrawAt = performance.now();
        const goldCoins = goldCoinLayers.map((layers) => createCharacterSprite(
          { handle: addSprite2D(layers.main, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 0] },
          { handle: addSprite2D(layers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 0] },
        ));
        const chestCoinLayers = Array.from({ length: 3 }, () => createSprite2DLayer(goldCoinAtlas, { pivot: [0.5, 0.5] }));
        const chestCoins = chestCoinLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }));
        const itemThrowLayers = Array.from({ length: 3 }, () => createSprite2DLayer(itemAtlas, { pivot: [0.5, 0.5] }));
        const itemThrowSprites = itemThrowLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }));
        const staminaPotionThrowLayers = Array.from({ length: 3 }, () => createSprite2DLayer(specialItemAtlas, { pivot: [0.5, 0.5] }));
        const staminaPotionThrowSprites = staminaPotionThrowLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }));
        const droppableItemThrowLayers = Array.from({ length: 3 }, () => createSprite2DLayer(droppableItemAtlas, { pivot: [0.5, 0.5] }));
        const droppableItemThrowSprites = droppableItemThrowLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }));
        const torches = torchLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const traps = trapLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const campfires = campfireLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [30,30], frame: 0 }));
        const stairs = stairLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: DUNGEON_STAIR_UP_FRAME }));
        const teleportArrows = teleportArrowLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0, color: [1, 1, 1, 1] }));
        const particles = particleLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const projectileFrameIndexes = new Map(projectileAtlasPaths.map((path, index) => [path, index]));
        const projectiles = projectileLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [16,16], frame: 0 }));
        const projectileStartedAt = new Map<string, number>();
        const staticLayers = [...authoredDecorationLayers, ...startRoomDecorationLayers.values(), ...staticChunkList.flatMap((chunk) => [chunk.terrain, ...chunk.walls.values()])];
        const viewLayers = [...staticLayers, ...triggerLayers, debugLayer, lockdownDoorMarkerLayer, ...itemLayers.flatMap((layers) => [layers.shadow, layers.main]), ...droppableItemLayers.flatMap((layers) => [layers.shadow, layers.main]), ...specialItemLayers.flatMap((layers) => [layers.shadow, layers.main]), ...chestLayers.flatMap((layers) => [layers.shadow, layers.main]), ...closedCrateLayers, ...openCrateLayers, ...doorLayers, ...barrelLayers.flatMap((layers) => [layers.shadow, layers.main]), ...goldCoinLayers.flatMap((layers) => [layers.shadow, layers.main]), ...chestCoinLayers, ...itemThrowLayers, ...droppableItemThrowLayers, ...staminaPotionThrowLayers, ...torchLayers, ...trapLayers, ...campfireLayers, ...stairLayers, ...teleportArrowLayers, ...projectileLayers, ...particleLayers, ...ENEMY_CHARACTER_NAMES.flatMap((key) => actorLayers[key].flatMap((layers) => [layers.shadow, layers.main])), ...(playerLayers ? [playerLayers.shadow, playerLayers.main] : []), pivotMarkerLayer];
        // Terrain and overlays use fixed passes. Every participating world layer
        // receives a shared order below, while its own sprites retain stable Y sort.
        viewLayers.filter((layer) => !staticLayers.includes(layer) && layer !== debugLayer && layer !== lockdownDoorMarkerLayer && layer !== pivotMarkerLayer).forEach((layer) => enableSprite2DYSort(layer));
        // Pools start dormant.  A draw only reactivates layers with a visible
        // occupant, so hidden pool capacity has neither a draw call nor camera
        // transform work.
        viewLayers.filter((layer) => !staticLayers.includes(layer) && layer !== debugLayer && layer !== lockdownDoorMarkerLayer && layer !== pivotMarkerLayer && !(playerLayers && (layer === playerLayers.main || layer === playerLayers.shadow))).forEach((layer) => { layer.visible = false; });
        renderer = createSpriteRenderer(surface, { layers: viewLayers, clear: true, clearValue: clear });
        registerSpriteRenderer(renderer);
        let stairClipTopWorldY: number | null = null;
        const clearStairClip = () => { stairClipTopWorldY = null; };
        const beginStairClip = (origin: Position) => { stairClipTopWorldY = origin.y * 32 + 32; };
        let visibleEnemyAnimationKeys = new Set<EnemyCharacterName>();
        let detectedCampaign: Campaign | null = null, detectionRevision = ""; let detectedCache: ReadonlySet<string> = new Set();
        const shadedColors = new WeakMap<Sprite2DHandle, string>();
        let measuredCampaign: Campaign | undefined;
        let floorFieldActive = false;
        let floorFieldShader: ReturnType<typeof createSprite2DCustomShader> | undefined;
        const prepare = () => {
          const started = performance.now();
          const now = performanceOptions().animated ? started : 0;
          countPerformance("game preparations");
          const triggerDeltaMs = performanceOptions().animated ? Math.max(0, now - previousTriggerDrawAt) : 0;
          previousTriggerDrawAt = now;
          if (!minimap) turnPresentation?.sample(performance.now());
          const state = latestRef.current.campaign;
          const selectedMode = latestRef.current.renderTestMode;
          const effects = renderTestEffects(selectedMode);
          host.dataset.renderTestMode = String(selectedMode);
          gaugePerformance("RT mode", selectedMode);
          if (performanceOptions().enabled && measuredCampaign !== state) {
            const knowledge = discoveryStatistics(state);
            gaugePerformance("discovered cells", knowledge.count);
            gaugePerformance("discovery fingerprint", knowledge.fingerprint);
            gaugePerformance("discovery coverage %", Math.round(knowledge.count / (state.floor.width * state.floor.height) * 100));
            gaugePerformance("scene light candidates", 2 + (state.floor.decorations?.filter(d => d.kind === "torch").length ?? 0) + state.floor.entities.filter(e => e.kind === "campfire").length);
            host.dataset.discoveryFingerprint = String(knowledge.fingerprint); measuredCampaign = state;
          }
          const fieldChanged = field.update(state, selectedMode);
          gaugePerformance("light source count", effects.lighting ? field.sourceCount : 0);
          if (selectedMode !== 0 && !fieldTexture) {
            fieldTexture = createDynamicTexture(engine!, state.floor.width, state.floor.height, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
            floorFieldShader = createSprite2DCustomShader({ fragment: FLOOR_FIELD_FRAGMENT, extraTextures: [{ name: "field", texture: fieldTexture }] });
          }
          if (fieldChanged && fieldTexture) {
            fieldContext.putImageData(new ImageData(new Uint8ClampedArray(field.pixels), state.floor.width, state.floor.height), 0, 0);
            updateDynamicTexture(engine!, fieldTexture, fieldCanvas, { invertY: false });
            countPerformance("field uploads"); countPerformance("field upload bytes", field.pixels.byteLength);
          }
          if (floorFieldActive !== (selectedMode !== 0)) {
            floorFieldActive = selectedMode !== 0;
            for (const chunk of staticChunkList) {
              const oldLayer = chunk.terrain;
              const replacement = createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5], order: TERRAIN_RENDER_ORDER, view: oldLayer.view, ...(floorFieldActive ? { customShader: floorFieldShader } : {}) });
              removeSpriteRendererLayer(renderer!, oldLayer); addSpriteRendererLayer(renderer!, replacement);
              viewLayers[viewLayers.indexOf(oldLayer)] = replacement; staticLayers[staticLayers.indexOf(oldLayer)] = replacement;
              chunk.terrain = replacement; chunk.sprites = chunk.sprites.filter((sprite) => sprite.wall);
              for (const tile of chunk.floorTiles) {
                const handle = addSprite2D(replacement, { positionPx: [tile.worldX, tile.worldY], sizePx: [32, 32], frame: tile.frame! });
                chunk.sprites.push({ x: tile.x, y: tile.y, handle, visible: true });
              }
              staticChunkVisibility.set(chunk, createStaticLayerVisibility([chunk.terrain, ...chunk.walls.values()], chunk.sprites));
            }
          }
          const isKnown = effects.fog ? createDiscoveryReader(state) : () => true;
          const allowed = (position: Position) => !effects.fog || isKnown(position);
          const { zoom: zoomNow, minimap: isMinimap, showPivotPoints: pivotsVisible } = latestRef.current;
          const scale = typeof zoomNow === "number" ? zoomNow : 1;
          const renderWidth = canvas.width || canvas.clientWidth || host.clientWidth || 320;
          const renderHeight = canvas.height || canvas.clientHeight || host.clientHeight || 180;
          const boundsRect = host.getBoundingClientRect();
          const boundsCenter = getViewCenter(boundsRect, state);
          const cameraBounds = getVisibleWorldCellBounds(boundsCenter, boundsRect.width / cellSizeAt(boundsRect), boundsRect.height / cellSizeAt(boundsRect));
          const bounds = performanceOptions().local ? performanceCellBounds(state.player, cameraBounds, state.floor.width, state.floor.height) : cameraBounds;
          const world = readWorld({ cells: state.floor.cells, entities: state.floor.entities, decorations: state.floor.decorations, objectSets: state.floor.objectSets, player: state.player, start: state.floor.start, groundTiles: state.floor.tiledGrounds, wallTiles: state.floor.tiledWalls, isDiscovered: () => true }, discoveryRevision(state), bounds);
          const mapWidth = world.width * 32;
          const mapHeight = world.height * 32;
          const mapScale = Math.min(renderWidth / mapWidth, renderHeight / mapHeight) * 0.92;
          const cameraTransform = cameraTransformRef.current;
          const viewScale = isMinimap ? mapScale : scale * cameraTransform.scale * (window.devicePixelRatio || 1);
          const rect = host.getBoundingClientRect(); const cameraCenter = isMinimap ? state.player : getViewCenter(rect, state); if (!isMinimap) {
            const tileCssSize = cellSizeAt(rect);
            renderedCameraCenterRef.current = cameraCenter;
            renderedProjectionRef.current = { rect, center: cameraCenter, tileCssSize };
            const projectionKey = [rect.left, rect.top, rect.width, rect.height, cameraCenter.x, cameraCenter.y, tileCssSize].join("|");
            if (pathOverlayProjectionKeyRef.current !== projectionKey && (selectedCellRef.current || latestRef.current.particleEffects.length)) {
              pathOverlayProjectionKeyRef.current = projectionKey;
              refreshPathOverlay((revision) => revision + 1);
            }
          }
          if (!isMinimap && onWallAdjacentBarrelOffscreen) {
            const tileCss = cellSizeAt(rect); const halfWidth = rect.width / tileCss / 2; const halfHeight = rect.height / tileCss / 2;
            for (const set of state.floor.objectSets ?? []) {
              if (set.kind !== "floor-trigger-door-barrel") continue;
              const barrelOffscreen = isPositionOffscreen(set.barrel, cameraCenter, halfWidth, halfHeight);
              const startOffscreen = Boolean(set.barrelStart && isPositionOffscreen(set.barrelStart, cameraCenter, halfWidth, halfHeight));
              if (barrelOffscreen && startOffscreen && isBlockingPathCell(state.floor, set.barrel) && !recoveredBarrelIdsRef.current.has(set.id) && onWallAdjacentBarrelOffscreen(set.id)) recoveredBarrelIdsRef.current.add(set.id);
            }
          }
          const centerX = cameraCenter.x * 32 + 16;
          const centerY = cameraCenter.y * 32 + 16;
          cameraTransform.positionPx = [centerX, centerY];
          if (playerLayers) {
            const clipY = stairClipTopWorldY === null ? -10000 : (stairClipTopWorldY - playerLayers.main.view.positionPx[1]) * playerLayers.main.view.zoom;
            const clipActive = stairClipTopWorldY === null ? 0 : 1;
            setSprite2DShaderParams(playerLayers.main, [clipY, 0, clipActive, 0]);
            setSprite2DShaderParams(playerLayers.shadow, [clipY, 0, clipActive, 0]);
          }
          staticChunkList.forEach((chunk) => { chunk.terrain.order = TERRAIN_RENDER_ORDER; });
          debugLayer.order = OVERLAY_RENDER_ORDER;
          pivotMarkerLayer.order = OVERLAY_RENDER_ORDER + 1;
          const worldDepthEntries: WorldDepthEntry[] = [];
          const shadeJobs: { handles: Sprite2DHandle[]; position: Position; character?: CharacterSprite; id?: string }[] = [];
          const anchorById = new Map([...world.objects, ...world.actors, ...world.puzzleObjects, ...world.wallDecorations].map((p) => [p.id, p]));
          const enqueueLayerShade = (id: string, layers: Sprite2DLayer[], y: number, character?: CharacterSprite) => {
            if (id.startsWith("wall-row-")) return;
            const committed = id === "player" ? state.player : anchorById.get(id);
            const handles = layers.flatMap((layer) => layerSprites.get(layer) ?? []);
            const pos = readSpritePatch(handles[0]!)?.positionPx as number[] | undefined;
            const fallback = { x: ((pos?.[0] ?? -10000) - 16) / 32, y: y / 32 - 1 };
            const position = id === "player" ? turnPresentation?.playerPositionOf(state.player) ?? state.player : committed ? turnPresentation?.positionOf(id, committed) ?? committed : fallback;
            shadeJobs.push({ handles, position, character, id });
          };
          const addLayerDepth = (id: string, y: number, tieBreak: number, layer: Sprite2DLayer) => { enqueueLayerShade(id, [layer], y); return worldDepthEntries.push({ id, pass: GRID_RENDER_PASS.world, y, tieBreak, applyOrder: (order) => { layer.order = order; } }); };
          const addLayerPairDepth = (id: string, y: number, tieBreak: number, shadow: Sprite2DLayer, main: Sprite2DLayer) => { enqueueLayerShade(id, [shadow, main], y); return worldDepthEntries.push({ id, pass: GRID_RENDER_PASS.world, y, tieBreak, applyOrder: (order) => { shadow.order = order; main.order = order + 1; } }); };
          const addCharacterDepth = (id: string, y: number, character: CharacterSprite, bumpTieBreak = 0) => { enqueueLayerShade(id, [character.shadow.handle.layer, character.main.handle.layer], y, character); return worldDepthEntries.push({ id, pass: GRID_RENDER_PASS.world, y, tieBreak: WORLD_TIE_BREAK.entity + bumpTieBreak, applyOrder: (order) => setCharacterSpriteOrder(character, order) }); };
          const addPickupDepth = (id: string, y: number, pickup: CharacterSprite) => { enqueueLayerShade(id, [pickup.shadow.handle.layer, pickup.main.handle.layer], y, pickup); return worldDepthEntries.push({ id, pass: GRID_RENDER_PASS.world, y, tieBreak: WORLD_TIE_BREAK.pickup, applyOrder: (order) => setCharacterSpriteOrder(pickup, order) }); };
          const basePlayerHeading = turnPresentation?.headingOf("player", state.player.heading ?? "e") ?? state.player.heading ?? "e";
          const playerHeading = latestRef.current.stairDescentStartedAt !== null ? stairDescentHeading(basePlayerHeading) : basePlayerHeading;
          const playerDeathActive = latestRef.current.playerDeathAnimation;
          const desiredAnimation = playerDeathActive ? "death" : latestRef.current.stairDescentStartedAt === null && turnPresentation?.isPlayerTraveling() ? heroWarriorRunAnimationForHeading(playerHeading) : heroWarriorIdleAnimationForHeading(playerHeading);
          if (activeHeroAnimation.getState().animation !== desiredAnimation) {
            activeHeroAnimation.selectAnimation(desiredAnimation);
            activeHeroAnimation.start();
            playerDeathCompletionNotified = false;
          }
          const heroState = activeHeroAnimation.getState();
          const heroAppearance = selectHeroAppearance(state.player.equipment, playerDeathActive);
          const activeHeroFrame = heroVisuals.resolve(heroAppearance, heroState.animation, heroState.frameIndex);
          const activeHeroFrameIndex = heroFrameIndexes.get(heroWarriorAtlasFrameKey(activeHeroFrame));
          if (activeHeroFrameIndex === undefined) throw new Error(`Missing packed Hero Warrior frame: ${heroAppearance}/${heroState.animation}/${heroState.frameIndex}`);
          if (!isMinimap && hostRef.current) {
            hostRef.current.dataset.playerAnimation = heroState.animation;
            hostRef.current.dataset.playerAppearance = heroAppearance;
            hostRef.current.dataset.playerFrame = String(heroState.frameIndex);
          }
          if (playerDeathActive && activeHeroAnimation.getState().completed && !playerDeathCompletionNotified) {
            playerDeathCompletionNotified = true;
            onPlayerDeathAnimationCompleteRef.current?.();
          }
          const playerPosition = turnPresentation?.playerPositionOf(state.player) ?? state.player;
          const departureElapsed = latestRef.current.stairDescentStartedAt === null ? 0 : now - latestRef.current.stairDescentStartedAt - CHARACTER_MOVEMENT_DURATION_MS;
          const departureProgress = Math.max(0, Math.min(1, departureElapsed / STAIR_DEPARTURE_DURATION_MS));
          const departureOffsetY = departureElapsed > 0 ? stairDescentOffset(departureElapsed) : 0;
          const playerDepthPosition = turnPresentation?.playerDepthPositionOf(state.player, now) ?? state.player;
          const playerMovementPulse = isMinimap || !performanceOptions().animated ? 0 : turnPresentation?.movementPulseOf("player", now) ?? 0;
          if (playerSprite) { const positionPx: [number, number] = [playerPosition.x * 32 + 16, playerPosition.y * 32 + 16 + departureOffsetY]; const damageScale = (isMinimap ? 1 : turnPresentation?.damageScaleOf("player", now) ?? 1) * (1 - departureProgress * .15); updateCharacterSprite(playerSprite, positionPx, 0, { sizePx: [activeHeroFrame.widthPx * damageScale, activeHeroFrame.heightPx * damageScale], frame: activeHeroFrameIndex, flipX: playerHeading === "w", color: [1, 1, 1, 1] }, playerMovementPulse, PLAYER_HOP_HEIGHT_PX, 1); addCharacterDepth("player", groundContactY(playerDepthPosition), playerSprite, turnPresentation?.bumpDepthTieBreakOf("player", now) ?? 0); updatePivotMarkers(playerPivotMarkers, playerSprite, positionPx, pivotsVisible); }
          const visibleBounds = bounds;
          const dynamicVisible = (position: { x: number; y: number }) => allowed(position) && performanceOptions().dynamic && (isMinimap || isWorldCellVisible(position, visibleBounds));
          const visibilityKey = [visibleBounds.minX, visibleBounds.minY, visibleBounds.maxX, visibleBounds.maxY, performanceOptions().local, performanceOptions().dynamic, selectedMode, effects.fog ? discoveryRevision(state) : "", effects.lighting ? field.revision : 0, state.player.x, state.player.y].join(":");
          const visibilityChanged = visibilityKey !== staticVisibilityKey; staticVisibilityKey = visibilityKey;
          if (visibilityChanged) for (const sprite of authoredSprites) {
            const shown = dynamicVisible(sprite);
            if (sprite.floorDecal && sprite.visible !== shown) updateSprite2D(sprite.handle, { visible: shown });
            sprite.visible = shown;
          }
          for (const sprite of authoredSprites) {
            if (!sprite.floorDecal) sprite.layer.visible = sprite.visible;
            if (!sprite.visible) continue;
            if (!sprite.floorDecal) addLayerDepth(sprite.id, sprite.groundContactY, WORLD_TIE_BREAK.prop, sprite.layer);
            if (sprite.gid === 137) updateSprite2D(sprite.handle, { frame: authoredDecorationFrame(sprite.gid, performanceOptions().animated ? now : 0) });
          }
          staticChunkList.forEach((chunk) => {
            const visible = isMinimap || isWorldChunkVisible(chunk, visibleBounds);
            const layerVisibility = staticChunkVisibility.get(chunk)!;
            const newlyVisible = layerVisibility.apply(visible);
            if (visible && (visibilityChanged || newlyVisible)) layerVisibility.update(() => { for (const sprite of chunk.sprites) {
              countPerformance("static cells checked");
              const shown = (!performanceOptions().local || isWorldCellVisible(sprite, visibleBounds)) && (!sprite.wall || allowed(sprite));
              if (sprite.wall) {
                const tint = shown ? field.tint(sprite, state.player) : [0, 0, 0] as const;
                updateSprite2D(sprite.handle, { color: [...tint, shown ? 1 : 0], visible: shown });
                sprite.visible = shown;
              } else if (sprite.visible !== shown) { updateSprite2D(sprite.handle, { visible: shown }); sprite.visible = shown; }
            } });
            layerVisibility.apply(visible);
            chunk.walls.forEach((wallLayer, wallY) => {
              if (wallLayer.visible) addLayerDepth(`wall-row-${chunk.minX}-${wallY}`, (wallY + 1) * 32, WORLD_TIE_BREAK.wall, wallLayer);
            });
          });
          if (visibilityChanged) startRoomVisibility.update(() => { for (const sprite of startRoomDecorationSprites) {
            const shown = isWorldCellVisible(sprite, visibleBounds) && allowed(sprite);
            const tint = shown ? field.tint(sprite, state.player) : [0, 0, 0] as const;
            updateSprite2D(sprite.handle, { visible: shown, color: [...tint, shown ? 1 : 0] });
            sprite.visible = shown;
          } });
          startRoomVisibility.apply(true);
          for (const [row, layer] of startRoomDecorationLayers) {
            layer.visible = layer.visible && row >= visibleBounds.minY && row <= visibleBounds.maxY;
            if (layer.visible) addLayerDepth(`wall-row-start-room-${row}`, (row + 1) * 32, WORLD_TIE_BREAK.wall, layer);
          }
          const detectionKey = `${state.floor.time}:${state.player.x},${state.player.y}`;
          if (detectedCampaign?.floor.entities !== state.floor.entities || detectionRevision !== detectionKey || detectedCampaign?.progression !== state.progression) { detectedCache = detectedEnemyIds(state); detectedCampaign = state; detectionRevision = detectionKey; }
          const detectedNow = detectedCache; const byKind = Object.fromEntries(ENEMY_CHARACTER_NAMES.map((key) => [key, world.actors.filter((actor) => detectedNow.has(actor.id) && actor.character === key && dynamicVisible(actor))])) as Record<EnemyCharacterName, typeof world.actors>;
          visibleEnemyAnimationKeys = new Set(ENEMY_CHARACTER_NAMES.filter((key) => byKind[key].length > 0));
          for (const key of ENEMY_CHARACTER_NAMES) { const frame = activeEnemyAnimations[key].getState().frame; actors[key].forEach((character, i) => { const actor = byKind[key][i]; const position = actor && turnPresentation?.positionOf(actor.id, actor); const visible = Boolean(position && allowed(position)); actorLayers[key][i].main.visible = visible; actorLayers[key][i].shadow.visible = visible; if (!position || !visible) { hideCharacterSprite(character); updatePivotMarkers(actorPivotMarkers[key][i], character, [-10000, -10000], false); return; } const positionPx: [number, number] = [position.x * 32 + 16, position.y * 32 + 16]; const movementPulse = isMinimap || !performanceOptions().animated ? 0 : turnPresentation?.movementPulseOf(actor.id, now) ?? 0; const damageScale = isMinimap ? 1 : turnPresentation?.damageScaleOf(actor.id, now) ?? 1; updateCharacterSprite(character, positionPx, 0, { sizePx: [frame.widthPx * damageScale, frame.heightPx * damageScale], frame: enemyFrameIndexes.get(frame.path) ?? 0, flipX: actor?.heading === "w" }, movementPulse); addCharacterDepth(actor.id, groundContactY(position), character, turnPresentation?.bumpDepthTieBreakOf(actor.id, now) ?? 0); updatePivotMarkers(actorPivotMarkers[key][i], character, positionPx, pivotsVisible); }); }
          const activeItemThrows = latestRef.current.itemThrows.filter((throwItem) => !itemThrowExpired(throwItem, performance.now()));
          const flightIds = new Set(activeItemThrows.map((throwItem) => throwItem.id));
          const itemObjects = world.objects.filter((entity) => (entity.kind === "item" || entity.kind === "potion" || entity.kind === "key" || entity.kind === "discovery") && !flightIds.has(entity.id) && dynamicVisible(entity));
          const specialItemObjects = itemObjects.filter((entity) => (entity.kind === "potion" && entity.resource === "stamina") || (entity.kind === "item" && entity.item?.name === "Throwing Knives"));
          const droppableItemObjects = itemObjects.filter((entity) => entity.kind === "item" && droppableItemSpriteFrame(entity.item?.name) !== null);
          const standardItemObjects = itemObjects.filter((entity) => !specialItemObjects.includes(entity) && !droppableItemObjects.includes(entity));
          const chestObjects = world.objects.filter((entity) => entity.kind === "chest" && dynamicVisible(entity));
          const closedCrateObjects = world.objects.filter((entity) => entity.kind === "crate" && !entity.opened && dynamicVisible(entity));
          const openCrateObjects = world.objects.filter((entity) => entity.kind === "crate" && entity.opened && dynamicVisible(entity));
          chests.forEach((sprite, i) => { const chestObject = chestObjects[i]; chestLayers[i].shadow.visible = Boolean(chestObject); chestLayers[i].main.visible = Boolean(chestObject); updateSprite2D(sprite.shadow, { positionPx: chestObject ? [chestObject.worldX, chestObject.worldY] : [-10000, -10000] }); updateSprite2D(sprite.main, { positionPx: chestObject ? [chestObject.worldX, chestObject.worldY + CHEST_MAIN_ART_ANCHOR_OFFSET_PX] : [-10000, -10000], sizePx: [32, chestObject?.opened ? 48 : 32], frame: chestObject?.opened ? 1 : 0 }); if (chestObject) addLayerPairDepth(chestObject.id, groundContactY(chestObject), WORLD_TIE_BREAK.pickup, chestLayers[i].shadow, chestLayers[i].main); });
          closedCrates.forEach((sprite, i) => { const crate = closedCrateObjects[i]; closedCrateLayers[i].visible = Boolean(crate); updateSprite2D(sprite, { frame: OBJECTS_OVERLAY_CRATE_CLOSED_FRAME, positionPx: crate ? [crate.worldX, crate.worldY + 16] : [-10000, -10000] }); if (crate) addLayerDepth(crate.id, groundContactY(crate), WORLD_TIE_BREAK.prop, closedCrateLayers[i]); });
          openCrates.forEach((sprite, i) => { const crate = openCrateObjects[i]; openCrateLayers[i].visible = Boolean(crate); updateSprite2D(sprite, { frame: crate?.openFrame ?? 1, positionPx: crate ? [crate.worldX, crate.worldY + 16] : [-10000, -10000] }); if (crate) addLayerDepth(crate.id, groundContactY(crate), WORLD_TIE_BREAK.prop, openCrateLayers[i]); });
          const goldObjects = world.objects.filter((entity) => entity.kind === "gold" && !flightIds.has(entity.id) && dynamicVisible(entity));
          const stairObjects = world.objects.filter((entity) => entity.kind === "stairs");
          const teleportArrowObjects = world.objects.filter((entity) => entity.kind === "teleport-arrow" && dynamicVisible(entity));
          items.forEach((pickup, i) => { const entity = standardItemObjects[i]; itemLayers[i].shadow.visible = Boolean(entity); itemLayers[i].main.visible = Boolean(entity); if (!entity) { hideCharacterSprite(pickup); return; } const kind = entity.kind as "item" | "potion" | "key" | "discovery"; const presentation = pickupMainArtPresentation(kind, entity.resource); const oscillationPx = isMinimap ? 0 : pickupOscillationOffset(now, presentation.oscillationAmplitudePx); const shadowWidthScale = presentation.shadowWidthScale * (isMinimap ? 1 : pickupShadowWidthScale(oscillationPx, presentation.oscillationAmplitudePx)); updateCharacterSprite(pickup, [entity.worldX, entity.worldY], 0, { frame: itemSpriteFrame(kind, entity.resource), sizePx: kind === "key" ? [16, 16] : [32, 32], positionPx: [entity.worldX, entity.worldY + presentation.mainOffsetPx + oscillationPx] }, 0, 0, 1, [32 * shadowWidthScale, 32 * presentation.shadowHeightScale]); addPickupDepth(entity.id, groundContactY(entity), pickup); });
          droppableItems.forEach((pickup, i) => { const entity = droppableItemObjects[i]; droppableItemLayers[i].shadow.visible = Boolean(entity); droppableItemLayers[i].main.visible = Boolean(entity); if (!entity) { hideCharacterSprite(pickup); return; } const frame = droppableItemSpriteFrame(entity.item?.name) ?? 0; const sizePx = droppableItemSpriteSizePx(entity.item?.name); const oscillationPx = isMinimap ? 0 : pickupOscillationOffset(now, 1.5); updateCharacterSprite(pickup, [entity.worldX, entity.worldY], 0, { frame, sizePx: [sizePx, sizePx], positionPx: [entity.worldX + droppableItemMainOffsetXPx(entity.item?.name), entity.worldY - 8 + oscillationPx] }, 0, 0, 1, [sizePx * pickupShadowWidthScale(oscillationPx, 1.5), sizePx]); addPickupDepth(entity.id, groundContactY(entity), pickup); });
          specialItems.forEach((pickup, i) => { const entity = specialItemObjects[i]; specialItemLayers[i].shadow.visible = Boolean(entity); specialItemLayers[i].main.visible = Boolean(entity); if (!entity) { hideCharacterSprite(pickup); return; } const resource = entity.kind === "potion" ? entity.resource : null; const presentation = pickupMainArtPresentation(entity.kind as "potion" | "item", resource); const oscillationPx = isMinimap ? 0 : pickupOscillationOffset(now, presentation.oscillationAmplitudePx); const shadowWidthScale = presentation.shadowWidthScale * (isMinimap ? 1 : pickupShadowWidthScale(oscillationPx, presentation.oscillationAmplitudePx)); updateCharacterSprite(pickup, [entity.worldX, entity.worldY], 0, { frame: entity.kind === "potion" ? 0 : 1, sizePx: [32, 32], positionPx: [entity.worldX, entity.worldY + presentation.mainOffsetPx + oscillationPx] }, 0, 0, 1, [32 * shadowWidthScale, 32 * presentation.shadowHeightScale]); addPickupDepth(entity.id, groundContactY(entity), pickup); });
          const doorObjects = world.puzzleObjects.filter((entity): entity is Extract<PuzzleObjectPresentation, { kind: "door" }> => entity.kind === "door" && dynamicVisible(entity));
          doors.forEach((sprite, i) => {
            const door = doorObjects[i]; doorLayers[i].visible = Boolean(door);
            const sideArt = door?.wallAxis === "horizontal";
            updateSprite2D(sprite, { frame: door ? puzzleObjectSpriteFrame("door", door.active, door.wallAxis) : 0, positionPx: door ? sideArt ? [door.x * 32 + 32, door.y * 32 + 32] : [door.x * 32 + 16, door.y * 32 + 16 + doorMainArtAnchorOffset(door.active)] : [-10000,-10000], sizePx: sideArt ? [64, 64] : [32, door ? 48 : 32] });
            if (door) addLayerDepth(door.id, groundContactY(door), WORLD_TIE_BREAK.prop, doorLayers[i]);
          });
          const barrelObjects = world.puzzleObjects.filter((entity) => entity.kind === "barrel" && dynamicVisible(entity));
          barrels.forEach((barrel, i) => { const entity = barrelObjects[i]; const position = entity && (turnPresentation?.positionOf(entity.id, entity) ?? entity); barrelLayers[i].shadow.visible = Boolean(position); barrelLayers[i].main.visible = Boolean(position); if (!position) { hideCharacterSprite(barrel); return; } const positionPx: [number, number] = [position.x * 32 + 16, position.y * 32 + 16]; updateCharacterSprite(barrel, positionPx, 0, { sizePx: [32, 32], frame: 0 }); addCharacterDepth(entity.id, groundContactY(position), barrel); });
          const triggerObjects = world.puzzleObjects.filter((entity) => entity.kind === "trigger" && dynamicVisible(entity));
          const liveTriggerIds = new Set(triggerObjects.map((trigger) => trigger.id));
          for (const [id, animation] of triggerAnimations) if (!liveTriggerIds.has(id)) { animation.dispose(); triggerAnimations.delete(id); }
          triggers.forEach((sprite, i) => {
            const trigger = triggerObjects[i]; triggerLayers[i].visible = Boolean(trigger);
            if (!trigger) { updateSprite2D(sprite, { positionPx: [-10000, -10000] }); return; }
            const animation = triggerAnimations.get(trigger.id) ?? createFloorTriggerAnimationEntity(import.meta.env.BASE_URL);
            triggerAnimations.set(trigger.id, animation);
            const state = animation.getState();
            if (trigger.active && state.animation !== "activate") { animation.selectAnimation("activate"); animation.start(); }
            else if (!trigger.active && state.animation !== "off") { animation.selectAnimation("off"); animation.stop(); }
            animation.update(triggerDeltaMs);
            const frame = animation.getState().frame.sheetFrame ?? 0;
            shadeJobs.push({ handles: [sprite], position: trigger });
            triggerLayers[i].order = FLOOR_DECAL_RENDER_ORDER;
            updateSprite2D(sprite, { frame, positionPx: [trigger.worldX, trigger.worldY + 16], sizePx: [32, 32] });
          });
          const goldCoinFrame = Math.floor(now / 120) % 4;
          goldCoins.forEach((pickup, i) => { const entity = goldObjects[i]; goldCoinLayers[i].shadow.visible = Boolean(entity); goldCoinLayers[i].main.visible = Boolean(entity); if (!entity) { hideCharacterSprite(pickup); return; } updateCharacterSprite(pickup, [entity.worldX, entity.worldY - 10], 0, { frame: goldCoinFrame }, 0, 0); updateSprite2D(pickup.shadow.handle, { positionPx: [entity.worldX, entity.worldY], sizePx: [16, 16], color: [1, 1, 1, 0.5] }); addPickupDepth(entity.id, groundContactY(entity), pickup); });
          chestCoins.forEach((sprite, i) => { const throwItem = activeItemThrows[i]; const position = throwItem ? itemThrowPosition(throwItem, performance.now()) : null; const visible = Boolean(position && dynamicVisible(position) && throwItem?.kind === "gold"); chestCoinLayers[i].visible = visible; if (!visible || !position || !throwItem) return; updateSprite2D(sprite, { frame: goldCoinFrame, positionPx: [position.x * 32 + 16, position.y * 32 + 16] }); addLayerDepth(throwItem.id, groundContactY(position), WORLD_TIE_BREAK.effect, chestCoinLayers[i]); });
          itemThrowSprites.forEach((sprite, i) => { const throwItem = activeItemThrows[i]; const position = throwItem ? itemThrowPosition(throwItem, performance.now()) : null; const visible = Boolean(position && dynamicVisible(position) && throwItem?.kind !== "gold" && throwItem?.resource !== "stamina" && droppableItemSpriteFrame(throwItem?.itemName) === null); itemThrowLayers[i].visible = visible; if (!visible || !position || !throwItem) return; updateSprite2D(sprite, { frame: itemSpriteFrame(throwItem.kind as "item" | "potion", throwItem.resource), positionPx: [position.x * 32 + 16, position.y * 32 + 16] }); addLayerDepth(throwItem.id, groundContactY(position), WORLD_TIE_BREAK.effect, itemThrowLayers[i]); });
          staminaPotionThrowSprites.forEach((sprite, i) => { const throwItem = activeItemThrows[i]; const position = throwItem ? itemThrowPosition(throwItem, performance.now()) : null; const visible = Boolean(position && dynamicVisible(position) && throwItem?.resource === "stamina"); staminaPotionThrowLayers[i].visible = visible; if (!visible || !position || !throwItem) return; updateSprite2D(sprite, { frame: 0, positionPx: [position.x * 32 + 16, position.y * 32 + 16] }); addLayerDepth(throwItem.id, groundContactY(position), WORLD_TIE_BREAK.effect, staminaPotionThrowLayers[i]); });
          droppableItemThrowSprites.forEach((sprite, i) => { const throwItem = activeItemThrows[i]; const position = throwItem ? itemThrowPosition(throwItem, performance.now()) : null; const frame = droppableItemSpriteFrame(throwItem?.itemName); const visible = Boolean(position && dynamicVisible(position) && frame !== null); droppableItemThrowLayers[i].visible = visible; if (!visible || !position || frame === null || !throwItem) return; const sizePx = droppableItemSpriteSizePx(throwItem.itemName); updateSprite2D(sprite, { frame, sizePx: [sizePx, sizePx], positionPx: [position.x * 32 + 16 + droppableItemMainOffsetXPx(throwItem.itemName), position.y * 32 + 16] }); addLayerDepth(throwItem.id, groundContactY(position), WORLD_TIE_BREAK.effect, droppableItemThrowLayers[i]); });
          const torchFrame = Math.floor(now / 200) % torchFramePaths.length;
          const wallTorches = world.wallDecorations.filter((decoration) => decoration.kind === "torch" && dynamicVisible(decoration));
          const wallTraps = world.wallDecorations.filter((decoration) => decoration.kind === "trap" && dynamicVisible(decoration));
          torches.forEach((sprite, i) => { const decoration = wallTorches[i]; torchLayers[i].visible = Boolean(decoration); updateSprite2D(sprite, { frame: torchFrame, positionPx: decoration ? [decoration.worldX, decoration.worldY] : [-10000,-10000] }); if (decoration) addLayerDepth(decoration.id, groundContactY(decoration), WORLD_TIE_BREAK.decoration, torchLayers[i]); });
          const trapFrame = trapFrameAt(now);
          traps.forEach((sprite, i) => { const decoration = wallTraps[i]; trapLayers[i].visible = Boolean(decoration); trapLayers[i].order = FLOOR_TRAP_RENDER_ORDER; if (decoration) shadeJobs.push({ handles: [sprite], position: decoration }); updateSprite2D(sprite, { frame: trapFrame, positionPx: decoration ? [decoration.worldX, decoration.worldY] : [-10000,-10000] }); });
          const campfireFrame = Math.floor(now / CAMPFIRE_IDLE_FRAME_DURATION_MS) % CAMPFIRE_IDLE_FRAME_COUNT;
          const campfireObjects = world.objects.filter((entity) => entity.kind === "campfire" && dynamicVisible(entity));
          campfires.forEach((sprite, i) => { const campfire = campfireObjects[i]; campfireLayers[i].visible = Boolean(campfire); campfireLayers[i].order = FLOOR_TRAP_RENDER_ORDER; if (campfire) shadeJobs.push({ handles: [sprite], position: campfire }); updateSprite2D(sprite, { frame: campfireFrame, positionPx: campfire ? [campfire.worldX, campfire.worldY] : [-10000, -10000] }); });
          const visibleStairObjects = stairObjects.filter(dynamicVisible);
          stairs.forEach((sprite, i) => { const entity = visibleStairObjects[i]; stairLayers[i].visible = Boolean(entity); updateSprite2D(sprite, { frame: DUNGEON_STAIR_UP_FRAME, positionPx: entity ? [entity.worldX, entity.worldY] : [-10000,-10000], flipY: entity?.direction === "back" }); if (entity) addLayerDepth(entity.id, groundContactY(entity), WORLD_TIE_BREAK.stair, stairLayers[i]); });
          teleportArrows.forEach((sprite, i) => { const entity = teleportArrowObjects[i]; teleportArrowLayers[i].visible = Boolean(entity); const frame = entity?.direction === "e" ? 1 : entity?.direction === "s" ? 2 : entity?.direction === "w" ? 3 : 0; updateSprite2D(sprite, { frame, positionPx: entity ? [entity.worldX, entity.worldY] : [-10000, -10000], sizePx: [32, 32], color: [1, 1, 1, 1] }); if (entity) addLayerDepth(entity.id, groundContactY(entity), WORLD_TIE_BREAK.stair, teleportArrowLayers[i]); });
          const lockdownFixture = state.floor.objectSets?.find((set): set is EncounterLockdownSet => set.kind === "encounter-lockdown" && set.id === "encounter-lockdown-fixture-level-1");
          const fixtureDoors = lockdownFixture?.doors.filter(allowed) ?? [];
          lockdownDoorMarkerLayer.visible = fixtureDoors.length > 0;
          lockdownDoorMarkers.forEach((marker, index) => {
            const door = fixtureDoors[index];
            updateSprite2D(marker, { frame: 0, positionPx: door ? [door.x * 32 + 16, door.y * 32 + 16] : [-10000, -10000], sizePx: isMinimap ? [96, 96] : [36, 36] });
          });
          const activeProjectiles = state.floor.projectiles ?? [];
          const activeProjectileIds = new Set(activeProjectiles.map((projectile) => projectile.id));
          for (const id of projectileStartedAt.keys()) if (!activeProjectileIds.has(id)) projectileStartedAt.delete(id);
          projectiles.forEach((sprite, index) => {
            const projectile = activeProjectiles[index]; projectileLayers[index].visible = Boolean(projectile && dynamicVisible({ x: projectile.to.x, y: projectile.to.y }));
            if (!projectile) { updateSprite2D(sprite, { positionPx: [-10000, -10000] }); return; }
            const startedAt = projectileStartedAt.get(projectile.id) ?? now;
            projectileStartedAt.set(projectile.id, startedAt);
            const progress = Math.max(0, Math.min(1, (now - startedAt) / 240));
            const x = projectile.from.x + (projectile.to.x - projectile.from.x) * progress;
            const y = projectile.from.y + (projectile.to.y - projectile.from.y) * progress;
            const rotation = projectile.direction === "s" ? Math.PI / 2 : projectile.direction === "w" ? Math.PI : projectile.direction === "n" ? -Math.PI / 2 : 0;
            if (!dynamicVisible({ x, y })) { projectileLayers[index]!.visible = false; return; }
            shadeJobs.push({ handles: [sprite], position: { x, y } });
            const projectilePath = projectileFramePaths[projectile.kind ?? "arrow"];
            const size = projectile.kind === "web" ? 24 : projectile.kind === "magic" ? 20 : 16;
            updateSprite2D(sprite, { positionPx: [x * 32 + 16, y * 32 + 16], sizePx: [size, size], frame: projectileFrameIndexes.get(projectilePath) ?? 0, rotation });
            addLayerDepth(projectile.id, y * 32 + 16, WORLD_TIE_BREAK.effect, projectileLayers[index]!);
          });
          const activeParticles = (performanceOptions().animated && performanceOptions().dynamic ? latestRef.current.particleEffects : []).filter((effect) => !particleExpired(effect)).slice(-particleLayers.length);
          particles.forEach((sprite, i) => { const effect = activeParticles[i]; const now = performance.now(); const target = effect?.targetId ? world.actors.find((actor) => actor.id === effect.targetId) ?? null : null; const position = effect ? particlePosition(effect, target, now) : null; const offscreen = !isMinimap && position && isPositionOffscreen(position, cameraCenter, rect.width / cellSizeAt(rect) / 2 + 1, rect.height / cellSizeAt(rect) / 2 + 1); const visible = Boolean(effect && position && !offscreen && allowed(position)); particleLayers[i].visible = visible; if (!visible || !effect || !position) return; shadeJobs.push({ handles: [sprite], position }); const progress = particleProgress(effect, now); const ramp = effect.kind === "damage" ? particleOpacity(effect, now) : progress < .25 ? progress / .25 : progress > .75 ? (1 - progress) / .25 : 1; const sizePx = particleSizePx(effect, now); const purple = effect.kind === "heal" || effect.kind === "wand"; const damage = effect.kind === "damage"; if (effect.kind === "heal" || (damage && progress < 1)) particleLayers[i].order = OVERLAY_RENDER_ORDER - 1; else if (damage) particleLayers[i].order = LANDED_DAMAGE_PARTICLE_RENDER_ORDER; else addLayerDepth(effect.id, groundContactY(position), WORLD_TIE_BREAK.effect, particleLayers[i]); updateSprite2D(sprite, { positionPx: [position.x * 32 + 16, position.y * 32 + 16], sizePx: [sizePx, sizePx], frame: particleFrame(effect, now), rotation: effect.rotation, color: purple ? [.72, .48, 1, ramp] : damage ? [1, .16, .08, ramp] : [1, 1, 1, ramp] }); });
          // Only active layers follow the camera. Hidden chunks and dormant
          // sprite-pool entries are deliberately excluded from per-frame work.
          viewLayers.forEach((layer) => {
            if (!layer.visible) return;
            layer.view.zoom = viewScale;
            centerSprite2DView(layer.view, cameraTransform.positionPx[0], cameraTransform.positionPx[1], renderWidth, renderHeight);
          });
          for (const sprite of authoredSprites) if (sprite.visible) shadeJobs.push({ handles: [sprite.handle], position: sprite });
          for (const job of shadeJobs) {
            const tint = field.tint(job.position), known = allowed(job.position);
            if (job.character) { setCharacterSpriteTint(job.character, [...tint, known ? 1 : 0]); continue; }
            for (const handle of job.handles) {
              if (!handle.layer.visible) continue;
              const base = intrinsicColors.get(handle) ?? [1, 1, 1, 1];
              const color: [number, number, number, number] = [tint[0] * base[0]!, tint[1] * base[1]!, tint[2] * base[2]!, known ? base[3]! : 0];
              anchorTints.set(handle, [...tint, known ? 1 : 0]);
              const key = color.join(":");
              if (shadedColors.get(handle) !== key) { if (patchSprite(handle, { color })) countPerformance("anchor tint patches"); shadedColors.set(handle, key); }
            }
          }
          applyWorldDepth(worldDepthEntries);
          if (performanceOptions().enabled) {
            countPerformance("active layers", viewLayers.filter(layer => layer.visible).length);
            countPerformance("active layer sprite slots", viewLayers.reduce((count, layer) => count + (layer.visible ? layer.count : 0), 0));
          }
          timePerformance("game preparation", performance.now() - started);
        };
        // External notifications are sampled by the one continuous preparation loop.
        const draw = () => { prepare(); };
        let animationStarted = false;
        const activate = () => {
          if (animationStarted || cancelled) return;
          animationStarted = true;
          activeHeroAnimation.start();
          Object.values(activeEnemyAnimations).forEach((animation) => animation.start());
          let lastAnimationTime = performance.now();
          const animate = (time: number) => {
            if (cancelled) return;
            if (animationsEnabledRef.current && performanceOptions().animated || latestRef.current.playerDeathAnimation || latestRef.current.stairDescentStartedAt) activeHeroAnimation.update(Math.max(0, time - lastAnimationTime));
            if (animationsEnabledRef.current && performanceOptions().animated) visibleEnemyAnimationKeys.forEach((key) => activeEnemyAnimations[key].update(Math.max(0, time - lastAnimationTime)));
            lastAnimationTime = time;
            performanceFrame(time);
            if (animationsEnabledRef.current || latestRef.current.playerDeathAnimation || latestRef.current.stairDescentStartedAt) prepare();
            if (!latestRef.current.minimap && onFpsChangeRef.current) {
              if (!fpsSampleStartedAt) fpsSampleStartedAt = time;
              fpsFrameCount++;
              const elapsedMs = time - fpsSampleStartedAt;
              if (elapsedMs >= 1000) {
                onFpsChangeRef.current(Math.round(fpsFrameCount * 1000 / elapsedMs));
                fpsSampleStartedAt = time;
                fpsFrameCount = 0;
              }
            }
            animationFrameId = requestAnimationFrame(animate);
          };
          animationFrameId = requestAnimationFrame(animate);
        };
        const setTheme = (nextTheme: DungeonTheme) => {
          const image = tileThemeImages.get(nextTheme);
          if (!image || !engine || !tileTexture || cancelled) return;
          updateDynamicTexture(engine, tileTexture, image, { invertY: false });
          draw();
        };
        sceneRef.current = { draw, activate, beginStairClip, clearStairClip, setTheme };
        resizeSurface(surface); draw();
        await acquired.start();
        if (cancelled) return;
        const observer = new ResizeObserver(() => { resizeSurface(surface!); draw(); }); observer.observe(host); observers.push(observer);
        window.addEventListener("resize", draw); observers.push({ disconnect: () => window.removeEventListener("resize", draw) });
        if (minimap) { setRendererLoaded(true); setWorldAlive(true); setMessage(""); }
        else setRendererLoaded(true);
      } catch (error) {
        releaseSetup();
        if (cancelled) return;
        console.error("Rogue's Dungeon Babylon Lite initialization failed:", error);
        if (!cancelled) { setIrisPhase("open"); setIrisMounted(false); setMessage(getInitializationMessage(Boolean(navigator.gpu), error)); }
      }
    };
    queueMicrotask(() => { if (!cancelled) void setup(); });
    return () => {
      cancelled = true; sceneRef.current = null; releaseSetup();
    };
  // Decorations are mutable campaign state and are read by prepare() each frame.
  // Their cloned array must not tear down the shared engine on every action.
  }, [minimap, presentedCampaign.floor.seed, presentedCampaign.floor.level, presentedCampaign.floor.width, presentedCampaign.floor.height, presentedCampaign.floor.cells, presentedCampaign.floor.tiledGrounds, presentedCampaign.floor.tiledWalls, presentedCampaign.floor.tiledDecorations, presentedCampaign.activePrefab?.id]);
  useEffect(() => {
    if (!mouseInteraction || !worldAlive) return undefined;
    const releaseMouse = () => {
      if (!mouseDownRef.current) return;
      mouseDownRef.current = false;
      pointerRef.current = null;
      if (selectedCellRef.current) selectCell(selectedCellRef.current);
    };
    window.addEventListener("mouseup", releaseMouse);
    return () => window.removeEventListener("mouseup", releaseMouse);
  }, [mouseInteraction]);
  useEffect(() => {
    if (!worldAlive) return;
    sceneRef.current?.draw();
    const rect = hostRef.current?.getBoundingClientRect();
    if (!mouseInteraction || !rect) return;
    if (reticleInput.current.source === "gamepad" && reticleInput.current.offset) selectCell(targetAtNeighbor(reticleInput.current.offset, rect));
    else if (!mouseDownRef.current && pointerRef.current) selectCell(targetAtScreenPosition(pointerRef.current, rect));
  }, [campaign, renderTestMode, zoom, minimap, camera, mouseInteraction, turnPresentation, worldAlive]);
  const rect = hostRef.current?.getBoundingClientRect();
  const reticleCellSize = rect ? cellSizeAt(rect) : 32;
  const reticleCenter = rect && selectedCell ? getWorldCellScreenCenter({ x: selectedCell.x, y: selectedCell.y, center: getViewCenter(rect), viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: reticleCellSize }) : null;
  const reticleStyle = selectedCell && rect ? {
    left: selectedCell.pressed || reticleInput.current.source === "gamepad" ? reticleCenter!.left : selectedCell.left,
    top: selectedCell.pressed || reticleInput.current.source === "gamepad" ? reticleCenter!.top : selectedCell.top,
    width: selectedCell.pressed ? reticleCellSize : selectedCell.size,
    height: selectedCell.pressed ? reticleCellSize : selectedCell.size,
  } : null;
  const mousePathDots = mouseInteraction && worldAlive && selectedCell && mousePath && rect
    ? mousePath.slice(1).filter((cell) => !(cell.x === selectedCell.x && cell.y === selectedCell.y && targetKindAt(cell.x, cell.y) === "item")).map((cell) => ({ cell, kind: targetKindAt(cell.x, cell.y), ...getWorldCellScreenCenter({ x: cell.x, y: cell.y, center: getViewCenter(rect), viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: reticleCellSize }) }))
    : [];
  const feedbackRect = hostRef.current?.getBoundingClientRect();
  const feedbackCenter = feedbackRect && !minimap ? getViewCenter(feedbackRect) : null;
  const feedbackCellSize = feedbackRect ? cellSizeAt(feedbackRect) : 32;
  const hoveredEnemy = mouseInteraction && selectedCell && presentationAllowed(selectedCell) && !selectedCell.pressed ? campaign.floor.entities.find((entry): entry is Enemy => entry.kind === "enemy" && detected.has(entry.id) && entry.x === selectedCell.x && entry.y === selectedCell.y) : null;
  useEffect(() => {
    if (hoveredEnemy) {
      activateTooltip(tooltipOwner);
      setTooltipEnemy(hoveredEnemy);
      setTooltipVisible(false);
      const frame = requestAnimationFrame(() => setTooltipVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setTooltipVisible(false);
    if (!tooltipEnemy) return undefined;
    const timer = window.setTimeout(() => setTooltipEnemy(null), 100);
    return () => window.clearTimeout(timer);
  }, [hoveredEnemy, tooltipEnemy, tooltipOwner]);
  const tooltipMotion = useUiMotion("enemy-tooltip", { xOffsetPx: tooltipVisible ? 0 : 3, opacity: tooltipVisible ? 1 : 0, depth: 8 }, 100, tooltipVisible ? easeInCubic : easeOutCubic);
  useLayoutEffect(() => {
    if (!tooltipEnemy) return undefined;
    const update = () => {
      const host = hostRef.current; const panel = tooltipRef.current;
      if (!host || !panel) return;
      const rect = host.getBoundingClientRect(); const size = cellSizeAt(rect); const center = getViewCenter(rect);
      const cellRect = (x: number, y: number) => { const point = getWorldCellScreenCenter({ x, y, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: size }); return { left: rect.left + point.left - size / 2, top: rect.top + point.top - size / 2, width: size, height: size }; };
      const placement = findWorldTooltipPosition(rect, { width: panel.offsetWidth, height: panel.offsetHeight }, [cellRect(tooltipEnemy.x, tooltipEnemy.y), cellRect(campaign.player.x, campaign.player.y)], size + 8);
      setTooltipPosition(placement);
    };
    update(); const observer = new ResizeObserver(update);
    if (hostRef.current) observer.observe(hostRef.current);
    if (tooltipRef.current) observer.observe(tooltipRef.current);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [tooltipEnemy, campaign.player.x, campaign.player.y, zoom, camera]);
  useLayoutEffect(() => {
    if (!campfireMenu) { setCampfireMenuPosition(null); return undefined; }
    const update = () => {
      const host = hostRef.current; const panel = campfireMenuRef.current;
      if (!host || !panel) return;
      const rect = host.getBoundingClientRect(); const size = cellSizeAt(rect); const center = getViewCenter(rect);
      const cellRect = (x: number, y: number) => { const point = getWorldCellScreenCenter({ x, y, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: size }); return { left: rect.left + point.left - size / 2, top: rect.top + point.top - size / 2, width: size, height: size }; };
      setCampfireMenuPosition(findWorldTooltipPosition(rect, { width: panel.offsetWidth, height: panel.offsetHeight }, [cellRect(campfireMenu.x, campfireMenu.y), cellRect(campaign.player.x, campaign.player.y)], size + 8));
    };
    update(); const observer = new ResizeObserver(update);
    if (hostRef.current) observer.observe(hostRef.current);
    if (campfireMenuRef.current) observer.observe(campfireMenuRef.current);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [campfireMenu, campaign.player.x, campaign.player.y, zoom, camera]);
  const offsets = new Map();
  const pathDotSize = reticleCellSize / 32 * 4;
  const chestSprites = mousePathDots.map(({ cell, kind, left, top }) => <i key={`${cell.x},${cell.y}`} className={`world-view__path-dot${kind === "item" ? " world-view__path-dot--interactive" : ""}${kind === "hazard" ? " world-view__path-dot--hazard" : ""}`} style={{ left, top, width: pathDotSize, height: pathDotSize }} aria-hidden="true" />);
  const targetKind = targetKindAt(selectedCell?.x, selectedCell?.y);
  const unarmedEnemyTarget = targetKind === "enemy" && Boolean(selectedCell && campaign.floor.entities.some((entity) => entity.kind === "enemy" && entity.x === selectedCell.x && entity.y === selectedCell.y && detected.has(entity.id))) && !hasAssignedWeapon(campaign);
  const reticleKind = unarmedEnemyTarget ? "unarmed" : targetKind === "hazard" ? "enemy" : targetKind === "item" || targetKind === "enemy" ? targetKind : selectedCellReachable === false ? "invalid" : targetKind;
  const finishIrisPhase = (phase: UiIrisPhase) => {
    if (phase === "closing") {
      setIrisPhase("closed");
      if (campfireRestTransition) setCampfireRestPhase("resting");
      if (teleportDepartureAwaitingIrisRef.current) {
        teleportDepartureAwaitingIrisRef.current = false;
        onTeleportDepartureComplete?.();
      }
      if (stairDepartureAwaitingIrisRef.current) {
        // The iris is now fully closed, so the old player can be released
        // before the game installs the next floor.
        sceneRef.current?.clearStairClip();
        stairDepartureAwaitingIrisRef.current = false;
        setStairDescentStartedAt(null);
        onStairDepartureComplete?.();
      }
    }
    if (phase === "opening") {
      setIrisPhase("open"); setIrisMounted(false); setIrisRequested(false); setCampfireRestPhase("idle");
      if (stairCutsceneActiveRef.current) {
        cutsceneOpeningTimerRef.current = window.setTimeout(() => {
          cutsceneOpeningTimerRef.current = null;
          setCutscenePhase("opening");
        }, CUTSCENE_OPENING_DELAY_MS);
      }
      else if (rendererLoaded) setWorldAlive(true);
    }
  };
  const finishCutscenePhase = (phase: UiCutscenePhase) => {
    if (phase === "closing") {
      setCutscenePhase("closed");
      if (stairCutsceneActiveRef.current) setStairDescentStartedAt(performance.now());
    }
    if (phase === "opening") {
      stairCutsceneActiveRef.current = false;
      setCutscenePhase("open"); setCutsceneMounted(false);
      if (rendererLoaded) setWorldAlive(true);
    }
  };
  const passiveMounted = cutsceneMounted;
  const passivePhase = cutscenePhase;
  const finishPassivePhase = finishCutscenePhase;
  const interactionColorStyle = {
    "--interaction-valid-color": INTERACTION_COLORS.valid,
    "--interaction-interactive-color": INTERACTION_COLORS.interactive,
    "--interaction-enemy-color": INTERACTION_COLORS.enemy,
    "--interaction-invalid-color": INTERACTION_COLORS.invalid,
    "--ui-cutscene-bar-height": `${getCutsceneBarHeightPx(zoom)}px`,
  } as CSSProperties;
return <div tabIndex={-1} className={minimap ? "minimap-view" : "world-view"} ref={hostRef} style={interactionColorStyle} data-world-alive={worldAlive} data-render-test-mode={renderTestMode} data-map-context={mapContextKey(presentedCampaign)} data-player-x={presentedCampaign.player.x} data-player-y={presentedCampaign.player.y} data-player-pixel-x={presentedCampaign.player.pixel?.x} data-player-pixel-y={presentedCampaign.player.pixel?.y} data-game-mode={minimap ? undefined : gameMode(campaign)} data-cursor={mouseInteraction ? resolveWorldCursor(campaign, selectedCell, selectedCellReachable, detected, mousePath, presentationAllowed) : undefined} aria-label={minimap ? "Minimap" : `Game view, ${gameMode(campaign)} mode`} data-renderer="babylon-lite" data-renderer-ready={rendererLoaded} data-content-style="2d" onMouseMove={mouseInteraction && worldAlive ? pointerMove : undefined} onMouseLeave={mouseInteraction && worldAlive ? pointerLeave : undefined} onMouseDown={mouseInteraction && worldAlive ? pointerDown : undefined} onMouseUp={mouseInteraction && worldAlive ? pointerUp : undefined} onWheel={mouseInteraction && worldAlive ? (event) => { event.preventDefault(); onZoom?.(event.deltaY < 0 ? 1 : -1); } : undefined} onContextMenu={mouseInteraction && worldAlive ? (event) => event.preventDefault() : undefined}><canvas tabIndex={-1} ref={canvasRef} className={`${minimap ? "minimap-view__canvas" : "world-view__canvas"}${gameViewShaderSystem.canvasClassName(gameViewShader, minimap)}`} aria-label={minimap ? "Dungeon minimap" : "Pixel-perfect dungeon map"}/>{!minimap && worldAlive && gameMode(campaign) === "Battle" && feedbackRect && feedbackCenter && <TacticalAreaOverlay allowed={presentationAllowed} rectangles={tacticalArea} center={renderedProjectionRef.current?.center ?? feedbackCenter} width={feedbackRect.width} height={feedbackRect.height} tileSize={renderedProjectionRef.current?.tileCssSize ?? feedbackCellSize} />}{!minimap && movementPrompts && <BattleIndicator key={`${campaign.run}:${campaign.floor.seed}:${campaign.floor.level}`} visible={worldAlive} active={gameMode(campaign) === "Battle"} movement={movementPrompts} unarmed={!hasAssignedWeapon(campaign)} />}{!minimap && resourceChangeEffects.map((effect) => <i key={effect.id} className={`world-view__resource-change-effect world-view__resource-change-effect--${effect.color}`} aria-hidden="true" />)}{chestSprites}{worldAlive && !minimap && feedbackCenter && floatingFeedback.filter(presentationAllowed).map((effect) => { const key = `${effect.x},${effect.y}`; const index = offsets.get(key) ?? 0; offsets.set(key, index + 1); const position = getWorldScreenPosition({ x: effect.x, y: effect.y, center: feedbackCenter, viewportWidth: feedbackRect!.width, viewportHeight: feedbackRect!.height, tileCssSize: feedbackCellSize }); const zoomScale = typeof zoom === "number" ? zoom : 1; return <span key={effect.id} className={`world-view__floating-text world-view__floating-text--${effect.color} world-view__floating-text--${effect.kind}`} style={{ left: position.left, top: position.top - index * 12 * zoomScale, fontSize: `${14 * zoomScale}px`, "--world-floating-travel": `${11 * zoomScale}px` } as CSSProperties} aria-hidden="true">{effect.text}</span>; })}{tooltipEnemy && presentationAllowed(tooltipEnemy) && detected.has(tooltipEnemy.id) && !minimap && <section ref={tooltipRef} className="world-view__enemy-tooltip" aria-label={`${tooltipEnemy.name} information`} style={{ left: tooltipPosition?.left ?? -10000, top: tooltipPosition?.top ?? -10000, visibility: tooltipPosition ? "visible" : "hidden", ...tooltipMotion }}><div className="world-view__enemy-tooltip-section world-view__enemy-tooltip-section--portrait"><h2>Enemy: {tooltipEnemy.name}</h2><div className={`world-view__enemy-tooltip-portrait-box world-view__enemy-tooltip-portrait-box--${tooltipEnemy.name.toLowerCase()}`}><EnemyPortrait src={enemyStaticIdleFramePath(import.meta.env.BASE_URL, enemyCharacterForName(tooltipEnemy.graphic ?? tooltipEnemy.character ?? tooltipEnemy.name))} name={tooltipEnemy.name} /></div></div><div className="world-view__enemy-tooltip-section world-view__enemy-tooltip-section--resource-panel"><h2>RESOURCES</h2><EnemyResourceRows resources={tooltipEnemy.resources} /></div></section>}{campfireMenu && presentationAllowed(campfireMenu) && !minimap && movementPrompts && <MovementPrompt key={`${campfireMenu.x}:${campfireMenu.y}`} movement={movementPrompts} panelRef={campfireMenuRef} title="Interact" heading="Campfire" body={<i>Spend {REST_GOLD_COST} gold to rest and replenish status.</i>} visible={Boolean(campfireMenuPosition)} style={{ left: campfireMenuPosition?.left ?? -10000, top: campfireMenuPosition?.top ?? -10000 }} affirmation={{ direction: movementDirection(campaign.player, campfireMenu)!, label: "Bump to rest", disabled: campaign.counters.gold < REST_GOLD_COST, confirming: campfireRestConfirming, onAffirm: () => onCampfireRestRequested?.() }} onNegate={() => onCampfireMenuCancelled?.()} />}{mouseInteraction && worldAlive && selectedCell && reticleStyle && <i className={`world-view__grid-reticle world-view__grid-reticle--${reticleKind}`} style={reticleStyle}>{showPivotPoints && <span className="world-view__grid-reticle-code" aria-hidden="true">({String(selectedCell.y).padStart(2, "0")},{String(selectedCell.x).padStart(2, "0")})</span>}</i>}{!minimap && passiveMounted && <UiPassiveTransition phase={passivePhase} onPhaseComplete={finishPassivePhase} />}{!minimap && irisMounted && <UiIrisTransition phase={irisPhase} label={campfireRestPhase === "resting" ? campfireRestMessage : undefined} onPhaseComplete={finishIrisPhase} />}{!minimap && irisPhase === "open" && !rendererLoaded && message && <div role="status" className={minimap ? "minimap-view__message" : "world-view__message"}>{message}</div>}</div>;
}
