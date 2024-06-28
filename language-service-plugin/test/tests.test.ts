//import ts = require("typescript/lib/tsserverlibrary");
import { describe, expect, test } from 'vitest';
import { withLanguageService } from "./utils";
import { ParsedJsString } from "../src/impl/ParsedJsString";
import { ParsedPath } from "../src/impl/ParsedPath";
import { OffsetEdit, SingleOffsetEdit } from "../src/utils/edit";
import { OffsetRange } from "../src/utils/offsetRange";
import { createServiceImpl } from "../src/impl/createServiceImpl";


describe("Service", () => {
	test('Basic', () => withLanguageService(
		`
			type RelativeFilePath<TBaseDir extends string> = string & { baseDir?: TBaseDir };
			function fixturesFilePath(path: RelativeFilePath<'$dir/target'>) { }

			const data1 = {
				filePath: fixturesFi|lePath('foo.txt'),
			};

			const data2 = {
				fileName: "foo.txt",
				fileC|ontent: "bar",
			};
		`,
		(ts, languageService, sf, m) => {
			const impl = createServiceImpl(ts, languageService);
			expect(impl.findFilePathObjAt({ fileName: sf.fileName, position: m[0] })).toMatchInlineSnapshot(`
				{
				  "fullPath": "target\\foo.txt",
				  "isMultiLine": true,
				  "relativePath": "foo.txt",
				  "replaceRange": [
				    182,
				    219,
				  ],
				}
			`);
			expect(impl.findFileNameFileContentObjAt({ fileName: sf.fileName, position: m[1] })).toMatchInlineSnapshot(`
				{
				  "fileContent": "bar",
				  "fileName": "foo.txt",
				  "isMultiLine": true,
				  "relativeFilePathBaseDir": "./target",
				  "relativeFilePathFnName": "fixturesFilePath",
				  "replaceRange": [
				    251,
				    294,
				  ],
				}
			`);
		}
	));

	test('Invalid Type Name', () => withLanguageService(
		`
			type RelativeFilePathX<TBaseDir extends string> = string & { baseDir?: TBaseDir };
			function fixturesFilePath(path: RelativeFilePathX<'$dir/target'>) { }

			const data1 = {
				filePath: fixturesFi|lePath('foo.txt'),
			};
		`,
		(ts, languageService, sf, m) => {
			const impl = createServiceImpl(ts, languageService);
			expect(impl.findFilePathObjAt({ fileName: sf.fileName, position: m[0] })).toMatchInlineSnapshot(`
					undefined
				`);
			expect(impl.findFileNameFileContentObjAt({ fileName: sf.fileName, position: m[1] })).toMatchInlineSnapshot(`undefined`);
		}
	));

	test('Supports Overloading', () => withLanguageService(
		`
			type RelativeFilePath<T extends string> = string & { baseDir?: T };

			function resolveFilePath(path: RelativeFilePath<'$dir/target'>);
			function resolveFilePath(path: {}, foo: string);
			function resolveFilePath(...args: any[]) { }

			export const data1 = {
				filePath: resolveF|ilePath("sampleDir/test1.txt")
			};
		`,
		(ts, languageService, sf, m) => {
			const impl = createServiceImpl(ts, languageService);
			expect(impl.findFilePathObjAt({ fileName: sf.fileName, position: m[0] })).toMatchInlineSnapshot(`
				{
				  "fullPath": "target\\sampleDir\\test1.txt",
				  "isMultiLine": true,
				  "relativePath": "sampleDir/test1.txt",
				  "replaceRange": [
				    272,
				    320,
				  ],
				}
			`);
		}
	));

	test('Supports Other Names', () => withLanguageService(
		`
			type RelativeFilePath<T extends string> = string & { baseDir?: T };

			function fromFixture(path: RelativeFilePath<'$dir/target'>);
			function fromFixture(path: {}, foo: string);
			function fromFixture(...args: any[]) { }

			export const data1 = {
				filePath: fromF|ixture("sampleDir/test1.txt")
			};
		`,
		(ts, languageService, sf, m) => {
			const impl = createServiceImpl(ts, languageService);
			expect(impl.findFilePathObjAt({ fileName: sf.fileName, position: m[0] })).toMatchInlineSnapshot(`
				{
				  "fullPath": "target\\sampleDir\\test1.txt",
				  "isMultiLine": true,
				  "relativePath": "sampleDir/test1.txt",
				  "replaceRange": [
				    260,
				    304,
				  ],
				}
			`);
		}
	));

	test('Multi File 1', () => withLanguageService(
		{
			"/main.ts": `
				import { fromFixture } from "./lib";

				export const data1 = {
					file|Path: fromFixture("sampleDir/test1.txt")
				};
			`,
			"/lib.ts": `
				type RelativeFilePath<T extends string> = string & { baseDir?: T };
				export function fromFixture(path: RelativeFilePath<'$dir/target'>) { return path; }
			`
		},

		(ts, languageService, sf, m) => {
			const impl = createServiceImpl(ts, languageService);
			expect(languageService.getProgram()!.getSemanticDiagnostics()).toMatchInlineSnapshot(`[]`);

			expect(impl.findFilePathObjAt({ fileName: sf.fileName, position: m[0] })).toMatchInlineSnapshot(`
				{
				  "fullPath": "\\\\target\\sampleDir\\test1.txt",
				  "isMultiLine": true,
				  "relativePath": "sampleDir/test1.txt",
				  "replaceRange": [
				    75,
				    119,
				  ],
				}
			`);
		}
	));

	test('Multi File 2', () => withLanguageService(
		{
			"/main.ts": `
				import { fromFixture } from "./lib";

				export const data1 = {
					fileNa|me: 'hello world',
					fileContent: 'foo bar',
				};
			`,
			"/lib.ts": `
				type RelativeFilePath<T extends string> = string & { baseDir?: T };
				export function fromFixture(path: RelativeFilePath<'$dir/target'>) { return path; }
			`
		},

		(ts, languageService, sf, m) => {
			const impl = createServiceImpl(ts, languageService);
			expect(languageService.getProgram()!.getSemanticDiagnostics()).toMatchInlineSnapshot(`[]`);

			expect(impl.findFileNameFileContentObjAt({ fileName: sf.fileName, position: m[0] })).toMatchInlineSnapshot(`undefined`);
		}
	));
});

