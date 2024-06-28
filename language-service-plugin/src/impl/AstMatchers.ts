import type * as ts from "typescript";
import { OffsetRange } from "../utils/offsetRange";
import { dirname, join } from "path";
import { ParsedPath } from "./ParsedPath";
import { ParsedJsString } from "./ParsedJsString";

export class AstMatchers {
    constructor(
        private readonly _ts: typeof ts,
    ) { }

    public findNodeAt(program: ts.Program, fileName: string, position: number): ts.Node | undefined {
        const sf = program.getSourceFile(fileName);
        if (!sf) { return undefined; }
        return this.findSmallestNodeAt(sf, position);
    }

    public findFilePathCallExpression(program: ts.Program, fileName: string, position: number): FilePathCallExpression | undefined {
        const nodeAtCursor = this.findNodeAt(program, fileName, position);
        if (!nodeAtCursor) { return undefined; }
        const data = this.findNodeOrAncestor(nodeAtCursor, n => this.parseFilePathCallExpression(program, n));
        return data;
    }

    public parseFilePathObj(program: ts.Program, node: ts.Node): { obj: ts.ObjectLiteralExpression, filePathInfo: FilePathCallExpression, replaceRange: OffsetRange } | undefined {
        // { filePath: fixturesFilePath('foobar/test2.txt' };

        const match = this.matchesObj(node, {
            filePath: (n) => this.parseFilePathCallExpression(program, n),
        });
        if (!match) { return undefined; }

        return {
            obj: match.node,
            replaceRange: createOffsetRange(match.result.filePath.property),
            filePathInfo: match.result.filePath.result,
        };
    }

    public parseFileNameFileContentObj(program: ts.Program, node: ts.Node): { node: ts.ObjectLiteralExpression, fileName: string, fileContent: string, replaceRange: OffsetRange } | undefined {
        // { fileName: 'foobar/test2.txt', fileContent: 'foobar' };

        const match = this.matchesObj(node, {
            fileName: (n) => this._ts.isStringLiteral(n) ? n : undefined,
            fileContent: (n) => this._ts.isStringLiteral(n) ? n : undefined,
        });

        if (!match) { return undefined; }

        return {
            node: match.node,
            fileName: match.result.fileName.result.text,
            fileContent: match.result.fileContent.result.text,
            replaceRange: createOffsetRange(match.result.fileName.property).join(createOffsetRange(match.result.fileContent.property)),
        };
    }

    private matchesObj<TParsers extends Record<string, (node: ts.Node) => (unknown | undefined)>>(node: ts.Node, parsers: TParsers): {
        node: ts.ObjectLiteralExpression, result: { [K in keyof TParsers]:
            { property: ts.PropertyAssignment, identifier: ts.Identifier, result: ReturnType<TParsers[K]> extends infer R ? R extends undefined ? never : R : never } }
    } | undefined {
        if (!this._ts.isObjectLiteralExpression(node)) { return undefined; }

        const result: any = {};
        for (const [key, parser] of Object.entries(parsers)) {
            const prop = node.properties.find(p => this._ts.isPropertyAssignment(p) && this._ts.isIdentifier(p.name) && p.name.text === key);
            if (!prop) { return undefined; }
            const prop2 = prop as ts.PropertyAssignment;
            const value = parser(prop2.initializer);
            if (value === undefined) { return undefined; }
            result[key] = { identifier: prop2.name, result: value, property: prop2 };
        }
        return {
            node,
            result,
        };
    }

    public parseFilePathCallExpression(program: ts.Program, node: ts.Node): FilePathCallExpression | undefined {
        if (!this._ts.isCallExpression(node)) { return undefined; }
        if (!this._ts.isIdentifier(node.expression)) { return undefined; }
        if (node.arguments.length !== 1) { return undefined; }
        if (!this._ts.isStringLiteral(node.arguments[0])) { return undefined; }

        const identifierText = node.expression.text;
        const result = this.parseFilePathFn(program, identifierText, () => {
            const checker = program.getTypeChecker();
            const fnType = checker.getTypeAtLocation(node.expression);
            return fnType;
        });

        if (!result) { return undefined; }
        return new FilePathCallExpression(node, node.arguments[0] as ts.StringLiteral, result.basePath, result.declaringSourceFile);
    }

