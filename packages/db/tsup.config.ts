import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/client.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  target: "es2022",
  splitting: false,
  external: ["@prisma/client"],
}));
