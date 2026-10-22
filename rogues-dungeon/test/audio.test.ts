import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { AUDIO_ASSETS, createAudioManager } from '../src/systems/audio/audio-system.ts';

function recorder() {
  const made: { src: string; volume: number; loop: boolean; playCount: number; pauseCount: number; play(): Promise<void>; pause(): void }[] = [];
  return { made, createAudio(src: string) { const audio = { src, volume: 1, loop: false, playCount: 0, pauseCount: 0, play() { this.playCount++; return Promise.resolve(); }, pause() { this.pauseCount++; } }; made.push(audio); return audio; } };
}

test('mode soundtrack crossfades for 500ms, reverses smoothly and retains positions', async () => {
  let time = 0; let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const made: { src: string; volume: number; currentTime: number; loop: boolean; paused: boolean; play(): Promise<void>; pause(): void }[] = [];
  const audio = createAudioManager({ now: () => time, requestFrame: (callback) => { frames.set(++id, callback); return id; }, cancelFrame: (key) => { frames.delete(key); },
    createAudio: (src) => { const handle = { src, volume: 0, currentTime: 0, loop: false, paused: true, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } }; made.push(handle); return handle; } });
  const advance = (ms: number) => { time += ms; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback(time)); };
  audio.setPreferences({ musicVolume: 100 }); audio.startMusic(); await Promise.resolve();
  const [general, battle, unused] = made;
  general.currentTime = 24; battle.currentTime = 8;
  assert.equal(general.volume, 1); assert.equal(battle.volume, 0); assert.equal(unused.paused, true);
  audio.setGameMode('Battle'); advance(250);
  assert.equal(general.volume, .5); assert.equal(battle.volume, .5);
  audio.setGameMode('General'); advance(250);
  assert.equal(general.volume, .75); assert.equal(battle.volume, .25);
  audio.setPreferences({ musicVolume: 40 }); assert.ok(Math.abs(general.volume - .3) < 1e-10);
  audio.setPreferences({ musicVolume: 40, muteAll: true });
  advance(250); assert.equal(general.volume, 0); assert.equal(battle.volume, 0); assert.equal(battle.paused, true);
  audio.setPreferences({ musicVolume: 100 }); assert.equal(general.volume, 1);
  audio.setGameMode('Battle'); advance(500);
  assert.equal(general.paused, true); assert.equal(battle.volume, 1);
  audio.setGameMode('General'); advance(500);
  assert.equal(general.currentTime, 24); assert.equal(battle.currentTime, 8);
  audio.setGameMode('Battle'); audio.dispose(); assert.equal(frames.size, 0); assert.equal(general.paused, true); assert.equal(battle.paused, true);
});

test('query mute prevents audio creation and stays authoritative over preferences', () => {
  const fake = recorder(); const audio = createAudioManager({ search: '?seed=abc&mute=1', createAudio: fake.createAudio });
  audio.setPreferences({ sfxVolume: 100, musicVolume: 100, muteAll: false });
  assert.equal(audio.hardMuted, true); assert.equal(audio.isMuted('sfx'), true); assert.equal(audio.isMuted('music'), true);
  assert.equal(audio.startMusic(), false); assert.equal(audio.playCue('accepted'), false);
  audio.playEvents([{ type: 'player.moved', outcome: 'committed', facts: {} }]);
  assert.equal(fake.made.length, 0);
});

test('Mute All skips preloading and pauses active audio instead of playing it at zero volume', async () => {
  const mutedRecorder = recorder();
  const muted = createAudioManager({ createAudio: mutedRecorder.createAudio });
  muted.setPreferences({ sfxVolume: 80, musicVolume: 20, muteAll: true });
  await muted.prewarm();
  assert.equal(mutedRecorder.made.length, 0);
  assert.equal(muted.startMusic(), false);
  assert.equal(muted.playCue('accepted'), false);

  const activeRecorder = recorder();
  const active = createAudioManager({ createAudio: activeRecorder.createAudio });
  await active.prewarm();
  active.setPreferences({ sfxVolume: 80, musicVolume: 20, muteAll: false });
  active.startMusic();
  active.playCue('accepted');
  const playCount = activeRecorder.made.reduce((total, audio) => total + audio.playCount, 0);
  active.setPreferences({ sfxVolume: 80, musicVolume: 20, muteAll: true });
  assert.ok(activeRecorder.made.every((audio) => audio.pauseCount === 1));
  active.setGameMode('Battle');
  assert.equal(active.startMusic(), false);
  assert.equal(active.playCue('accepted'), false);
  assert.equal(activeRecorder.made.reduce((total, audio) => total + audio.playCount, 0), playCount);
});