    public parseFilePathFn(program: ts.Program, fnName: string, getType: () => ts.Type): { fnName: string, basePath: string, declaringSourceFile: ts.SourceFile } | undefined {
        const fnType = getType();
        const checker = program.getTypeChecker();

        const callSignatures = fnType.getCallSignatures();
        if (callSignatures.length === 0) { return undefined; }
        const parameters = callSignatures[0].parameters;
        if (parameters.length !== 1) { return undefined; }

        const pathSymbol = parameters[0];
        const pathType = checker.getTypeOfSymbol(pathSymbol);
        if (pathType.aliasSymbol?.name !== 'RelativeFilePath') { return undefined; }
        const baseDirType = pathType.aliasTypeArguments?.[0];
        if (!baseDirType) { return undefined; }
        const baseDir = (baseDirType as any).value as string;

        const fnDeclaration = fnType.symbol.declarations?.[0];
        if (!fnDeclaration) { return undefined; }

        const declaringSourceFile = fnDeclaration.getSourceFile();
        return {
            fnName,
            basePath: baseDir,
            declaringSourceFile,
        };
    }

    public findFilePathFns(program: ts.Program, node: ts.Node): { fnName: string, resolvedBasePath: string }[] {
        const checker = program.getTypeChecker();
        const symbols = checker.getSymbolsInScope(node, this._ts.SymbolFlags.Function | this._ts.SymbolFlags.Alias);

        const filteredSymbols = symbols
            .map(s => this.parseFilePathFn(program, s.name, () => checker.getTypeOfSymbol(s)))
            .filter(i => !!i);

        return filteredSymbols.map(s => ({
            fnName: s.fnName,
            resolvedBasePath: s.basePath.replace('$dir', dirname(s.declaringSourceFile.fileName)),
        }));
    }

    public findNodeOrAncestor<T>(node: ts.Node, predicate: (node: ts.Node) => T | undefined): T | undefined {
        while (node) {
            const result = predicate(node);
            if (result) { return result; }
            node = node.parent;
        }
        return undefined;
    }

    public findSmallestNodeAt(
        node: ts.Node,
        position: number
    ): ts.Node | undefined {
        if (!(node.getStart() <= position && position <= node.getEnd())) {
            return undefined;
        }
        let result: ts.Node = node;
        node.forEachChild(
            node => {
                const c = this.findSmallestNodeAt(node, position);
                if (c) {
                    result = c;
                }
            },
            arr => {
                for (const item of arr) {
                    const c = this.findSmallestNodeAt(item, position);
                    if (c) {
                        result = c;
                    }
                }
            }
        );

        return result;
    }
}


export class FilePathCallExpression {
    public readonly resolvedBasePath = this.baseDir.replace('$dir', dirname(this.basePathSourceFileNode.fileName));

    public readonly relativePathParsed = ParsedJsString.parse(this.relativePathNode.getSourceFile().text.substring(this.relativePathNode.getStart(), this.relativePathNode.getEnd()));
    public readonly relativePathSegments = ParsedPath.parse(this.relativePathParsed.value);

    public readonly fullPath = join(this.resolvedBasePath, this.relativePathSegments.text);

    public readonly relativePathValueRange =
        OffsetRange.ofLength(this.relativePathParsed.value.length)
            .mapBounds(o => this.relativePathParsed.posInValueToSource(o))
            .delta(this.relativePathNode.getStart());

    constructor(
        public readonly callExpressionNode: ts.CallExpression,
        public readonly relativePathNode: ts.StringLiteral,
        public readonly baseDir: string,
        public readonly basePathSourceFileNode: ts.SourceFile,
    ) { }

    getCursorInfo(position: number) {
        const curPathSegment = this.relativePathSegments.getLiteralSegmentTouchingPos(this.relativePathParsed.posInSourceToValue(position - this.relativePathNode.getStart()))!;
        const curPathSegmentIdx = this.relativePathSegments.segments.indexOf(curPathSegment);
        const fullPathBeforeCursorSegment = join(this.resolvedBasePath, this.relativePathSegments.getSubPath(curPathSegmentIdx));

        return {
            cursorSegmentRange: new OffsetRange(
                this.relativePathParsed.posInValueToSource(curPathSegment.range.start),
                this.relativePathParsed.posInValueToSource(curPathSegment.range.endExclusive)
            ).delta(this.relativePathNode.getStart()),
            fullPathBeforeCursorSegment,
        };
    }
}

function createOffsetRange(node: ts.Node): OffsetRange {
    return new OffsetRange(node.getStart(), node.getEnd());
}
