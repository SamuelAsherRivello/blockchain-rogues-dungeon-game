import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

// Match Vite's ?raw asset imports when running the shared domain modules in Node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith("?raw")) {
      const source = readFileSync(new URL(specifier.slice(0, -4), context.parentURL), "utf8");
      return { url: `data:text/javascript,${encodeURIComponent(`export default ${JSON.stringify(source)};`)}`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith("?raw")) {
      return { format: "module", source: `export default ${JSON.stringify(readFileSync(new URL(url.split("?")[0]), "utf8"))};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
