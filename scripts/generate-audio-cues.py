"""Rebuild original Rogue's Dungeon cues. Python standard library only.

All output is original synthesized audio, dedicated to CC0. No samples used.
Run from the repository root: python scripts/generate-audio-cues.py
"""

import math
from pathlib import Path
import random
import struct
import wave

RATE = 22050
DESTINATION = Path(__file__).resolve().parents[1] / "rogues-dungeon/public/assets/audio/sfx"


def render(name, duration, notes=(), noise=0, decay=9, lowpass=.63, seed=1):
    rng = random.Random(seed)
    filtered = 0
    samples = []
    for index in range(round(duration * RATE)):
        time = index / RATE
        progress = time / duration
        attack = min(1, time / .006)
        release = min(1, (duration - time) / .025)
        envelope = attack * release * math.exp(-decay * progress)
        filtered = lowpass * filtered + (1 - lowpass) * rng.uniform(-1, 1)
        value = filtered * noise
        for frequency, gain, offset, sweep in notes:
            local = time - offset
            if local >= 0:
                note_env = min(1, local / .005) * math.exp(-8 * local / duration)
                phase = 2 * math.pi * (frequency * local + sweep * local * local / 2)
                value += math.sin(phase) * gain * note_env
        samples.append(value * envelope)
    peak = max(abs(value) for value in samples) or 1
    # Quiet, short cues with enough headroom to mix with combat and music.
    pcm = b"".join(struct.pack("<h", round(value / peak * 14500)) for value in samples)
    path = DESTINATION / f"{name}.wav"
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm)


# Each tuple is frequency, amplitude, delay in seconds, and frequency sweep.
CUES = {
    "game-wood-break-01": (.36, [(135, .5, 0, -180), (247, .3, .04, -250), (420, .2, .09, -400)], 1.5, 4),
    "game-barrel-return-01": (.34, [(95, .5, 0, 140), (190, .25, .07, 80)], 1, 3),
    "game-door-locked-01": (.24, [(148, .6, 0, -60), (311, .4, .06, 0)], .7, 5),
    "game-door-open-01": (.40, [(180, .45, 0, 320), (520, .18, .10, -200)], .5, 3),
    "game-experience-gain-01": (.18, [(880, .55, 0, 400), (1320, .35, .04, 0)], 0, 3),
    "game-trigger-pressure-01": (.16, [(100, .65, 0, -90), (380, .25, .025, -100)], .8, 5),
    "game-move-blocked-01": (.10, [(115, .6, 0, -100)], .2, 6),
    "game-pickup-rejected-01": (.20, [(370, .5, 0, -200), (260, .5, .07, -100)], 0, 3),
    "game-player-death-01": (.72, [(330, .55, 0, -320), (220, .35, .10, -170), (110, .4, .24, -70)], .22, 1),
    "game-player-sneak-01": (.14, [(240, .12, 0, -180)], .9, 4),
    "game-player-wait-01": (.10, [(180, .4, 0, 0), (360, .15, .015, 0)], .1, 6),
    "game-stairs-enter-01": (.24, [(210, .5, 0, -180), (105, .3, .07, -60)], .6, 3),
    "game-resource-restore-01": (.38, [(440, .4, 0, 150), (660, .3, .07, 100), (880, .3, .14, 0)], 0, 2),
    "game-trap-strike-01": (.22, [(1700, .35, 0, -2600), (170, .5, .01, -180)], 1, 6),
    "ui-ability-assign-01": (.22, [(550, .4, 0, 0), (825, .4, .065, 0)], 0, 2),
    "ui-audio-control-01": (.10, [(660, .5, 0, 0)], 0, 4),
    "ui-music-mode-01": (.24, [(165, .4, 0, 130), (330, .25, .04, 100)], .2, 2),
    "ui-quick-slot-affirmative-01": (.16, [(420, .5, 0, 0), (630, .4, .04, 0)], .12, 3),
    "ui-quick-slot-rejected-01": (.17, [(300, .5, 0, -80), (200, .4, .055, 0)], 0, 3),
    "ui-save-failed-01": (.36, [(440, .5, 0, 0), (311, .45, .10, 0), (220, .4, .20, 0)], 0, 1),
    "ui-save-succeeded-01": (.12, [(1047, .5, 0, 0), (1568, .25, .035, 0)], 0, 4),
    "ui-stat-upgrade-01": (.42, [(523, .4, 0, 0), (659, .35, .075, 0), (784, .4, .15, 0), (1047, .3, .225, 0)], 0, 1),
    "game-footstep-soft-01": (.14, [(72, .12, 0, -80)], .8, 6, .94),
    "ui-panel-expand-01": (.065, [(650, .5, 0, 3600)], .1, 4),
    "ui-panel-collapse-01": (.065, [(650, .5, 0, -3000)], .1, 4),
    "ui-positive-shimmer-01": (.55, [(659, .45, 0, 0), (988, .35, .06, 0), (1318, .2, .12, 0)], 0, 1.8),
}

if __name__ == "__main__":
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for seed, (name, arguments) in enumerate(CUES.items(), 1):
        render(name, *arguments, seed=seed)
    print(f"Wrote {len(CUES)} original WAV cues to {DESTINATION}")
