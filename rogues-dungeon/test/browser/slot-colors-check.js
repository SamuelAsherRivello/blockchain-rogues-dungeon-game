async page => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const check = (condition, message) => { if (!condition) throw Error(message); };
  const base = "http://127.0.0.1:6080/blockchain-rogues-dungeon-game/";
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "?mute=1");
  const seed = async lowMana => {
    await page.evaluate(async lowMana => {
      const { createCampaign } = await import("/blockchain-rogues-dungeon-game/src/systems/procedural/world-procedural-system.ts");
      const campaign = createCampaign(90210);
      campaign.floor.cells = Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => ({ walkable: true, role: "ground" })));
      delete campaign.floor.map;
      campaign.floor.objectSets = []; campaign.floor.decorations = []; campaign.floor.entities = [];
      const potion = (id, resource) => ({ id, name: resource === "health" ? "Health Potion" : "Mana Potion", group: "weapons", modifiers: {}, category: "consumable", consumableResource: resource, isStackable: true, quantity: 1 });
      campaign.player.inventory = [
        { id: "coat", name: "Coat", group: "armor", modifiers: { defense: 1 } },
        potion("health", "health"), potion("mana", "mana"),
        { id: "sword", name: "Sword", group: "weapons", modifiers: { offense: 1 } },
        { id: "two", name: "Two-Handed Sword", group: "weapons", slotSpan: 2, modifiers: { offense: 2 } },
      ];
      campaign.player.inventoryCapacity = 10;
      campaign.player.equipment = { weapons: [null, null], armor: [null, null] };
      campaign.player.quickSlots = [null, null];
      campaign.player.abilities = ["heal", "wand", null];
      campaign.player.resources.health.current = Math.max(1, campaign.player.resources.health.currentMax - 1);
      campaign.player.resources.mana.current = lowMana ? 0 : campaign.player.resources.mana.currentMax;
      localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify(campaign));
    }, lowMana);
    await page.reload();
    await page.getByRole("button", { name: /Saved Game 1/ }).click();
    await page.locator(".game-screen").waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.body.textContent.includes("Preparing the crypt..."));
    await page.waitForTimeout(500);
    check(await page.locator("canvas").count() > 0, "No game canvas");
    check(await page.getByText(/WebGPU.*unavailable|WebGPU.*not supported/i).count() === 0, "WebGPU unavailable");
  };
  const panel = () => page.locator('.game-screen[data-orientation="portrait"]').count().then(p => page.locator(p ? ".mobile-information-panels .info-panel--primary" : ".information-panels .info-panel--primary"));
  const strip = async locator => locator.evaluate(el => getComputedStyle(el, "::before").backgroundColor);
  const color = { ability: "rgb(192, 170, 255)", quick: "rgb(121, 200, 120)", equipment: "rgb(103, 183, 232)" };
  await seed(true);
  let primary = await panel();
  const unavailable = primary.locator('[data-slot-type="ability"]').first();
  check(await unavailable.getAttribute("aria-disabled") === "true", "Unaffordable ability lost unavailable state");
  check(await strip(unavailable) === color.ability, "Unavailable ability lost category strip");
  await seed(false);
  primary = await panel();
  const validateRows = async () => {
    for (const category of Object.keys(color)) {
      for (const row of await primary.locator(`[data-slot-category="${category}"]`).all()) {
        check(await strip(row) === color[category], "Wrong strip for " + category);
        check(await row.evaluate(el => getComputedStyle(el, "::before").width) === "3px", "Wrong strip width");
      }
    }
    check(await primary.locator('[data-drag-id="two"]').count() === 1, "Secondary row became draggable");
    check(await primary.locator('.inventory_item[data-slot-category="equipment"]').count() === 4, "Two-position gear lost its second strip");
    check(await primary.locator('[data-drop-inventory-slot][data-slot-category]').count() === 0, "Empty Inventory has fixed category");
  };
  await validateRows();
  const hoverDrag = async (source, target, category, valid = true) => {
    await source.scrollIntoViewIfNeeded();
    const from = await source.boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 3 });
    await target.scrollIntoViewIfNeeded();
    const to = await target.boundingBox();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.waitForTimeout(100);
    check(await strip(page.locator(".item-drag-preview .slot_item")) === color[category], "Preview category changed");
    check(await target.evaluate(el => el.classList.contains("drag_landing")) === valid, "Incorrect landing validity");
    if (valid) check(await target.evaluate(el => getComputedStyle(el).outlineColor) === color[category], "Incorrect landing color");
  };
  const cancel = async () => {
    await page.keyboard.press("Escape"); await page.mouse.up();
    check(await page.locator(".item-drag-preview,.drag_landing,.drag_departure").count() === 0, "Transient feedback survived cancellation");
  };
  const weapon = primary.locator('[data-drop-group="weapons"]').first();
  await hoverDrag(primary.locator('[data-drag-id="coat"]'), weapon, "equipment", false); await cancel();
  await hoverDrag(primary.locator('[data-drag-id="sword"]'), weapon, "equipment"); await cancel();
  const quick = primary.locator('[data-drop-quick-slot="0"]');
  await hoverDrag(primary.locator('[data-drag-id="health"]'), quick, "quick"); await page.mouse.up();
  await page.waitForTimeout(120);
  check(await quick.evaluate(el => el.classList.contains("slot_item--shine")), "Accepted drop did not shine");
  check(await strip(quick) === color.quick, "Shine hid category");
  await hoverDrag(quick, primary.locator('[data-drop-inventory-slot]').first(), "quick"); await cancel();
  await hoverDrag(primary.locator('[data-drag-id="sword"]'), weapon, "equipment"); await page.mouse.up();
  await hoverDrag(weapon, primary.locator('[data-drop-inventory-slot]').first(), "equipment"); await cancel();
  await hoverDrag(primary.locator('[data-drop-ability="0"]'), primary.locator('[data-drop-ability="2"]'), "ability"); await cancel();
  // Both potions use green, including a full-resource Mana potion that cannot be used.
  const manaQuick = primary.locator('[data-drop-quick-slot="1"]');
  await hoverDrag(primary.locator('[data-drag-id="mana"]'), manaQuick, "quick"); await page.mouse.up();
  check(await manaQuick.getAttribute("aria-disabled") === "true", "Full-resource potion became usable");
  check(await strip(manaQuick) === color.quick, "Full-resource potion lost green");
  for (const [role, category] of [["abilities", "ability"], ["quick", "quick"]]) {
    const keys = page.locator(`.keyboard_collapsed_summary .input-key--${role}:not(.input-key--unavailable)`);
    check(await keys.count() > 0, "No enabled shortcut for " + role);
    check(await keys.first().evaluate(el => getComputedStyle(el).color) === color[category], "Shortcut palette mismatch");
  }
  await page.keyboard.press("z");
  await page.waitForTimeout(300);
  const ratios = await page.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    const rgb = color => { ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const luminance = color => rgb(color).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const result = [];
    for (const el of document.querySelectorAll('.information-panels .slot_item[data-slot-category]')) {
      const style = getComputedStyle(el);
      if (style.opacity !== "1") continue;
      result.push({ kind: "strip", value: contrast(getComputedStyle(el, "::before").backgroundColor, style.backgroundColor) });
      if (!el.matches('.disabled,.unavailable,.slot_item--occupied-secondary')) result.push({ kind: "text", value: contrast(style.color, style.backgroundColor) });
    }
    for (const el of document.querySelectorAll('.input-key--abilities:not(.input-key--unavailable),.input-key--quick:not(.input-key--unavailable)')) {
      const style = getComputedStyle(el);
      result.push({ kind: "text", value: contrast(style.color, style.backgroundColor) });
    }
    return result;
  });
  for (const ratio of ratios) check(ratio.value >= (ratio.kind === "strip" ? 3 : 4.5), "Low " + ratio.kind + " contrast: " + ratio.value);
  await page.keyboard.press("z");
  await page.mouse.move(500, 400);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: "output/slot-colors-landscape.png" });
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await page.waitForFunction(() => Boolean(document.fullscreenElement));
  check(await strip(primary.locator('[data-slot-type="ability"]').first()) === color.ability, "Fullscreen lost palette");
  await page.screenshot({ path: "output/slot-colors-fullscreen.png" });
  await page.evaluate(() => document.exitFullscreen());
  await page.getByRole("button", { name: "Aspect: Landscape", exact: true }).click();
  await page.getByRole("button", { name: "Info", exact: true }).click();
  primary = await panel();
  check(await strip(primary.locator('[data-slot-type="ability"]').first()) === color.ability, "Portrait lost palette");
  const overlap = await primary.locator('[data-slot-category]').evaluateAll(rows => rows.some(el => {
    const name = el.querySelector(".slot_item_text");
    return name && name.getBoundingClientRect().left < el.getBoundingClientRect().left + 3;
  }));
  check(!overlap, "Strip overlaps portrait text");
  await page.screenshot({ path: "output/slot-colors-portrait.png" });
  check(errors.length === 0, "Browser errors: " + errors.join("; "));
  return { errors, checkedContrast: ratios.length, minimumTextContrast: Math.min(...ratios.filter(r => r.kind === "text").map(r => r.value)), screenshots: ["landscape", "fullscreen", "portrait"] };
}
