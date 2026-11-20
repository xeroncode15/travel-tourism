import { defineConfig } from "vite";

export default defineConfig({
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
