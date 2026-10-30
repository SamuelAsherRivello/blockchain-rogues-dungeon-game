import assert from "node:assert/strict";
import test from "node:test";
import { loadHeroWarriorAtlasFrames } from "../src/content/characters/hero-warrior/hero-warrior-atlas.ts";

async function withDecoderFixture(run:(evidence:{fetches:string[];closed:string[];draws:unknown[][]})=>Promise<void>, missing=false) {
  const originalFetch=globalThis.fetch, originalBitmap=globalThis.createImageBitmap;
  const originalDocument=Object.getOwnPropertyDescriptor(globalThis,"document");
  const evidence={fetches:[] as string[],closed:[] as string[],draws:[] as unknown[][]};
  globalThis.fetch=async(input)=>{
    const path=String(input);evidence.fetches.push(path);
    return new Response(path,{status:missing && path==="missing.png"?404:200});
  };
  globalThis.createImageBitmap=(async(blob:Blob)=>{
    const path=await blob.text();
    return {width:path==="sheet.png"?192:32,height:48,close:()=>evidence.closed.push(path)};
  }) as unknown as typeof createImageBitmap;
  Object.defineProperty(globalThis,"document",{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({imageSmoothingEnabled:true,drawImage:(...args:unknown[])=>evidence.draws.push(args),getImageData:(_x:number,_y:number,w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)})})})}});
  try {await run(evidence);} finally {
    globalThis.fetch=originalFetch;globalThis.createImageBitmap=originalBitmap;
    if(originalDocument)Object.defineProperty(globalThis,"document",originalDocument);else Reflect.deleteProperty(globalThis,"document");
  }
}

test("loads a shared sheet once, extracts independent native frames, and closes its bitmap", async()=>{
  await withDecoderFixture(async evidence=>{
    const frames=await loadHeroWarriorAtlasFrames([0,1,3].map(sheetFrame=>({path:"sheet.png",widthPx:32,heightPx:48,sheetFrame})));
    assert.deepEqual(evidence.fetches,["sheet.png"]);assert.deepEqual(evidence.closed,["sheet.png"]);
    assert.deepEqual(frames.map(f=>f.name),["sheet.png#0","sheet.png#1","sheet.png#3"]);
    assert.deepEqual(evidence.draws.map(args=>args.slice(1,5)),[[0,0,32,48],[32,0,32,48],[96,0,32,48]]);
    assert.ok(frames.every(f=>f.pixels.length===32*48*4));
  });
});

test("a failed image load still closes all successfully decoded sibling images", async()=>{
  await withDecoderFixture(async evidence=>{
    await assert.rejects(loadHeroWarriorAtlasFrames([{path:"sheet.png",widthPx:32,heightPx:48,sheetFrame:0},{path:"missing.png",widthPx:32,heightPx:48}]),/missing.png/);
    assert.deepEqual(evidence.closed,["sheet.png"]);assert.equal(evidence.draws.length,0);
  },true);
});

test("invalid frame dimensions fail before drawing and close decoded resources", async()=>{
  await withDecoderFixture(async evidence=>{
    await assert.rejects(loadHeroWarriorAtlasFrames([{path:"sheet.png",widthPx:31,heightPx:48,sheetFrame:0}]),/sheet.png/);
    assert.deepEqual(evidence.closed,["sheet.png"]);assert.equal(evidence.draws.length,0);
  });
});
