"""User-authorized, bounded pixel repairs on the original Hero Warrior frames.

Imagegen trials are retained as references, not used as accepted source pixels.
All repairs use the supplied palette and fixed original canvas coordinates.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "rogues-dungeon/public/assets/art/game-view/characters/hero-warrior/frames"
DOC = ROOT / "rogues-dungeon/documentation/player-equipment-animation-sets"
OUT = DOC / "authored-frames-v6"
TRANSPARENT = (0, 0, 0, 0)
OUTLINE = (28, 28, 37, 255)
DARK = (45, 47, 59, 255)
WARM = {(107, 68, 54, 255), (148, 113, 89, 255), (177, 149, 121, 255), (163, 109, 45, 255)}
TRAIL = (215, 231, 233, 255)


def source(clip, index):
    return Image.open(SOURCE / clip / f"{index:02}.png").convert("RGBA")


def rect_mask(size, rect):
    mask = Image.new("L", size)
    ImageDraw.Draw(mask).rectangle((rect[0], rect[1], rect[2] - 1, rect[3] - 1), fill=255)
    return mask


def warm(pixel):
    return pixel in WARM


def mouth_y(image):
    points = [y for y in range(19, 38) for x in range(11, 24) if image.getpixel((x, y)) == TRAIL]
    return min(points) if points else 23


def fist(image, mask, x, y, rear=False):
    # Hand-designed closed glove; colors copied from the original glove palette.
    rows = [" oo   ", "oddo  ", "odmlo ", "odmmo ", " oddo ", "  oo  "]
    palette = {"o": OUTLINE, "d": (107, 68, 54, 255), "m": (148, 113, 89, 255), "l": (177, 149, 121, 255)}
    if rear:
        rows = [row[::-1] for row in rows]
    for yy, row in enumerate(rows):
        for xx, char in enumerate(row):
            if char == " ":
                continue
            px, py = x + xx, y + yy
            if 0 <= px < image.width and 0 <= py < image.height:
                image.putpixel((px, py), palette[char]); mask.putpixel((px, py), 255)


def forearm(image, mask, x, top, bottom, color):
    for y in range(top, bottom):
        for dx, pixel in [(0, OUTLINE), (1, color), (2, DARK)]:
            if 0 <= x+dx < image.width and 0 <= y < image.height:
                image.putpixel((x+dx,y),pixel); mask.putpixel((x+dx,y),255)


def remove_shield(original, clip, index):
    result = original.copy()
    direction = clip.split("/")[-1]
    if clip == "death":
        regions = [(24, 28, 31, 40), (24, 31, 32, 44), (28, 34, 37, 47), (28, 37, 42, 48), (28, 41, 40, 48), (28, 43, 40, 48)]
        rect = regions[index]
        mask = rect_mask(original.size, rect)
        for y in range(rect[1], rect[3]):
            for x in range(rect[0], rect[2]): result.putpixel((x, y), TRANSPARENT)
        if index < 4:
            forearm(result,mask,rect[0]+1,rect[1],min(rect[1]+6,45),DARK)
            fist(result, mask, rect[0], min(rect[1] + 5, 42))
        # The final shield lies beneath the collapsed body. Keep body pixels above it.
        else:
            fist(result, mask, 29, 40 if index == 4 else 42)
        return result, mask
    if direction == "up":
        search = (0, 25, 11, 43)
    elif direction == "side":
        search = (25, 25, 32, 43)
    else:
        search = (24, 26, 32, 44)
    points = [(x, y) for y in range(search[1], search[3]) for x in range(search[0], search[2]) if warm(original.getpixel((x, y)))]
    if not points:
        raise ValueError(f"Shield bounds not found: {clip}/{index}")
    left = 0 if direction == "up" else max(0, min(x for x, _ in points) - 1)
    right = 12 if direction == "up" else 32
    top = max(25, min(y for _, y in points) - 1)
    bottom = min(45, max(y for _, y in points) + 2)
    mask = rect_mask(original.size, (left, top, right, bottom))
    for y in range(top, bottom):
        for x in range(left, right): result.putpixel((x, y), TRANSPARENT)
    # Copy the existing body edge from the same pose where equipment obscures it.
    template = source(f"attack/{direction}", 1)
    dy = mouth_y(original) - mouth_y(template) if direction != "up" else 0
    for y in range(top, bottom):
        for x in range(left, right):
            inside_body = x >= 10 if direction == "up" else x <= 24
            sy = y - dy
            if inside_body and 0 <= sy < 48:
                result.putpixel((x, y), template.getpixel((x, sy)))
    if direction == "up":
        forearm(result,mask,5,top,top+7,DARK)
        fist(result, mask, 3, top + 5, rear=True)
    else:
        hand_x=min(25,left+1)
        forearm(result,mask,hand_x+1,top,top+6,DARK)
        fist(result, mask, hand_x, top + 4)
    if direction != "up" and (not clip.startswith("attack/") or index == 0):
        # The source blade crosses in front of the shield's left edge.
        highlights=[(x,y) for y in range(32,43) for x in range(7,27) if original.getpixel((x,y))==TRAIL]
        for hx,hy in highlights:
            for y in range(max(0,hy-1),min(48,hy+3)):
                for x in range(max(0,hx-1),min(26,hx+3)):
                    if not warm(original.getpixel((x,y))): result.putpixel((x,y),original.getpixel((x,y)))
    if clip.startswith("attack/"):
        for y in range(48):
            for x in range(32):
                if original.getpixel((x,y))==TRAIL:result.putpixel((x,y),TRAIL)
    return result, mask


def remove_sword(original, clip, index, idle_unarmed):
    result = original.copy(); mask = Image.new("L", original.size)
    if clip == "death":
        # Sword settles on the floor by frame 1. These bounds retain the falling torso.
        rects = [(8, 34, 27, 40), (3, 40, 29, 47), (2, 43, 30, 48), (2, 43, 30, 48), (2, 43, 29, 48), (2, 43, 29, 48)]
        rect = rects[index]; mask = rect_mask(original.size, rect)
        for y in range(rect[1], rect[3]):
            for x in range(rect[0], rect[2]):
                # Keep the corpse's boot/leg pixels above the sword's horizontal blade.
                result.putpixel((x, y), TRANSPARENT)
        if index < 4:
            template = source("attack/side", 1)
            dy=mouth_y(original)-mouth_y(template)
            for y in range(rect[1],rect[3]):
                for x in range(11,26):
                    sy=y-dy
                    if 0<=sy<48:result.putpixel((x,y),template.getpixel((x,sy)))
        else:
            for x in range(12,27):
                pixel=original.getpixel((x,42))
                if pixel[3]:
                    result.putpixel((x,43),pixel)
                    result.putpixel((x,44),DARK)
        return result, mask
    action, direction = clip.split("/")
    if action != "attack" or index == 0:
        if direction == "up":
            mask = rect_mask(original.size, (26, 31, 32, 40))
            for y in range(31, 40):
                for x in range(26, 32): result.putpixel((x, y), TRANSPARENT)
            forearm(result,mask,26,31,36,DARK)
            fist(result, mask, 25, 33)
            return result, mask
        # The raised attack provides original body pixels behind the idle waist blade.
        template = source(f"attack/{direction}", 1)
        dy = mouth_y(original) - mouth_y(template)
        whites = [(x, y) for y in range(32, 43) for x in range(6, 27) if original.getpixel((x, y)) == TRAIL]
        if not whites: raise ValueError(f"Waist blade not found: {clip}/{index}")
        left = min(x for x, _ in whites) - 2; right = max(x for x, _ in whites) + 3
        top = min(y for _, y in whites) - 1; bottom = max(y for _, y in whites) + 3
        mask = rect_mask(original.size, (left, top, min(27, right), min(43, bottom)))
        ImageDraw.Draw(mask).rectangle((7, top - 4, 11, min(42, bottom + 1)), fill=255)
        for y in range(48):
            for x in range(32):
                if not mask.getpixel((x, y)): continue
                if x < 11 and warm(original.getpixel((x, y))): continue
                sy = y - dy
                pixel = template.getpixel((x, sy)) if 10 <= x <= 24 and 0 <= sy < 48 else TRANSPARENT
                result.putpixel((x, y), pixel)
        return result, mask
    template = idle_unarmed[direction]
    if index == 1:
        regions = {"down": [(8, 4, 28, 11)], "side": [(0, 9, 18, 16)], "up": [(6, 9, 25, 16),(26,4,30,8)]}[direction]
    elif index == 2:
        regions = {"down": [(1, 13, 9, 32),(0,31,9,34),(4,36,7,42)], "side": [(26, 12, 32, 32)], "up": [(26, 22, 32, 27)]}[direction]
    else:
        regions = {"down": [(4, 28, 7, 43)], "side": [(26, 26, 32, 39),(8,34,24,41)], "up": [(27, 22, 32, 39)]}[direction]
    for rect in regions: ImageDraw.Draw(mask).rectangle((rect[0], rect[1], rect[2]-1, rect[3]-1), fill=255)
    for y in range(48):
        for x in range(32):
            pixel = original.getpixel((x, y))
            # The pale trail is separate from the helmet highlight and face/mouth.
            mouth = 11 <= x <= 22 and 20 <= y <= 25 and any(warm(original.getpixel((nx,ny))) for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)] if 0<=nx<32 and 0<=ny<48)
            shine = 15 <= x <= 21 and 10 <= y <= 15
            head = mouth or shine
            if pixel == TRAIL and not head: mask.putpixel((x, y), 255)
            if not mask.getpixel((x, y)): continue
            if warm(pixel): continue  # Retain the clenched hand in its original action pose.
            body = template.getpixel((x, y)) if 9 <= x <= 25 else TRANSPARENT
            result.putpixel((x, y), body)
    return result, mask


def main():
    if OUT.exists(): raise FileExistsError(OUT)
    OUT.mkdir()
    report = []
    original_records = json.loads((DOC / "source-inventory.json").read_text())["frames"]
    idle_unarmed = {}
    # First establish unchanged body references without their waist sword.
    for direction in ["down", "side", "up"]:
        original = source(f"idle/{direction}", 0)
        body, _ = remove_sword(original, f"idle/{direction}", 0, {})
        idle_unarmed[direction] = body
    for record in original_records:
        clip, index = record["clip"], record["index"]
        original = source(clip, index)
        sword_only, shield_mask = remove_shield(original, clip, index)
        shield_only, sword_mask = remove_sword(original, clip, index, idle_unarmed)
        unarmed, unarmed_sword_mask = remove_sword(sword_only, clip, index, idle_unarmed)
        # Explicitly remove isolated hilt/trail remnants found in the native-pixel review.
        fragments = [(4,27)] if clip == "attack/down" and index == 3 else []
        if clip == "death" and index in (2,3):fragments += [(4,42),(5,42)]
        for image,part in [(shield_only,sword_mask),(unarmed,unarmed_sword_mask)]:
            for point in fragments:image.putpixel(point,TRANSPARENT);part.putpixel(point,255)
        # Do not bring the shield back when source-body reconstruction touches its edge.
        for y in range(original.height):
            for x in range(original.width):
                if shield_mask.getpixel((x,y)) and not unarmed_sword_mask.getpixel((x,y)):
                    unarmed.putpixel((x,y),sword_only.getpixel((x,y)))
        for appearance, image, masks in [("sword-only", sword_only, [shield_mask]), ("shield-only", shield_only, [sword_mask]), ("unarmed", unarmed, [shield_mask, unarmed_sword_mask])]:
            target = OUT / appearance / clip / f"frame-{index:02}.png"
            target.parent.mkdir(parents=True, exist_ok=True); image.save(target)
            changed = 0
            for y in range(original.height):
                for x in range(original.width):
                    pixel = image.getpixel((x,y))
                    assert pixel[3] in (0,255), (clip,index,x,y)
                    if pixel != original.getpixel((x,y)):
                        assert any(mask.getpixel((x,y)) for mask in masks), (appearance,clip,index,x,y)
                        changed += 1
            mask = Image.new("L",original.size)
            for part in masks:
                for y in range(original.height):
                    for x in range(original.width):
                        if part.getpixel((x,y)): mask.putpixel((x,y),255)
            mask_path = OUT / appearance / clip / f"mask-{index:02}.png"; mask.save(mask_path)
            report.append({"appearance":appearance,"id":record["id"],"file":str(target.relative_to(ROOT)),"mask":str(mask_path.relative_to(ROOT)),"changedPixels":changed,"protectedPixelChanges":0,"partialAlphaPixels":0,"pixelHash":hashlib.sha256(image.tobytes()).hexdigest()})
    (DOC/"manual-pixel-repair-validation.json").write_text(json.dumps({"status":"pending-visual-review","authorization":"User explicitly allowed targeted manual pixel edits on 2026-10-29.","frames":report},indent=2)+'\n')
    # Review sheets preserve original registration and show the entire three-set family.
    for appearance in ["sword-only","shield-only","unarmed"]:
        canvas=Image.new("RGBA",(6*144,10*168),(222,222,222,255)); draw=ImageDraw.Draw(canvas)
        clips=list(dict.fromkeys(r['clip'] for r in original_records))
        for row,clip in enumerate(clips):
            records=[r for r in original_records if r['clip']==clip]
            for record in records:
                im=Image.open(OUT/appearance/clip/f"frame-{record['index']:02}.png")
                x=record['index']*144;y=row*168
                draw.text((x+2,y+2),record['id'],fill='black')
                canvas.alpha_composite(im.resize((im.width*3,im.height*3),Image.Resampling.NEAREST),(x+(144-im.width*3)//2,y+20))
        canvas.save(DOC/f"{appearance}-manual-contact-v6.png")
    print(f"Authored {len(report)} variant frames with bounded masks; visual acceptance remains pending.")


if __name__ == '__main__': main()
