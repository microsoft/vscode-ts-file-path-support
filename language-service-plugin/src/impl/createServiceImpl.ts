import type * as ts from "typescript";
import { createCustomService } from "../rpc/decorateLanguageServiceWithCustomService";
import { RelativeFilePathService } from "../api";
import { AstMatchers } from "./AstMatchers";

export function createServiceImpl(typescript: typeof ts, languageService: ts.LanguageService) {
    return createCustomService<RelativeFilePathService>({
        findRelativeFileNodeAt({ fileName, position }) {
            const program = languageService.getProgram();
            if (!program) { return undefined; }
            const utils = new AstMatchers(typescript);
            const nodeAtCursor = utils.findNodeAt(program, fileName, position);
            if (!nodeAtCursor) { return undefined; }
            const result = utils.findNodeOrAncestor(nodeAtCursor, n => utils.parseFilePathCallExpression(program, n));
            if (!result) { return undefined; }

            // Only trigger when cursor is on the string literal
            if (result.relativePathNode !== nodeAtCursor) { return undefined; }

            const cursorInfo = result.getCursorInfo(position);
            return {
                baseDir: result.baseDir,
                relativePath: result.relativePath,
                relativePathBeforeCursor: cursorInfo.relativePathBeforeCursorSegment,
                stringValueRange: [result.relativePathValueRange.start, result.relativePathValueRange.endExclusive],
                cursorSegmentRange: [cursorInfo.cursorSegmentRange.start, cursorInfo.cursorSegmentRange.endExclusive],
            };
        },

        findFileNameFileContentObjAt({ fileName, position }) {
            const program = languageService.getProgram();
            if (!program) { return undefined; }
            const utils = new AstMatchers(typescript);
            const nodeAtCursor = utils.findNodeAt(program, fileName, position);
            if (!nodeAtCursor) { return undefined; }
            const result = utils.findNodeOrAncestor(nodeAtCursor, n => utils.parseFileNameFileContentObj(program, n));
            if (!result) { return undefined; }

            const fns = utils.findFilePathFns(program, result.node);
            if (fns.length === 0) { return undefined; }

            return {
                isMultiLine: true,
                fileContent: result.fileContent,
                fileName: result.fileName,
                relativeFilePathBaseDir: fns[0].resolvedBasePath,
                relativeFilePathFnName: fns[0].fnName,
                replaceRange: [result.replaceRange.start, result.replaceRange.endExclusive],
            };
        },

        findFilePathObjAt({ fileName, position }) {
            const program = languageService.getProgram();
            if (!program) { return undefined; }
            const utils = new AstMatchers(typescript);
            const nodeAtCursor = utils.findNodeAt(program, fileName, position);
            if (!nodeAtCursor) { return undefined; }
            const result = utils.findNodeOrAncestor(nodeAtCursor, n => utils.parseFilePathObj(program, n));
            if (!result) { return undefined; }

            return {
                isMultiLine: true,
                baseDir: result.filePathInfo.baseDir,
                relativePath: result.filePathInfo.relativePathParsed.value,
                replaceRange: [result.replaceRange.start, result.replaceRange.endExclusive],
            };
        }
    });
}
