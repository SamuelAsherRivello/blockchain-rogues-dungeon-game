"""Inventory original hero pixels and prepare requests for the shared art skill."""

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "rogues-dungeon/public/assets/art/game-view/characters/hero-warrior"
OUTPUT = ROOT / "rogues-dungeon/documentation/player-equipment-animation-sets"
SKILL = Path("D:/Documents/Projects/VC/AI/ai-skills-tiled/skills/ai-skills-tiled-create-spritesheet-png")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(name, value):
    target = OUTPUT / name
    if target.exists():
        raise FileExistsError(target)
    target.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    clips = [(f"{action}/{direction}", count, duration, loop)
             for action, count, duration, loop in [("idle", 4, 140, True), ("run", 6, 100, True), ("attack", 4, 90, False)]
             for direction in ["down", "side", "up"]]
    clips.append(("death", 6, 120, False))
    records = []
    for family, width in [("directional", 32), ("death", 48)]:
        frames, sequences = [], []
        for clip, count, duration, loop in clips:
            if (clip == "death") != (family == "death"):
                continue
            ids = []
            for index in range(count):
                path = ART / "frames" / clip / f"{index:02}.png"
                with Image.open(path) as image:
                    assert image.size == (width, 48), path
                    rgba = image.convert("RGBA").tobytes()
                frame_id = f"{clip.replace('/', '-')}-{index:02}"
                ids.append(frame_id)
                records.append({"id": frame_id, "clip": clip, "index": index,
                                "path": path.relative_to(ROOT).as_posix(), "size": [width, 48],
                                "encodedSha256": sha(path), "rgbaSha256": hashlib.sha256(rgba).hexdigest()})
                frames.append({"id": frame_id, "image": str(path), "rect": [0, 0, width, 48],
                               "sourceAnchor": [width // 2, 48], "sheet": clip.replace("/", "-"),
                               "direction": clip.split("/")[-1] if "/" in clip else "none"})
            sequences.append({"id": clip.replace("/", "-"), "frames": ids,
                              "durationsMs": [duration] * count, "loop": loop,
                              "direction": clip.split("/")[-1] if "/" in clip else "none"})
        request = {"schemaVersion": 1, "entity": {"id": f"hero-warrior-{family}", "kind": "character"},
                   "mode": "animated", "operation": "create", "cellSize": [width, 48],
                   "anchor": [width // 2, 48], "style": {"name": "Dungeons-and-Pixels Hero Warrior", "pixelArt": True},
                   "background": "transparent", "scale": 1, "expectedFrameCount": len(frames),
                   "frames": frames, "sequences": sequences, "layout": {"columns": 6, "margin": 0, "spacing": 0},
                   "sourceHashes": [{"path": frame["image"], "sha256": sha(Path(frame["image"]))} for frame in frames],
                   "provenance": {"artSource": "existing", "identityReference": str(ART / "frames/idle/side/00.png"),
                                  "notes": "Unmodified source pixels. No image generation. Base timing; runtime speed 0.5."}}
        write(f"baseline-{family}-request.json", request)
    assert len(records) == 48
    shadow = ART / "shadow.png"
    skill_files = ["SKILL.md", "scripts/spritesheet-tool.py", "references/art-contract.md",
                   "references/revisions.md", "references/verification.md"]
    ref = SKILL.parents[1] / ".git/refs/heads/main"
    write("source-inventory.json", {"schemaVersion": 1, "frames": records,
                                   "shadow": {"path": shadow.relative_to(ROOT).as_posix(), "sha256": sha(shadow)},
                                   "skill": {"name": "ai-skills-tiled-create-spritesheet-png", "path": str(SKILL),
                                             "sourceRevision": ref.read_text().strip() if ref.exists() else "see file hashes",
                                             "files": [{"path": name, "sha256": sha(SKILL / name)} for name in skill_files]},
                                   "tools": {"pythonPillow": Image.__version__, "imagegen": "built-in edit tool; not yet invoked"},
                                   "intendedOperation": "modify", "originalRegistrationTranslation": [0, 0]})
    print(f"Prepared {len(records)} original frames, shadow, and two skill build requests in {OUTPUT}")


if __name__ == "__main__":
    main()
