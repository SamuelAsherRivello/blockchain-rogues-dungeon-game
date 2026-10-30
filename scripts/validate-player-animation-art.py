"""Verify source preservation and every manually repaired native frame."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
DOC=ROOT/'rogues-dungeon/documentation/player-equipment-animation-sets'


def verify_frame(original, candidate, mask, palette):
    if original.size!=candidate.size or mask.size!=original.size:
        raise ValueError('Frame or mask dimensions do not match the original')
    changed=0
    for y in range(original.height):
        for x in range(original.width):
            old=original.getpixel((x,y));new=candidate.getpixel((x,y))
            if new[3] not in (0,255):raise ValueError('Partial alpha is not allowed in native pixel art')
            if new[3] and new not in palette:raise ValueError('Color is outside the original palette')
            if new!=old:
                changed+=1
                if not mask.getpixel((x,y)):raise ValueError('Protected original pixel changed')
    return changed


def validate():
    inventory=json.loads((DOC/'source-inventory.json').read_text())
    originals={};palette=set()
    for frame in inventory['frames']:
        path=ROOT/frame['path']
        if hashlib.sha256(path.read_bytes()).hexdigest()!=frame['encodedSha256']:
            raise ValueError('Original PNG bytes changed: '+frame['id'])
        with Image.open(path) as im:originals[frame['id']]=im.convert('RGBA')
        palette.update(originals[frame['id']].get_flattened_data())
    shadow=inventory['shadow']
    if hashlib.sha256((ROOT/shadow['path']).read_bytes()).hexdigest()!=shadow['sha256']:
        raise ValueError('Original shared shadow changed')
    report=json.loads((DOC/'manual-pixel-repair-validation.json').read_text())
    seen=set()
    for frame in report['frames']:
        key=(frame['appearance'],frame['id'])
        if key in seen:raise ValueError('Duplicate frame mapping')
        seen.add(key)
        with Image.open(ROOT/frame['file']) as im:candidate=im.convert('RGBA')
        with Image.open(ROOT/frame['mask']) as im:mask=im.convert('L')
        changed=verify_frame(originals[frame['id']],candidate,mask,palette)
        if changed!=frame['changedPixels'] or hashlib.sha256(candidate.tobytes()).hexdigest()!=frame['pixelHash']:
            raise ValueError('Authored frame no longer matches its repair report')
    expected={(appearance,frame_id) for appearance in ['sword-only','shield-only','unarmed'] for frame_id in originals}
    if seen!=expected:raise ValueError('Missing variant frame')
    result={'ok':True,'originalFrames':len(originals),'additionalFrames':len(seen),'totalFrames':len(originals)+len(seen),'protectedPixelChanges':0,'registrationTranslation':[0,0],'palette':'original-source-only','alpha':'binary','visualAcceptance':'separate-hash-bound-skill-reviews'}
    (DOC/'pixel-preservation-validation.json').write_text(json.dumps(result,indent=2)+'\n')
    return result


if __name__=='__main__':
    print(json.dumps(validate()))