describe("ParsedJsString", () => {
	test("value", () => {
		const str = ParsedJsString.parse(`"te\tst"`);
		expect(str.value).toBe("te\tst");
	});

	describe("srcToVal", () => {
		test("1", () => {
			const str = ParsedJsString.parse(`"te\\\\st"`);
			const segments = [] as string[];
			for (let srcIdx = 0; srcIdx <= str.source.length; srcIdx++) {
				const valueIdx = str.posInSourceToValue(srcIdx);
				const editSrc = OffsetEdit.single(OffsetRange.emptyAt(srcIdx), "|");
				const editVal = OffsetEdit.single(OffsetRange.emptyAt(valueIdx), "|");
				const val = `${editSrc.apply(str.source)} -> ${editVal.apply(str.value)}`
					.replace(/"/g, "'")
					.replace(/\\/g, "/");

				segments.push(val);
			}

			expect(segments).toMatchInlineSnapshot(`
				[
				  "|'te//st' -> |te/st",
				  "'|te//st' -> |te/st",
				  "'t|e//st' -> t|e/st",
				  "'te|//st' -> te|/st",
				  "'te/|/st' -> te/|st",
				  "'te//|st' -> te/|st",
				  "'te//s|t' -> te/s|t",
				  "'te//st|' -> te/st|",
				  "'te//st'| -> te/st|",
				]
			`);
		});
	});

	describe("valToSrc", () => {
		test("1", () => {
			const str = ParsedJsString.parse(`"te\\\\st"`);
			const segments = [] as string[];
			for (let valueIdx = 0; valueIdx <= str.value.length; valueIdx++) {
				const srcIdx = str.posInValueToSource(valueIdx);
				const editSrc = OffsetEdit.single(OffsetRange.emptyAt(srcIdx), "|");
				const editVal = OffsetEdit.single(OffsetRange.emptyAt(valueIdx), "|");
				const val = `${editVal.apply(str.value)} -> ${editSrc.apply(str.source)}`
					.replace(/"/g, "'")
					.replace(/\\/g, "/");

				segments.push(val);
			}

			expect(segments).toMatchInlineSnapshot(`
				[
				  "|te/st -> '|te//st'",
				  "t|e/st -> 't|e//st'",
				  "te|/st -> 'te|//st'",
				  "te/|st -> 'te//|st'",
				  "te/s|t -> 'te//s|t'",
				  "te/st| -> 'te//st|'",
				]
			`);
		});
	});
});

describe("ParsedPath", () => {
	describe("getLiteralSegmentTouchingPos", () => {
		function getSegments(p: ParsedPath) {
			const segments = [] as string[];
			for (let i = 0; i <= p.text.length; i++) {
				const r = p.getLiteralSegmentTouchingPos(i)!;

				const edits = new OffsetEdit([
					new SingleOffsetEdit(OffsetRange.emptyAt(r.range.start), "["),
					new SingleOffsetEdit(OffsetRange.emptyAt(i), "|"),
					new SingleOffsetEdit(OffsetRange.emptyAt(r.range.endExclusive), "]"),
				]);

				const part = edits.apply(p.text);
				segments.push(`${part}`);
			}
			return segments;
		}

		test("1", () => {
			const segments = getSegments(ParsedPath.parse("foo/a/baz.txt"));
			expect(segments).toMatchInlineSnapshot(`
				[
				  "[|foo]/a/baz.txt",
				  "[f|oo]/a/baz.txt",
				  "[fo|o]/a/baz.txt",
				  "[foo|]/a/baz.txt",
				  "foo/[|a]/baz.txt",
				  "foo/[a|]/baz.txt",
				  "foo/a/[|baz.txt]",
				  "foo/a/[b|az.txt]",
				  "foo/a/[ba|z.txt]",
				  "foo/a/[baz|.txt]",
				  "foo/a/[baz.|txt]",
				  "foo/a/[baz.t|xt]",
				  "foo/a/[baz.tx|t]",
				  "foo/a/[baz.txt|]",
				]
			`);
		});

		test("2", () => {
			const segments = getSegments(ParsedPath.parse(""));
			expect(segments).toMatchInlineSnapshot(`
				[
				  "[|]",
				]
			`);
		});

	});

	test("subPath", () => {
		const p = ParsedPath.parse("foo/a/baz.txt");

		const subPaths = [] as string[];
		for (let i = 0; i <= p.segments.length; i++) {
			const subPath = p.getSubPath(i);
			subPaths.push(subPath);
		}

		expect(subPaths).toMatchInlineSnapshot(`
			[
			  "",
			  "foo",
			  "foo/",
			  "foo/a",
			  "foo/a/",
			  "foo/a/baz.txt",
			]
		`);
	});
});