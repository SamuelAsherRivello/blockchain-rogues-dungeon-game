import type { GameEvent, GameMode, Preferences } from "../../game/types.ts";
import { cuesForEvent } from "./audio-event-cues.ts";
export interface AudioHandle {
  preload?: string;
  currentTime?: number;
  volume: number;
  loop: boolean;
  playbackRate?: number;
  preservesPitch?: boolean;
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
    footstep: `${baseUrl}assets/audio/sfx/game-footstep-soft-01.wav`,
    weaponHit: `${baseUrl}assets/audio/sfx/weapon_hit.ogg`,
    enemyHit: `${baseUrl}assets/audio/sfx/enemy_hit.ogg`,
    enemyFall: `${baseUrl}assets/audio/sfx/enemy_fall.ogg`,
    potion: `${baseUrl}assets/audio/sfx/potion.ogg`,
    chest: `${baseUrl}assets/audio/sfx/chest.ogg`,
    pickupClick: `${baseUrl}assets/audio/sfx/pickup-click.wav`,
    collect: `${baseUrl}assets/audio/sfx/game-potion-pickup-02.wav`,
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
    woodBreak: `${baseUrl}assets/audio/sfx/game-wood-break-01.wav`,
    barrelReturn: `${baseUrl}assets/audio/sfx/game-barrel-return-01.wav`,
    doorLocked: `${baseUrl}assets/audio/sfx/game-door-locked-01.wav`,
    doorOpen: `${baseUrl}assets/audio/sfx/game-door-open-01.wav`,
    experienceGain: `${baseUrl}assets/audio/sfx/game-experience-gain-01.wav`,
    floorTrigger: `${baseUrl}assets/audio/sfx/game-trigger-pressure-01.wav`,
    moveBlocked: `${baseUrl}assets/audio/sfx/game-move-blocked-01.wav`,
    pickupRejected: `${baseUrl}assets/audio/sfx/game-pickup-rejected-01.wav`,
    playerDeath: `${baseUrl}assets/audio/sfx/game-player-death-01.wav`,
    playerSneak: `${baseUrl}assets/audio/sfx/game-player-sneak-01.wav`,
    playerWait: `${baseUrl}assets/audio/sfx/game-player-wait-01.wav`,
    stairsEnter: `${baseUrl}assets/audio/sfx/game-stairs-enter-01.wav`,
    resourceRestore: `${baseUrl}assets/audio/sfx/game-resource-restore-01.wav`,
    trapStrike: `${baseUrl}assets/audio/sfx/game-trap-strike-01.wav`,
    abilityAssign: `${baseUrl}assets/audio/sfx/ui-ability-assign-01.wav`,
    audioControl: `${baseUrl}assets/audio/sfx/ui-audio-control-01.wav`,
    musicMode: `${baseUrl}assets/audio/sfx/ui-music-mode-01.wav`,
    quickSlotAccepted: `${baseUrl}assets/audio/sfx/ui-quick-slot-affirmative-01.wav`,
    quickSlotRejected: `${baseUrl}assets/audio/sfx/ui-quick-slot-rejected-01.wav`,
    saveFailed: `${baseUrl}assets/audio/sfx/ui-save-failed-01.wav`,
    saveSucceeded: `${baseUrl}assets/audio/sfx/ui-save-succeeded-01.wav`,
    statUpgrade: `${baseUrl}assets/audio/sfx/ui-stat-upgrade-01.wav`,
    panelExpand: `${baseUrl}assets/audio/sfx/ui-panel-expand-01.wav`,
    panelCollapse: `${baseUrl}assets/audio/sfx/ui-panel-collapse-01.wav`,
    positiveShimmer: `${baseUrl}assets/audio/sfx/ui-positive-shimmer-01.wav`,
  }),
});

const SFX_VOLUME_MULTIPLIERS: Readonly<Partial<Record<keyof typeof AUDIO_ASSETS.sfx, number>>> = Object.freeze({
  footstep: 0.1,
  key: 0.5,
  collect: 0.55,
  inventory: 0.5,
  barrelSlide: 0.45,
  crateHit01: 0.5,
  crateHit02: 0.5,
  crateHit03: 0.5,
  diceRoll: 0.8,
  woodBreak: 0.5,
  barrelReturn: 0.4,
  doorLocked: 0.4,
  doorOpen: 0.4,
  experienceGain: 0.18,
  floorTrigger: 0.35,
  moveBlocked: 0.2,
  pickupRejected: 0.35,
  playerDeath: 0.65,
  playerSneak: 0.25,
  playerWait: 0.2,
  stairsEnter: 0.35,
  resourceRestore: 0.4,
  trapStrike: 0.5,
  abilityAssign: 0.4,
  audioControl: 0.35,
  musicMode: 0.25,
  quickSlotAccepted: 0.4,
  quickSlotRejected: 0.35,
  saveFailed: 0.5,
  saveSucceeded: 0.12,
  statUpgrade: 0.5,
  panelExpand: 0.35,
  panelCollapse: 0.35,
  positiveShimmer: 0.4,
});

