"""Copy only accepted active sprite sheets into the runtime asset tree."""
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DOC=ROOT/'rogues-dungeon/documentation/player-equipment-animation-sets'
RUNTIME=ROOT/'rogues-dungeon/public/assets/art/game-view/characters/hero-warrior/variants'
TOOL=Path('D:/Documents/Projects/VC/AI/ai-skills-tiled/skills/ai-skills-tiled-create-spritesheet-png/scripts/spritesheet-tool.py')


def main():
    records=[]
    for appearance in ['sword-only','shield-only','unarmed']:
        for family in ['directional','death']:
            folder=DOC/f'{appearance}-{family}-v3'
            result=subprocess.run([sys.executable,str(TOOL),'validate','--manifest',str(folder/'spritesheet-manifest.json'),'--acceptance'],capture_output=True,text=True)
            if result.returncode or not json.loads(result.stdout).get('ok'):raise ValueError(result.stdout+result.stderr)
            manifest=json.loads((folder/'spritesheet-manifest.json').read_text())
            sheets={s['id']:s for s in manifest['sheets']};frames={f['id']:f for f in manifest['frames']}
            for sequence in manifest['sequences']:
                active=[frames[fid] for fid in sequence['frames']]
                if len({f['sheet'] for f in active})!=1:raise ValueError('Clip must occupy one verified regular sheet')
                sheet=sheets[active[0]['sheet']];width,height=manifest['cellSize']
                if any(frame['rect']!=[i*width,0,width,height] for i,frame in enumerate(active)):raise ValueError('Clip order is not a native six-column strip')
                source=folder/sheet['file'];target=RUNTIME/appearance/(sequence['id']+'.png')
                target.parent.mkdir(parents=True,exist_ok=True)
                if target.exists() and target.read_bytes()!=source.read_bytes():raise FileExistsError(f'Runtime asset changed: {target}')
                if not target.exists():shutil.copyfile(source,target)
                records.append({'appearance':appearance,'clip':sequence['id'],'file':target.relative_to(ROOT).as_posix(),'sourceManifest':(folder/'spritesheet-manifest.json').relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'frameCount':len(active),'cellSize':[width,height],'columns':6,'rows':1})
    assert len(records)==30
    (DOC/'runtime-publication.json').write_text(json.dumps({'sheets':records,'additionalFrames':sum(r['frameCount'] for r in records)},indent=2)+'\n')
    print(f'Published {len(records)} accepted sheets for 144 additional frames.')


if __name__=='__main__':main()
