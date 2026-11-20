import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? "/travel-tourism/" : "/",
  server: {
    watch: {
      ignored: ["**/amity.png"]
    }
  },
  build: {
    rollupOptions: {
      input: ["index.html", "react.html"]
    }
  }
});
