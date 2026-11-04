import { expect, test } from '@playwright/test';
import { installCampaignFixture, readSavedCampaign } from './campaign-fixture.ts';
import { openSavedGame } from './start-saved-game.ts';

test('collects and throws a Throwing Knife at the nearest enemy', async ({page}) => {
  await installCampaignFixture(page, () => {
    const map = Array.from({length:100}, () => Array(100).fill(1));
    for (let x=48; x<=56; x++) for (let y=48; y<=52; y++) map[y][x]=0;
    const cells = map.map(row => row.map(cell => ({walkable:cell===0,role:cell===0?'floor':'wall'})));
    const resource = (current:number,currentMax:number) => ({current,currentMax});
    const enemy = (id:string,x:number) => ({ id, kind:'enemy', name:id, x, y:50, hp:20, maxHp:20, damage:0, xp:0, resources:{health:resource(20,20),xp:resource(0,0)}, awareness:0, actionCooldown:999, nextActionAt:999, ai:{state:'idle',targetId:null} });
    localStorage.setItem('rogues-dungeon.slot.2',JSON.stringify({
      version:6,mode:'classic',adventureBaseline:null,journeyCheckpoint:null,world:'One',realm:'Underground 1',floor:{generatorVersion:'fixture',seed:2,width:100,height:100,map,cells,start:{x:50,y:50},time:0,level:1,entities:[{id:'test-dagger',kind:'item',x:51,y:50,item:{id:'test-dagger',name:'Throwing Knife',group:'weapons',modifiers:{},category:'consumable',abilityId:'throwing-knives',quickSlotAction:'dagger',isStackable:true,quantity:3}},enemy('Near target',53),enemy('Far target',55)]},
      progression:{attributes:{health:30,stamina:16,offense:0,defense:1,mana:12,perception:20,strength:0,luck:0,recovery:0,stealth:0},level:1,xp:0,nextXp:100,totalKills:0,difficulty:1,attributePoints:0},
      player:{x:50,y:50,resources:{health:resource(30,30),stamina:resource(16,16),offense:resource(8,8),defense:resource(1,1),mana:resource(12,12),xp:{...resource(0,100),level:1}},equipment:{weapons:[null,null],armor:[null,null]},inventory:[],inventoryCapacity:10,abilities:[null,null,null],sneaking:false},counters:{keys:0,gold:0},objective:'Find the exit',log:[]
    }));
  });
  await page.goto('/blockchain-rogues-dungeon-game/?mute=1'); await openSavedGame(page,2);
  await page.keyboard.press('d');
  await expect(page.getByRole('button',{name:'Drag Throwing Knife'})).toBeVisible();
  await expect.poll(async () => (await readSavedCampaign(page,2)).player.inventory.find(item=>item.name==='Throwing Knife')?.quantity).toBe(3);
  const source = (await page.locator('[data-drag-id="test-dagger"]').boundingBox())!;
  const target = (await page.locator('[data-drop-quick-slot="0"]').boundingBox())!;
  await page.mouse.move(source.x+source.width/2,source.y+source.height/2); await page.mouse.down(); await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:8}); await page.mouse.up();
  await expect.poll(async () => (await readSavedCampaign(page,2)).player.quickSlots?.[0]?.quantity).toBe(3);
  await expect(page.locator('[data-drop-quick-slot="0"]')).toContainText('Throwing Knife');
  await page.keyboard.press('q');
  await expect.poll(async () => (await readSavedCampaign(page,2)).player.quickSlots?.[0]?.quantity).toBe(2);
  await expect.poll(async () => { const e=(await readSavedCampaign(page,2)).floor.entities.find(e=>e.id==='Near target'); return e?.kind==='enemy' ? e.hp : null; }).toBe(14);
  const far=(await readSavedCampaign(page,2)).floor.entities.find(e=>e.id==='Far target'); expect(far?.kind==='enemy' && far.hp).toBe(20);
});
