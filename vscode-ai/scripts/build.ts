import { build, context, type BuildOptions } from "esbuild"

const options: BuildOptions = {
  entryPoints: ["./src/extension.ts"],
  outdir: "build",
  bundle: true,
  format: "cjs",
  platform: "node",
  external: ["vscode"],
  minify: !process.env.DEV,
  sourcemap: process.env.DEV ? "inline" : undefined,
}

if (process.env.DEV) {
  const ctx = await context(options)
  await ctx.watch()
  console.log("Watching...")
} else {
  await build(options)
  console.log("Built")
}
