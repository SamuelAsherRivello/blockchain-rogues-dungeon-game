// Bounded seed-17 CPU diagnostic. Run with node --import tsx from the repo root.
import {createCampaign,generateFloor,createGameSession,isObjectSetBlocked} from "../src/systems/procedural/world-procedural-system.ts";
import {copyCampaignMutableState} from "../src/systems/procedural/campaign-copy-system.ts";
import {ensureSemanticCells,markRuntimeGridValid} from "../src/systems/procedural/level-grid-system.ts";
import {setPerformanceOptions,resetPerformanceMetrics,readPerformanceMetrics} from "../src/systems/rendering/performance-system.ts";
const results=[];
for(const size of [100,200]){
 const original=createCampaign(17);original.floor=generateFloor(1,17,1,{size});original.floors=undefined;original.player={...original.player,...original.floor.start,pixel:{x:original.floor.start.x*32+16,y:original.floor.start.y*32+16}};
 const template=original.floor.entities.find(e=>e.kind==="enemy");if(!template)throw Error("No template enemy");
 original.floor.entities=original.floor.entities.filter(e=>e.kind!=="enemy");
 ensureSemanticCells(original.floor);markRuntimeGridValid(original.floor);
 const spots=[];const q=[{...original.player,d:0}];const seen=new Set();
 for(let i=0;i<q.length;i++){const p=q[i],key=p.x+","+p.y;if(seen.has(key))continue;seen.add(key);if(p.d>8||!original.floor.cells[p.y]?.[p.x]?.walkable||isObjectSetBlocked(original.floor,original.player,p.x,p.y))continue;if(p.d>=3&&!original.floor.entities.some(e=>e.x===p.x&&e.y===p.y))spots.push(p);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])q.push({x:p.x+dx,y:p.y+dy,d:p.d+1})}
 for(const requested of [1,4]){
 const source=copyCampaignMutableState(original);const chosen=spots.slice(0,requested);
 chosen.forEach((p,i)=>{const e=structuredClone(template);Object.assign(e,{id:"diagnostic-enemy-"+i,x:p.x,y:p.y,awareness:20,nextActionAt:0,actionCooldown:1});source.floor.entities.push(e)});
 setPerformanceOptions({enabled:true});resetPerformanceMetrics();
 const totals=[];let moved=0;
 for(let i=0;i<12;i++){const c=copyCampaignMutableState(source);const session=createGameSession(c);const t=performance.now();const r=session.dispatch({type:"wait"});totals.push(performance.now()-t);moved+=chosen.filter((p,index)=>{const enemy=r.state.floor.entities.find(e=>e.id==="diagnostic-enemy-"+index);return enemy&&(p.x!==enemy.x||p.y!==enemy.y)}).length}
 const metrics=readPerformanceMetrics();results.push({size,enemies:chosen.length,positions:chosen.map(p=>({x:p.x,y:p.y})),turnMean:totals.reduce((a,b)=>a+b,0)/totals.length,turnMax:Math.max(...totals),moved,metrics:metrics.cpu,counts:metrics.counts})
 }
}
console.log(JSON.stringify(results));
