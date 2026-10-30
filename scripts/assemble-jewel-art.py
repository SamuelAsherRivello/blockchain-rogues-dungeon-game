"""Pack generated Jewel sprites without changing the original twelve atlas cells."""
import argparse
import hashlib
import json
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "rogues-dungeon"
DOC = APP / "documentation"
ART = APP / "public/assets/art/game-view/items"
CELL, COLUMNS, ROWS = 362, 4, 6


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview-only", action="store_true")
    args = parser.parse_args()
    entries = json.loads((DOC / "jewel-art-prompts.json").read_text())["items"]
    sheet = Image.new("RGBA", (COLUMNS * CELL, ROWS * CELL))
    old = Image.open(ART / "droppable-item-sprite-sheet.png").convert("RGBA")
    assert old.width == COLUMNS * CELL and old.height in (3 * CELL, ROWS * CELL)
    original = old.crop((0, 0, COLUMNS * CELL, 3 * CELL))
    sheet.paste(original, (0, 0))
    contact = Image.new("RGB", (1350, 500), "#17141b")
    draw = ImageDraw.Draw(contact)
    font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 16)
    report = {"cell": CELL, "columns": COLUMNS, "rows": ROWS,
              "originalSectionSha256": hashlib.sha256(original.tobytes()).hexdigest(), "frames": []}
    for index, entry in enumerate(entries):
        image = Image.open(APP / entry["asset"]).convert("RGBA")
        alpha = image.getchannel("A")
        assert alpha.getextrema() == (0, 255), f"Missing true transparency: {entry['name']}"
        bounds = alpha.getbbox()
        assert bounds, f"Empty generated image: {entry['name']}"
        sprite = image.crop(bounds)
        sprite.thumbnail((CELL - 24, CELL - 24), Image.Resampling.NEAREST)
        cell = Image.new("RGBA", (CELL, CELL))
        cell.paste(sprite, ((CELL - sprite.width) // 2, (CELL - sprite.height) // 2))
        frame = 12 + index
        sheet.paste(cell, ((frame % COLUMNS) * CELL, (frame // COLUMNS) * CELL))
        native = cell.resize((32, 32), Image.Resampling.NEAREST)
        x, y = (index % 5) * 270, (index // 5) * 250
        contact.paste(native.resize((128, 128), Image.Resampling.NEAREST), (x + 16, y + 12), native.resize((128, 128), Image.Resampling.NEAREST))
        contact.paste(native, (x + 180, y + 64), native)
        label = entry["name"].replace("-", " ").title()
        draw.multiline_text((x + 14, y + 154), f"Frame {frame}\n" + "\n".join(textwrap.wrap(label, 24)), font=font, fill="#e8dec4", spacing=4)
        report["frames"].append({"name": entry["name"], "frame": frame, "alphaBounds": list(cell.getchannel("A").getbbox()),
                                  "nativeAlphaPixels": sum(value > 0 for value in native.getchannel("A").tobytes())})
    contact.save(DOC / "jewel-item-art.png")
    if not args.preview_only:
        assert sheet.crop((0, 0, original.width, original.height)).tobytes() == original.tobytes()
        assert sheet.crop((2 * CELL, 5 * CELL, 4 * CELL, 6 * CELL)).getchannel("A").getbbox() is None
        sheet.save(ART / "droppable-item-sprite-sheet.png")
        (DOC / "jewel-art-validation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
