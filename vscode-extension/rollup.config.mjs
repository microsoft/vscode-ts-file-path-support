import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";
import del from "rollup-plugin-delete";

export default defineConfig({
	input: "src/index.ts",
	output: {
		format: "commonjs",
		name: "index",
		file: "dist/index.js",
		sourcemap: true,
	},
	plugins: [
		typescript(),
		copy({
			targets: [
				{
					src: ["../language-service-plugin/dist/**/*.js", "../language-service-plugin/package.json"],
					dest: "./node_modules/ts-plugin-file-path-support",
				},
			],
		}),
		del({ targets: "dist/**/*" }),
		del({ targets: "node_modules/ts-plugin-file-path-support/**/*" }),
	],
});
