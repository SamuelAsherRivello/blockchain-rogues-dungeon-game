async page => {
  await page.goto('http://127.0.0.1:6080/blockchain-rogues-dungeon-game/assets/art/tilesets/art/tileset-dungeon.png?mute=1');
  await page.evaluate(() => { const image = document.querySelector('img'); image.style.width = '1152px'; image.style.height = '864px'; image.style.imageRendering = 'pixelated'; document.body.style.margin = '0'; });
  await page.screenshot({ path: 'output/wang-atlas-reference.png', fullPage: true });
}
