"""Render existing accepted pixels in four synchronized columns for review."""
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]
DOC=ROOT/'rogues-dungeon/documentation/player-equipment-animation-sets'
SOURCE=ROOT/'rogues-dungeon/public/assets/art/game-view/characters/hero-warrior/frames'
APPEARANCES=['original','sword-only','shield-only','unarmed']
LABELS=['1: Sword + shield','2: Sword only','3: Shield only','4: Neither']
FONT=Path('C:/Windows/Fonts/segoeui.ttf')


def picture(clip,index):
    image=Image.new('RGB',(1280,720),(26,29,36));draw=ImageDraw.Draw(image)
    draw.text((24,20),'Hero Warrior: four synchronized equipment appearances',font=ImageFont.truetype(str(FONT),30),fill='white')
    draw.text((24,70),f'{clip}  |  Frame {index+1}  |  Original playback speed 0.5',font=ImageFont.truetype(str(FONT),22),fill='#d4dfed')
    for column,(appearance,label) in enumerate(zip(APPEARANCES,LABELS)):
        left=column*320
        draw.rectangle((left,125,left+319,590),fill=(36,40,48) if column%2==0 else (43,47,55))
        draw.text((left+18,140),label,font=ImageFont.truetype(str(FONT),21),fill='white')
        draw.line((left,520,left+319,520),fill='#71939b',width=1)
        for y in range(190,575,8):draw.line((left+160,y,left+160,y+3),fill='#536778')
        path=SOURCE/clip/f'{index:02}.png' if appearance=='original' else DOC/'authored-frames-v6'/appearance/clip/f'frame-{index:02}.png'
        with Image.open(path) as im:sprite=im.convert('RGBA').resize((im.width*6,im.height*6),Image.Resampling.NEAREST)
        image.paste(sprite,(left+160-sprite.width//2,520-sprite.height),sprite)
    draw.text((24,620),'Shared bottom-center canvas anchor. No per-frame fitting, recentering, or body rescaling.',font=ImageFont.truetype(str(FONT),20),fill='#d4dfed')
    draw.text((24,655),'Art review only. Looping clips repeat twice; one-shot clips hold their ending for inspection.',font=ImageFont.truetype(str(FONT),19),fill='#b6c2d2')
    return image


def main():
    target=DOC/'hero-equipment-comparison.mp4'
    if target.exists():raise FileExistsError(target)
    ffmpeg=shutil.which('ffmpeg')
    if not ffmpeg:raise RuntimeError('Installed ffmpeg is required for this optional review video')
    command=[ffmpeg,'-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r','50','-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(target)]
    process=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    clips=[(f'{action}/{direction}',count,duration,loop) for action,count,duration,loop in [('idle',4,280,True),('run',6,200,True),('attack',4,180,False)] for direction in ['down','side','up']]+[('death',6,240,False)]
    video_frames=0
    try:
        for clip,count,duration,loop in clips:
            frames=[picture(clip,index) for index in range(count)]
            if clip=='idle/down':frames[0].save(DOC/'hero-equipment-comparison.png')
            for _ in range(2 if loop else 1):
                for frame in frames:
                    for _ in range(duration//20):process.stdin.write(frame.tobytes());video_frames+=1
            if not loop:
                for _ in range(60 if clip=='death' else 40):process.stdin.write(frames[-1].tobytes());video_frames+=1
    finally:process.stdin.close()
    error=process.stderr.read().decode();status=process.wait()
    if status:raise RuntimeError(error)
    (DOC/'comparison-video.json').write_text(json.dumps({'file':target.name,'fps':50,'durationMs':video_frames*20,'sourceSpeed':0.5,'timingQuantizationMs':0,'columns':APPEARANCES,'sourceFrames':'authored-frames-v6 and unchanged originals','extraPreviewHolds':True},indent=2)+'\n')
    print(f'Rendered synchronized comparison: {target} ({video_frames*20} ms, 50 fps).')


if __name__=='__main__':main()
