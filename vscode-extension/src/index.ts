import { promises as fs } from "fs";
import { join } from "path";
import type { RelativeFilePathService } from "ts-plugin-file-path-support/src/api";
import { CompletionItem, CompletionItemKind, ExtensionContext, languages, Range, LocationLink, WorkspaceEdit, Uri, CodeAction, CodeActionKind, DocumentSelector } from "vscode";
import { createTsLspCustomServiceClient } from "./createTsLspCustomServiceClient";


export class Extension {
	constructor() {
		const client = createTsLspCustomServiceClient<RelativeFilePathService>();

		const selector: DocumentSelector = [
			{ language: "typescript", },
			{ language: "typescriptreact", },
			{ language: "javascript", },
			{ language: "javascriptreact", }
		];

		languages.registerCompletionItemProvider(selector, {
			async provideCompletionItems(document, position, token, context) {
				const result = await client.findRelativeFileNodeAt({ uri: document.uri, position: position });
				if (!result) { return undefined; }

				const curDir = result.fullDirPathBeforeCursor;

				const filesInDir = await fs.readdir(curDir);
				const items = await Promise.all(filesInDir.map(async f => ({
					name: f,
					isDir: (await fs.lstat(join(curDir, f))).isDirectory(),
				})));

				items.unshift({ name: ".", isDir: true });
				items.unshift({ name: "..", isDir: true });

				const replaceRange = result.cursorSegmentRange;
				const range = new Range(document.positionAt(replaceRange[0]), document.positionAt(replaceRange[1]));

				return items.map<CompletionItem>(({ name, isDir }) => {
					return {
						range,
						label: name,
						kind: isDir ? CompletionItemKind.Folder : CompletionItemKind.File,
						insertText: isDir ? name + '/' : name,
						command: isDir ? {
							command: 'editor.action.triggerSuggest',
							title: '',
						} : undefined,
					};
				});
			},
		}, '/', '.');

		languages.registerDefinitionProvider(selector, {
			async provideDefinition(document, position, token): Promise<LocationLink[] | undefined> {
				const result = await client.findRelativeFileNodeAt({ uri: document.uri, position: position });
				if (!result) { return undefined; }
				const range = new Range(document.positionAt(result.stringValueRange[0]), document.positionAt(result.stringValueRange[1]));
				return [{
					targetUri: Uri.file(result.fullPath),
					targetRange: new Range(0, 0, 0, 0),
					originSelectionRange: range,
				}];
			},
		});

		languages.registerRenameProvider(selector, {
			async prepareRename(document, position, token) {
				const result = await client.findRelativeFileNodeAt({ uri: document.uri, position: position });
				if (!result) { return undefined; }
				const range = new Range(document.positionAt(result.stringValueRange[0]), document.positionAt(result.stringValueRange[1]));
				return {
					range,
					placeholder: result.relativePath,
				}
			},
			async provideRenameEdits(document, position, newName, token): Promise<WorkspaceEdit | undefined> {
				const result = await client.findRelativeFileNodeAt({ uri: document.uri, position: position });
				if (!result) { return undefined; }

				const edit = new WorkspaceEdit();
				const oldPath = join(result.baseDir, result.relativePath);
				const newPath = join(result.baseDir, newName);
				edit.renameFile(Uri.file(oldPath), Uri.file(newPath), { overwrite: false, ignoreIfExists: false });
				edit.replace(document.uri, new Range(document.positionAt(result.stringValueRange[0]), document.positionAt(result.stringValueRange[1])), newName);
				return edit;
			},
		});

		languages.registerCodeActionsProvider(selector, {
			async provideCodeActions(document, range, context, token) {
				if (context.only && (!context.only.value.startsWith('refactor.extract') || !context.only.value.includes('refactor.inline'))) {
					return;
				}

				const result: CodeAction[] = [];

				const filePathObjInfo = await client.findFilePathObjAt({ uri: document.uri, position: range.start });
				if (filePathObjInfo) {
					const fileContent = await fs.readFile(filePathObjInfo.fullPath, { encoding: 'utf8' });
					const range = new Range(document.positionAt(filePathObjInfo.replaceRange[0]), document.positionAt(filePathObjInfo.replaceRange[1]));
					const line = document.lineAt(range.start.line);
					const indentation = line.text.substring(0, line.firstNonWhitespaceCharacterIndex);
					const newText = `fileName: ${JSON.stringify(filePathObjInfo.relativePath)},\n${indentation}fileContent: ${JSON.stringify(fileContent)}`;

					const editInlineAndDelete = new WorkspaceEdit();
					editInlineAndDelete.replace(document.uri, range, newText);
					editInlineAndDelete.deleteFile(Uri.file(filePathObjInfo.fullPath));
					result.push({
						title: "Inline And Delete File",
						isPreferred: true,
						kind: CodeActionKind.RefactorInline,
						edit: editInlineAndDelete,
					});

					const editInline = new WorkspaceEdit();
					editInline.replace(document.uri, range, newText);
					editInline.deleteFile(Uri.file(filePathObjInfo.fullPath));
					result.push({
						title: "Inline File",
						kind: CodeActionKind.RefactorInline,
						edit: editInline,
					});
				}

				const fileNameFileContentObjInfo = await client.findFileNameFileContentObjAt({ uri: document.uri, position: range.start });
				if (fileNameFileContentObjInfo) {
					const range = new Range(document.positionAt(fileNameFileContentObjInfo.replaceRange[0]), document.positionAt(fileNameFileContentObjInfo.replaceRange[1]));
					const newText = `filePath: ${fileNameFileContentObjInfo.relativeFilePathFnName}(${JSON.stringify(fileNameFileContentObjInfo.fileName)})`;

					const editExtract = new WorkspaceEdit();
					editExtract.replace(document.uri, range, newText);
					const newUri = Uri.file(join(fileNameFileContentObjInfo.relativeFilePathBaseDir, fileNameFileContentObjInfo.fileName));
					editExtract.createFile(newUri, { ignoreIfExists: false, overwrite: false });
					editExtract.replace(newUri, new Range(0, 0, 0, 0), fileNameFileContentObjInfo.fileContent);
					result.push({
						title: "Extract File",
						kind: CodeActionKind.RefactorExtract,
						edit: editExtract,
					});
				}

				return result;
			},
		});

		// TODO diagnostics provider
	}

	dispose(): void {
	}
}

export function activate(context: ExtensionContext) {
	context.subscriptions.push(new Extension());
}

export function deactivate() { }
