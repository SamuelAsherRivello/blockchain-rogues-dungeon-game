import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

// Match Vite's ?raw asset imports when running the shared domain modules in Node.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".tmx?raw")) {
      return { format: "module", source: `export default ${JSON.stringify(readFileSync(new URL(url.split("?")[0]), "utf8"))};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
