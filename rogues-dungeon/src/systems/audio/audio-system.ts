import type { GameEvent, GameMode, Preferences } from "../../game/types.ts";
export interface AudioHandle {
  preload?: string;
  currentTime?: number;
  volume: number;
  loop: boolean;
  play(): Promise<void> | void;
  pause?(): void;
  load?(): void;
  addEventListener?(type: "canplay" | "error", listener: () => void, options?: { once?: boolean }): void;
  removeEventListener?(type: "canplay" | "error", listener: () => void): void;
}
const baseUrl = import.meta.env?.BASE_URL ?? "/";

export const AUDIO_ASSETS = Object.freeze({
  music: Object.freeze([
    `${baseUrl}assets/audio/music/spooky_dungeon.ogg`,
    `${baseUrl}assets/audio/music/end_dungeon.mp3`,
    `${baseUrl}assets/audio/music/dungeon_04.ogg`,
  ]),
  sfx: Object.freeze({
    footstep: `${baseUrl}assets/audio/sfx/footstep.ogg`,
    weaponHit: `${baseUrl}assets/audio/sfx/weapon_hit.ogg`,
    enemyHit: `${baseUrl}assets/audio/sfx/enemy_hit.ogg`,
    enemyFall: `${baseUrl}assets/audio/sfx/enemy_fall.ogg`,
    potion: `${baseUrl}assets/audio/sfx/potion.ogg`,
    chest: `${baseUrl}assets/audio/sfx/chest.ogg`,
    pickupClick: `${baseUrl}assets/audio/sfx/pickup-click.wav`,
    collect: `${baseUrl}assets/audio/sfx/collect.ogg`,
    key: `${baseUrl}assets/audio/sfx/key.ogg`,
    inventory: `${baseUrl}assets/audio/sfx/inventory.ogg`,
    stairs: `${baseUrl}assets/audio/sfx/stairs.ogg`,
    accepted: `${baseUrl}assets/audio/sfx/ui_accept.ogg`,
    rejected: `${baseUrl}assets/audio/sfx/ui_reject.ogg`,
    menuClick: `${baseUrl}assets/audio/sfx/pickup-click.wav`,
    magicHeal: `${baseUrl}assets/audio/sfx/magic-heal.ogg`,
    magicWand: `${baseUrl}assets/audio/sfx/magic-wand.ogg`,
    magicAncient: `${baseUrl}assets/audio/sfx/magic-teleport.ogg`,
    barrelSlide: `${baseUrl}assets/audio/sfx/barrel-slide.wav`,
    crateHit01: `${baseUrl}assets/audio/sfx/wood-hit-01.ogg`,
    crateHit02: `${baseUrl}assets/audio/sfx/wood-hit-02.ogg`,
    crateHit03: `${baseUrl}assets/audio/sfx/wood-hit-03.ogg`,
    diceRoll: `${baseUrl}assets/audio/sfx/dice-roll.mp3`,
  }),
});

const eventCues: Readonly<Partial<Record<string, keyof typeof AUDIO_ASSETS.sfx>>> = Object.freeze({
  "player.moved": "footstep",
  "player.waited": "footstep",
  "enemy.defeated": "enemyFall",
  "potion.consumed": "potion",
  "item.collected": "pickupClick",
  "chest.opened": "chest",
  "realm.entered": "stairs",
  "barrel.pushed": "barrelSlide",
  "floor-trigger.changed": "barrelSlide",
  "xp.level.changed": "accepted",
});

const SFX_VOLUME_MULTIPLIERS: Readonly<Partial<Record<keyof typeof AUDIO_ASSETS.sfx, number>>> = Object.freeze({
  footstep: 0.25,
  key: 0.5,
  inventory: 0.5,
  barrelSlide: 0.45,
  crateHit01: 0.5,
  crateHit02: 0.5,
  crateHit03: 0.5,
  diceRoll: 0.8,
});