const CUE_INTERVALS: Partial<Record<keyof typeof AUDIO_ASSETS.sfx, number>> = {
  moveBlocked: 180, doorLocked: 180, quickSlotRejected: 180,
  saveSucceeded: 5000, saveFailed: 2000, audioControl: 90,
};
const VARIED_CUES = new Set<keyof typeof AUDIO_ASSETS.sfx>(["footstep", "weaponHit", "enemyHit", "enemyFall", "barrelSlide", "barrelReturn", "woodBreak", "trapStrike"]);

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
  let hardMuted = muteFromSearch(search);
  let preferences = { sfxVolume: 80, musicVolume: 1, muteAll: false };
  let musicStarted = false;
  let musicMode: GameMode = "General";
  let gains = [1, 0];
  let fade: { startedAt: number; from: number[]; to: number[] } | null = null;
  let fadeFrame: number | null = null;
  const prewarmedMusic: AudioHandle[] = [];
  const prewarmedSfx = new Map<keyof typeof AUDIO_ASSETS.sfx, AudioHandle[]>();
  const nextSfxHandle = new Map<keyof typeof AUDIO_ASSETS.sfx, number>();
  const lastCueTimes = new Map<keyof typeof AUDIO_ASSETS.sfx, number>();
  let warmupComplete = hardMuted;
  let warmup: Promise<void> | null = null;

  const busMuted = (bus: "sfx" | "music") => hardMuted || preferences.muteAll || preferences[`${bus}Volume`] === 0;
  const stopMusicPlayback = () => {
    if (fadeFrame !== null) cancelFrame(fadeFrame);
    fadeFrame = null;
    if (fade) gains = [...fade.to];
    fade = null;
    prewarmedMusic.forEach((audio) => audio.pause?.());
  };
  const stopSfxPlayback = () => prewarmedSfx.forEach((handles) => handles.forEach((audio) => audio.pause?.()));
  const stopAllPlayback = () => { stopMusicPlayback(); stopSfxPlayback(); };
  const setPreferences = (value: Partial<Pick<Preferences, "sfxVolume" | "musicVolume" | "muteAll">> = {}) => {
    preferences = {
      sfxVolume: readVolume(value.sfxVolume, 80),
      musicVolume: readVolume(value.musicVolume, 1),
      muteAll: value.muteAll === true,
    };
    if (hardMuted || preferences.muteAll) stopAllPlayback();
    else {
      if (preferences.musicVolume === 0) stopMusicPlayback();
      if (preferences.sfxVolume === 0) stopSfxPlayback();
    }
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
    playCue("musicMode");
    const target = mode === "Battle" ? [0, 1] : [1, 0];
    if (!musicStarted) { gains = target; return; }
    if (busMuted("music")) {
      gains = target;
      stopMusicPlayback();
      applyMusicVolumes();
      return;
    }
    if (fadeFrame !== null) cancelFrame(fadeFrame);
    fade = { startedAt: now(), from: [...gains], to: target };
    applyMusicVolumes();
    if (!busMuted("music")) prewarmedMusic.slice(0, 2).forEach((audio) => ignoreRejectedPlay(audio.play()));
    fadeFrame = requestFrame(updateFade);
  };

  const prewarm = () => {
    if (warmup) return warmup;
    if (hardMuted || preferences.muteAll) return Promise.resolve();
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
    const interval = CUE_INTERVALS[cue];
    if (interval && now - (lastCueTimes.get(cue) ?? -Infinity) < interval) return false;
    // Calling play() while an element is still loading is supported by browsers and
    // preserves the user-gesture authorization that unlocked audio. Waiting for
    // canplay here loses that authorization on slower connections.
    prewarm();
    const handles = prewarmedSfx.get(cue);
    if (!handles?.length) return false;
    lastCueTimes.set(cue, now);
    const index = nextSfxHandle.get(cue) ?? 0;
    const audio = handles[index];
    nextSfxHandle.set(cue, (index + 1) % handles.length);
    if (audio.currentTime !== undefined) audio.currentTime = 0;
    audio.volume = preferences.sfxVolume / 100 * (SFX_VOLUME_MULTIPLIERS[cue] ?? 1);
    audio.preservesPitch = false;
    audio.playbackRate = VARIED_CUES.has(cue) ? 0.97 + Math.min(1, Math.max(0, random())) * 0.06 : 1;
    ignoreRejectedPlay(audio.play());
    return true;
  };

  const playEvents = (events: (Pick<GameEvent, "type" | "facts"> & Partial<GameEvent>)[] = []) => {
    const transactionCues = new Set<string>();
    for (const event of events) {
      if (event.type === "crate.bumped") {
        if (event.outcome === "rejected") continue;
        const crateHitCues = ["crateHit01", "crateHit02", "crateHit03"] as const;
        playCue(crateHitCues[Math.min(crateHitCues.length - 1, Math.floor(random() * crateHitCues.length))]);
        continue;
      }
      for (const cue of cuesForEvent(event)) {
        if (["resourceRestore", "experienceGain", "trapStrike", "doorOpen", "doorLocked"].includes(cue)) {
          if (transactionCues.has(cue)) continue;
          transactionCues.add(cue);
        }
        if (cue in AUDIO_ASSETS.sfx) playCue(cue as keyof typeof AUDIO_ASSETS.sfx);
      }
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
    stopSfxPlayback();
  };

  const playDropResult = (accepted: boolean) => playCue(accepted ? "accepted" : "rejected");

  return Object.freeze({
    get hardMuted() { return hardMuted; },
    setMutedByUrl(value: boolean) {
      hardMuted = value;
      if (!warmup) warmupComplete = value;
      if (hardMuted || preferences.muteAll) stopAllPlayback();
      applyMusicVolumes();
    },
    prewarm,
    isPrewarmed: () => warmupComplete,
    setPreferences,
    startMusic,
    setGameMode,
    dispose,
    playCue,
    playDropResult,
    playPanelToggle: (expanded: boolean) => playCue(expanded ? "panelExpand" : "panelCollapse"),
    playEvents,
    isMuted: (bus: "sfx" | "music" | null = null) => bus ? busMuted(bus) : hardMuted || preferences.muteAll,
  });
}
