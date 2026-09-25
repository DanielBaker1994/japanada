import { launch, openFilm } from './lib.mjs';
const browser = await launch();
const { page } = await openFilm(browser);
const code = process.argv[2];
console.log(await page.evaluate(new Function(code)));
await browser.close();