function readVolume(value: unknown, fallback: number) { return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100 ? value : fallback; }
function muteFromSearch(search: string) { return new URLSearchParams(search).get("mute") === "1"; }
function ignoreRejectedPlay(result: Promise<void> | void) { if (result && typeof result.catch === "function") result.catch(() => {}); }
function warmAudio(audio: AudioHandle) {
  audio.preload = "auto";
  const addListener = audio.addEventListener;
  const removeListener = audio.removeEventListener;
  if (!addListener || !removeListener) {
    audio.load?.();
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const finish = () => {
      removeListener.call(audio, "canplay", finish);
      removeListener.call(audio, "error", finish);
      resolve();
    };
    addListener.call(audio, "canplay", finish, { once: true });
    addListener.call(audio, "error", finish, { once: true });
    audio.load?.();
  });
}

export function createAudioManager({ search = "", createAudio = (src) => new Audio(src), random = Math.random,
  now = () => performance.now(), requestFrame = (callback) => requestAnimationFrame(callback), cancelFrame = (id) => cancelAnimationFrame(id),
}: { search?: string; createAudio?: (src: string) => AudioHandle; random?: () => number; now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => number; cancelFrame?: (id: number) => void } = {}) {
  const hardMuted = muteFromSearch(search);
  let preferences = { sfxVolume: 80, musicVolume: 1, muteAll: false };
  let musicStarted = false;
  let musicMode: GameMode = "General";
  let gains = [1, 0];
  let fade: { startedAt: number; from: number[]; to: number[] } | null = null;
  let fadeFrame: number | null = null;
  const prewarmedMusic: AudioHandle[] = [];
  const prewarmedSfx = new Map<keyof typeof AUDIO_ASSETS.sfx, AudioHandle[]>();
  const nextSfxHandle = new Map<keyof typeof AUDIO_ASSETS.sfx, number>();
  let warmupComplete = hardMuted;
  let warmup: Promise<void> | null = null;

  const busMuted = (bus: "sfx" | "music") => hardMuted || preferences.muteAll || preferences[`${bus}Volume`] === 0;
  const setPreferences = (value: Partial<Pick<Preferences, "sfxVolume" | "musicVolume" | "muteAll">> = {}) => {
    preferences = {
      sfxVolume: readVolume(value.sfxVolume, 80),
      musicVolume: readVolume(value.musicVolume, 1),
      muteAll: value.muteAll === true,
    };
    applyMusicVolumes();
  };

  const applyMusicVolumes = () => {
    const volume = busMuted("music") ? 0 : preferences.musicVolume / 100;
    prewarmedMusic.slice(0, 2).forEach((audio, index) => { audio.volume = gains[index] * volume; });
  };

  const sampleFade = () => {
    if (!fade) return;
    const progress = Math.min(1, Math.max(0, (now() - fade.startedAt) / 500));
    gains = fade.from.map((from, index) => from + (fade!.to[index] - from) * progress);
    applyMusicVolumes();
    if (progress === 1) {
      fade = null;
      prewarmedMusic.slice(0, 2).forEach((audio, index) => { if (gains[index] === 0) audio.pause?.(); });
    }
  };

  const updateFade = () => {
    fadeFrame = null; sampleFade();
    if (fade) fadeFrame = requestFrame(updateFade);
  };

  const setGameMode = (mode: GameMode) => {
    if (mode === musicMode) return;
    sampleFade();
    musicMode = mode;
    const target = mode === "Battle" ? [0, 1] : [1, 0];
    if (!musicStarted) { gains = target; return; }
    if (fadeFrame !== null) cancelFrame(fadeFrame);
    fade = { startedAt: now(), from: [...gains], to: target };
    applyMusicVolumes();
    if (!busMuted("music")) prewarmedMusic.slice(0, 2).forEach((audio) => ignoreRejectedPlay(audio.play()));
    fadeFrame = requestFrame(updateFade);
  };

  const prewarm = () => {
    if (warmup) return warmup;
    if (hardMuted) return Promise.resolve();
    prewarmedMusic.push(...AUDIO_ASSETS.music.map((src) => { const audio = createAudio(src); audio.volume = 0; return audio; }));
    for (const [cue, src] of Object.entries(AUDIO_ASSETS.sfx) as [keyof typeof AUDIO_ASSETS.sfx, string][]) {
      // A pair keeps repeated impacts responsive without requiring a cold element.
      prewarmedSfx.set(cue, [createAudio(src), createAudio(src)]);
    }
    const handles = [...prewarmedMusic, ...prewarmedSfx.values()].flat();
    warmup = Promise.all(handles.map(warmAudio)).then(() => { warmupComplete = true; });
    return warmup;
  };

  const playCue = (cue: keyof typeof AUDIO_ASSETS.sfx, now = Date.now()) => {
    const src = AUDIO_ASSETS.sfx[cue];
    if (!src || busMuted("sfx")) return false;
    // Calling play() while an element is still loading is supported by browsers and
    // preserves the user-gesture authorization that unlocked audio. Waiting for
    // canplay here loses that authorization on slower connections.
    prewarm();
    const handles = prewarmedSfx.get(cue);
    if (!handles?.length) return false;
    const index = nextSfxHandle.get(cue) ?? 0;
    const audio = handles[index];
    nextSfxHandle.set(cue, (index + 1) % handles.length);
    if (audio.currentTime !== undefined) audio.currentTime = 0;
    audio.volume = preferences.sfxVolume / 100 * (SFX_VOLUME_MULTIPLIERS[cue] ?? 1);
    ignoreRejectedPlay(audio.play());
    return true;
  };

  const playEvents = (events: (Pick<GameEvent, "type" | "facts"> & Partial<GameEvent>)[] = []) => {
    for (const event of events) {
      if (event.outcome === "rejected") continue;
      let cue = eventCues[event.type];
      if (event.type === "crate.bumped") {
        const crateHitCues = ["crateHit01", "crateHit02", "crateHit03"] as const;
        cue = crateHitCues[Math.min(crateHitCues.length - 1, Math.floor(random() * crateHitCues.length))];
      }
      if (event.type === "ability.used") {
        cue = event.facts?.abilityId === "heal" ? "magicHeal" : event.facts?.abilityId === "wand" ? "magicWand" : "magicAncient";
      }
      if (event.type === "combat.hit" && !event.facts?.source) cue = "weaponHit";
      if (event.type === "resource.changed" && event.facts?.cause === "enemy-attack") cue = "enemyHit";
      if (cue) playCue(cue);
    }
  };

  const startMusic = () => {
    if (busMuted("music")) return false;
    prewarm();
    applyMusicVolumes();
    const firstStart = !musicStarted;
    musicStarted = true;
    // Unlock both retained elements in the gesture; later transitions retain time.
    prewarmedMusic.slice(0, 2).forEach((audio, index) => {
      audio.loop = true;
      if (firstStart || gains[index] > 0 || fade) {
        const result = audio.play();
        ignoreRejectedPlay(result);
        if (result && firstStart) void result.then(() => { if (!fade && gains[index] === 0) audio.pause?.(); }).catch(() => {});
      }
    });
    return true;
  };

  const dispose = () => {
    if (fadeFrame !== null) cancelFrame(fadeFrame);
    fadeFrame = null; fade = null; musicStarted = false;
    prewarmedMusic.forEach((audio) => audio.pause?.());
  };

  const playDropResult = (accepted: boolean) => playCue(accepted ? "accepted" : "rejected");

  return Object.freeze({
    hardMuted,
    prewarm,
    isPrewarmed: () => warmupComplete,
    setPreferences,
    startMusic,
    setGameMode,
    dispose,
    playCue,
    playDropResult,
    playEvents,
    isMuted: (bus: "sfx" | "music" | null = null) => bus ? busMuted(bus) : hardMuted || preferences.muteAll,
  });
}
