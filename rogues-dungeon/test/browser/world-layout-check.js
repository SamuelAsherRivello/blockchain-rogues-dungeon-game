async page => {
  await page.screenshot({ path: '.playwright-cli/world-layout.png' });
  return page.evaluate(() => ['.create-world-window', '.dialog_body', '.create-character-window__content', '.create-character-window__attributes', '.create-character-window__actions', '.create-world-window__preview'].map(selector => ({ selector, ...document.querySelector(selector)?.getBoundingClientRect().toJSON(), rows: document.querySelector(selector) && getComputedStyle(document.querySelector(selector)).gridTemplateRows, height: document.querySelector(selector) && getComputedStyle(document.querySelector(selector)).height })));
}
