import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/blockchain-rogues-dungeon-game/",
  plugins: [react()],
  root: "rogues-dungeon",
  server: {
    fs: {
      allow: [repositoryRoot],
    },
  },
});
