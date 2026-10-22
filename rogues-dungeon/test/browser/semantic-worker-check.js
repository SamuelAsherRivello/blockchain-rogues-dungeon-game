async page => {
  return await page.evaluate(async () => {
    const base="/blockchain-rogues-dungeon-game/";
    const {semanticBuffer,createRevisionGate}=await import(base+"test/browser/semantic-buffer-prototype.ts");
    const {generateFloor}=await import(base+"src/systems/procedural/world-procedural-system.ts");
    const {WorldRender}=await import(base+"src/systems/rendering/world-render-system.ts");
    const worker=new Worker(base+"test/browser/semantic-buffer-worker.ts",{type:"module"});
    const results=[];
    try {
      for(const size of [100,200]) {
        const floor=generateFloor(1,2225201261,1,{size});
        const world=WorldRender.Render({cells:floor.cells,groundTiles:floor.tiledGrounds,wallTiles:floor.tiledWalls,entities:floor.entities,player:{...floor.start,hasMass:true}});
        const points=entries=>new Uint16Array(entries.flatMap(p=>[p.x,p.y]));
        const input={width:size,height:size,terrain:points(world.terrain),walls:points(world.walls),objects:points(world.objects)};
        const mainStart=performance.now(), expected=semanticBuffer(input),mainMs=performance.now()-mainStart;
        const gate=createRevisionGate();gate.accept(gate.begin(),expected);
        const stale=gate.begin(), current=gate.begin();
        const request=(revision)=>{const terrain=input.terrain.slice(),walls=input.walls.slice(),objects=input.objects.slice();worker.postMessage({...input,terrain,walls,objects,revision},[terrain.buffer,walls.buffer,objects.buffer]);};
        const start=performance.now();
        const reply=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Worker timeout")),5000);worker.onerror=event=>{clearTimeout(timer);reject(new Error(event.message));};worker.onmessage=event=>{const accepted=gate.accept(event.data.revision,new Uint8ClampedArray(event.data.buffer));if(accepted){clearTimeout(timer);resolve(event.data);}};request(stale);request(current);});
        const roundTripMs=performance.now()-start;
        const actual=gate.current();
        results.push({size,mainMs,workerMs:reply.elapsed,roundTripMs,bytes:expected.length,equal:actual.every((v,i)=>v===expected[i]),staleRejected:!gate.accept(stale,new Uint8ClampedArray()),retained:gate.current()===actual});
      }
      return {results,offscreenCanvas:typeof OffscreenCanvas!=="undefined",workerWebGpu:!!navigator.gpu};
    } finally {worker.terminate();}
  });
}
