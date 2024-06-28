import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import del from "rollup-plugin-delete";

export default defineConfig({
	input: "src/index.ts",
	output: {
		format: "commonjs",
		name: "index",
		file: "dist/index.js",
		sourcemap: true,
	},
	plugins: [typescript(), del({ targets: "dist/**/*" })],
});