test('URL mute can be cleared and reapplied without recreating the audio manager', async () => {
  const fake = recorder();
  const audio = createAudioManager({ search: '?mute=1', createAudio: fake.createAudio });
  await audio.prewarm();
  assert.equal(fake.made.length, 0);
  audio.setMutedByUrl(false);
  assert.equal(audio.hardMuted, false);
  assert.equal(audio.isPrewarmed(), false);
  audio.setPreferences({ sfxVolume: 80, musicVolume: 40, muteAll: false });
  assert.equal(audio.startMusic(), true);
  assert.equal(audio.playCue('accepted'), true);
  await audio.prewarm();
  assert.equal(audio.isPrewarmed(), true);
  const music = fake.made[0];
  assert.equal(music.volume, .4);
  audio.setMutedByUrl(true);
  assert.equal(audio.hardMuted, true);
  assert.equal(music.volume, 0);
  assert.equal(audio.playCue('accepted'), false);
  audio.setMutedByUrl(false);
  assert.equal(music.volume, .4);
});

test('prewarming loads the complete catalog while ordinary playback stays available', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio, random: () => 0 });
  audio.setPreferences({ sfxVolume: 35, musicVolume: 24, muteAll: false });
  assert.equal(audio.playCue('accepted'), true);
  const firstWarmup = audio.prewarm();
  assert.equal(audio.isPrewarmed(), false);
  assert.equal(audio.prewarm(), firstWarmup);
  await firstWarmup;
  assert.equal(audio.isPrewarmed(), true);
  assert.deepEqual(fake.made.map(({ src }) => src), [...AUDIO_ASSETS.music, ...Object.values(AUDIO_ASSETS.sfx).flatMap((src) => [src, src])]);
  assert.equal(audio.startMusic(), true);
  const music = fake.made[0];
  assert.equal(music.src, AUDIO_ASSETS.music[0]); assert.equal(music.loop, true); assert.equal(music.volume, 0.24);
  assert.equal(audio.playCue('accepted'), true); assert.equal(fake.made.find(({ src }) => src === AUDIO_ASSETS.sfx.accepted)?.volume, 0.35);
  audio.setPreferences({ sfxVolume: 0, musicVolume: 47, muteAll: false });
  assert.equal(music.volume, 0.47); assert.equal(audio.isMuted('sfx'), true); assert.equal(audio.isMuted('music'), false);
  assert.equal(audio.playCue('accepted'), false);
  audio.setPreferences({ sfxVolume: 80, musicVolume: 20, muteAll: true });
  assert.equal(music.volume, 0); assert.equal(audio.playCue('accepted'), false); assert.equal(audio.isMuted(), true);
});

test('music begins from the activating gesture before preloading completes', () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio, random: () => 0 });
  assert.equal(audio.isPrewarmed(), false);
  assert.equal(audio.startMusic(), true);
  assert.equal(fake.made[0].playCount, 1);
});

