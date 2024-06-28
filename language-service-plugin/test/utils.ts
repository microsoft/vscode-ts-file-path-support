import * as ts from "typescript";

export function withLanguageService(
    content: string | Record<string, string>,
    testFn: (tsApi: typeof ts, languageService: ts.LanguageService, sf: ts.SourceFile, markers: number[]) => void,
): void {
    if (typeof content === "string") {
        content = { "/main.ts": content };
    }

    const files = new Map<string, string>(
        Object.entries(content).map(([key, value]) => [key, stripMarkers(value).stripped])
    );
    const serviceHost = new VirtualLanguageServiceHost(files, {});
    const baseService = ts.createLanguageService(
        serviceHost,
        ts.createDocumentRegistry()
    );

    testFn(ts, baseService, baseService.getProgram()!.getSourceFile(Object.keys(content)[0])!, stripMarkers(Object.values(content)[0]).markers);
}

export class VirtualLanguageServiceHost implements ts.LanguageServiceHost {
    constructor(
        private readonly files: Map<string, string>,
        private readonly compilationSettings: ts.CompilerOptions
    ) { }

    public getScriptFileNames(): string[] {
        return [...this.files.keys()];
    }

    public getScriptVersion(fileName: string): string {
        return "1.0"; // our files don't change
    }

    public getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
        const content = this.files.get(fileName);
        if (!content) {
            return undefined;
        }
        return {
            dispose() { },
            getChangeRange: () => undefined,
            getLength: () => content.length,
            getText: (start, end) => content.substr(start, end - start),
        };
    }

    public getCompilationSettings(): ts.CompilerOptions {
        return this.compilationSettings;
    }

    public getCurrentDirectory(): string {
        return "/";
    }

    public getDefaultLibFileName(options: ts.CompilerOptions): string {
        return ts.getDefaultLibFileName(options);
    }

    public readFile(path: string, encoding?: string): string | undefined {
        return this.files.get(path);
    }

    public fileExists(path: string): boolean {
        return this.files.has(path);
    }
}

function stripMarkers(src: string): { stripped: string; markers: number[] } {
    let stripped = "";
    const markers = new Array<number>();
    let i = 0;
    let first = true;
    for (const part of src.split("|")) {
        if (first) {
            first = false;
        } else {
            markers.push(i);
        }
        stripped += part;
        i += part.length;
    }
    return {
        stripped,
        markers,
    };
}
