"""Build manually repaired frames through the completed sprite-sheet skill."""
import json
import subprocess
import sys
import shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DOC=ROOT/'rogues-dungeon/documentation/player-equipment-animation-sets'
TOOL=Path('D:/Documents/Projects/VC/AI/ai-skills-tiled/skills/ai-skills-tiled-create-spritesheet-png/scripts/spritesheet-tool.py')
REVISION=3


def main():
    outputs=[]
    for appearance in ['sword-only','shield-only','unarmed']:
        for family in ['directional','death']:
            request=json.loads((DOC/f'baseline-{family}-request.json').read_text())
            request['operation']='modify'
            request['parent']=str(DOC/('baseline-directional-v2' if family=='directional' else 'baseline-death-v1')/'spritesheet-manifest.json')
            request.pop('sourceHashes',None)
            for frame in request['frames']:
                clip=frame['sheet'].replace('-','/') if frame['sheet']!='death' else 'death'
                index=int(frame['id'].split('-')[-1])
                frame['image']=str(DOC/'authored-frames-v6'/appearance/clip/f'frame-{index:02}.png')
            request['provenance']={'artSource':'existing-with-user-authorized-manual-pixel-repairs','identityReference':str(ROOT/'rogues-dungeon/public/assets/art/game-view/characters/hero-warrior/frames/idle/side/00.png'),'notes':'Two imagegen shield-removal trials were retained as references and rejected for haze. User explicitly authorized targeted pixel repairs on 2026-10-29. Original palette, binary alpha, protected original pixels and coordinates retained. See manual-pixel-repair-validation.json and per-frame masks.'}
            path=DOC/f'{appearance}-{family}-request-v{REVISION}.json'
            if path.exists():
                if json.loads(path.read_text())!=request:raise ValueError(f'Request changed: {path}')
            else:path.write_text(json.dumps(request,indent=2)+'\n')
            output=DOC/f'{appearance}-{family}-v{REVISION}'
            if not (output/'spritesheet-manifest.json').exists():
                # Vite watches the app documentation tree. Stage outside that tree so
                # Windows watcher handles cannot lock the helper's atomic rename.
                work_root=ROOT/'output/player-animation-libraries'
                work_root.mkdir(parents=True,exist_ok=True)
                for attempt in range(1,4):
                    staged=work_root/f'{appearance}-{family}-v{REVISION}-attempt-{attempt}'
                    if staged.exists():continue
                    result=subprocess.run([sys.executable,str(TOOL),'build','--request',str(path),'--output-dir',str(staged)],capture_output=True,text=True)
                    if result.returncode==0 and json.loads(result.stdout).get('ok'):
                        shutil.copytree(staged,output)
                        break
                    if 'WinError 5' not in result.stdout+result.stderr:raise RuntimeError(result.stdout+result.stderr)
                else:raise RuntimeError(f'Could not publish {appearance}/{family}')
            commands=[['validate','--manifest',str(output/'spritesheet-manifest.json')]]
            if not (output/'visual-review.json').exists():commands.append(['review','--manifest',str(output/'spritesheet-manifest.json')])
            for command in commands:
                result=subprocess.run([sys.executable,str(TOOL),*command],capture_output=True,text=True)
                if result.returncode:
                    print(result.stdout);print(result.stderr);raise RuntimeError(f'Skill command failed: {command}')
                report=json.loads(result.stdout)
                if command[0]!='review' and not report.get('ok'):raise RuntimeError(report)
            outputs.append({'appearance':appearance,'family':family,'manifest':str((output/'spritesheet-manifest.json').relative_to(ROOT)),'status':'structural-pass-visual-pending'})
            print(f'{appearance}/{family}: shared skill build, validate and review passed structurally',flush=True)
    (DOC/'variant-library-builds.json').write_text(json.dumps(outputs,indent=2)+'\n')


if __name__=='__main__':main()