test('committed simulation events map to their expected cues and rejected events stay quiet', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio, random: () => 0 });
  audio.setPreferences({ sfxVolume: 80, musicVolume: 20, muteAll: false });
  await audio.prewarm();
  audio.playEvents([
    { type: 'player.moved', outcome: 'committed', facts: {} },
    { type: 'player.waited', outcome: 'committed', facts: {} },
    { type: 'combat.hit', outcome: 'committed', facts: { roll: 63 } },
    { type: 'combat.hit', outcome: 'committed', facts: { source: 'wand' } },
    { type: 'resource.changed', outcome: 'committed', facts: { cause: 'enemy-attack' } },
    { type: 'enemy.defeated', outcome: 'committed', facts: {} },
    { type: 'item.collected', outcome: 'committed', facts: {} },
    { type: 'potion.consumed', outcome: 'committed', facts: {} },
    { type: 'chest.opened', outcome: 'committed', facts: {} },
    { type: 'crate.bumped', outcome: 'committed', facts: {} },
    { type: 'crate.bumped', outcome: 'committed', facts: {} },
    { type: 'realm.entered', outcome: 'committed', facts: {} },
    { type: 'ability.used', outcome: 'committed', facts: { abilityId: 'heal' } },
    { type: 'ability.used', outcome: 'committed', facts: { abilityId: 'wand' } },
    { type: 'ability.used', outcome: 'committed', facts: {} },
    { type: 'barrel.pushed', outcome: 'committed', facts: {} },
    { type: 'floor-trigger.changed', outcome: 'committed', facts: { active: true } },
    { type: 'xp.level.changed', outcome: 'committed', facts: { level: 2 } },
    { type: 'xp.level.changed', outcome: 'committed', facts: { level: 3 } },
    { type: 'combat.hit', outcome: 'rejected', facts: {} },
  ]);
  assert.deepEqual(new Set(fake.made.filter(({ playCount }) => playCount > 0).map(({ src }) => src)), new Set([AUDIO_ASSETS.sfx.footstep, AUDIO_ASSETS.sfx.weaponHit, AUDIO_ASSETS.sfx.enemyHit, AUDIO_ASSETS.sfx.enemyFall, AUDIO_ASSETS.sfx.pickupClick, AUDIO_ASSETS.sfx.potion, AUDIO_ASSETS.sfx.chest, AUDIO_ASSETS.sfx.stairs, AUDIO_ASSETS.sfx.magicHeal, AUDIO_ASSETS.sfx.magicWand, AUDIO_ASSETS.sfx.magicAncient, AUDIO_ASSETS.sfx.barrelSlide, AUDIO_ASSETS.sfx.crateHit01, AUDIO_ASSETS.sfx.accepted, AUDIO_ASSETS.sfx.diceRoll]));
  assert.equal(fake.made.filter(({ src }) => src === AUDIO_ASSETS.sfx.crateHit01).reduce((total, audio) => total + audio.playCount, 0), 2);
  assert.equal(fake.made.filter(({ src }) => src === AUDIO_ASSETS.sfx.accepted).reduce((total, audio) => total + audio.playCount, 0), 2);
});

test('equipment drop feedback distinguishes accepted and rejected drops', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio });
  await audio.prewarm();
  audio.playDropResult(true); audio.playDropResult(false);
  assert.deepEqual(fake.made.filter(({ playCount }) => playCount > 0).map(({ src }) => src), [AUDIO_ASSETS.sfx.accepted, AUDIO_ASSETS.sfx.rejected]);
  const muted = createAudioManager({ search: '?mute=1', createAudio: fake.createAudio });
  assert.equal(muted.playDropResult(true), false);
});

test('each movement plays a footstep and bundled audio assets exist', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio });
  await audio.prewarm();
  assert.equal(audio.playCue('footstep', 1000), true); assert.equal(fake.made.find(({ src }) => src === AUDIO_ASSETS.sfx.footstep)?.volume, 0.2); assert.equal(audio.playCue('footstep', 1050), true);
  assert.equal(fake.made.filter(({ src, playCount }) => src === AUDIO_ASSETS.sfx.footstep && playCount > 0).length, 2);
  audio.playCue('key'); assert.equal(fake.made.find(({ src }) => src === AUDIO_ASSETS.sfx.key)?.volume, 0.4);
  audio.playCue('inventory'); assert.equal(fake.made.find(({ src }) => src === AUDIO_ASSETS.sfx.inventory)?.volume, 0.4);
  const root = new URL('../public/assets/audio/', import.meta.url);
  const docs = await readFile(new URL('../documentation/audio.md', import.meta.url), 'utf8');
  assert.equal(AUDIO_ASSETS.music.length, 3); assert.equal(Object.keys(AUDIO_ASSETS.sfx).length, 22);
  for (const path of [...AUDIO_ASSETS.music, ...Object.values(AUDIO_ASSETS.sfx)]) {
    await access(new URL(path.replace(/^.*?assets\/audio\//, ''), root));
    assert.ok(docs.includes(path.split('/').at(-1)!), `missing provenance entry for ${path}`);
  }
  assert.match(docs, /Diegetic/); assert.match(docs, /Non-diegetic/); assert.match(docs, /CC0/);
});

test('crate bumps randomly choose among the three wood hit variations', async () => {
  const fake = recorder(); const values = [0, 0.34, 0.99];
  const audio = createAudioManager({ createAudio: fake.createAudio, random: () => values.shift() ?? 0 });
  await audio.prewarm();
  audio.playEvents([
    { type: 'crate.bumped', outcome: 'committed', facts: {} },
    { type: 'crate.bumped', outcome: 'committed', facts: {} },
    { type: 'crate.bumped', outcome: 'committed', facts: {} },
  ]);
  assert.deepEqual(fake.made.filter(({ playCount }) => playCount > 0).map(({ src }) => src), [AUDIO_ASSETS.sfx.crateHit01, AUDIO_ASSETS.sfx.crateHit02, AUDIO_ASSETS.sfx.crateHit03]);
});
