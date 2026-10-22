async page => {
  const errors = [];
  const onError = message => { if (message.type() === "error") errors.push(message.text()); };
  page.on("console", onError);
  await page.goto("http://127.0.0.1:6080/blockchain-rogues-dungeon-game/?world=1&level=1&run=1&slot=1&seed=17&mute=1");
  await page.locator(".world-view[data-renderer-ready=true]").waitFor();
  if(await page.getByRole("button",{name:"Z: 0",exact:true}).count()) await page.getByRole("button",{name:"Z: 0",exact:true}).click();
  await page.getByRole("combobox",{name:"Movement mode",exact:true}).selectOption("gridless");
  await page.getByRole("button",{name: "P: 0",exact:true}).click();
  for(let i=0;i<3 && !(await page.getByRole("button",{name:"World Size: 100×100",exact:true}).count());i++) {
    await page.getByRole("button",{name:/^World Size:/}).click();
    await page.locator(".world-view[data-renderer-ready=true]").waitFor();
  }
  const results = [];
  for(const zoom of [0.25,0.5,1,2,4]) {
    await page.getByRole("combobox",{name:"Zoom",exact:true}).selectOption(String(zoom));
    await page.getByRole("button",{name:"Restart route",exact:true}).click();
    await page.locator(".world-view[data-renderer-ready=true]").waitFor();
    const label=(await page.locator(".performance-controls").innerText()).split("\n")[0];
    if(!label.includes("100×100")) throw new Error("Unexpected profile world: "+label);
    await page.waitForTimeout(5000);
    await page.getByRole("button",{name:"Reset sample",exact:true}).click();
    const start=Number(await page.locator(".world-view").getAttribute("data-player-pixel-x"));
    let previous=start,distance=0;
    for(let n=0;n<20;n++) {
      const key=n%2?"d":"a";
      await page.keyboard.down(key);await page.waitForTimeout(500);await page.keyboard.up(key);
      const next=Number(await page.locator(".world-view").getAttribute("data-player-pixel-x"));distance+=Math.abs(next-previous);previous=next;
    }
    results.push({zoom,label,distance,metrics:JSON.parse(await page.locator(".performance-controls pre").textContent())});
    await page.evaluate(data=>sessionStorage.setItem("renderer-zoom-profile",JSON.stringify(data)),{results,errors});
  }
  await page.getByRole("button",{name:"Exit Perf",exact:true}).click();
  await page.getByRole("combobox",{name:"Zoom",exact:true}).selectOption("1");
  if(await page.getByRole("button",{name:"Z: 1",exact:true}).count()) await page.getByRole("button",{name:"Z: 1",exact:true}).click();
  page.off("console",onError);
  return {results,errors};
}
