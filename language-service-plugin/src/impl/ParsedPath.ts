import { OffsetRange } from "../utils/offsetRange";

type ParsedPathSegment = { type: "literal" | "pathSeparator"; value: string; range: OffsetRange; };

export class ParsedPath {
    public static parse(value: string): ParsedPath {
        if (value.length === 0) {
            return new ParsedPath([{ type: "literal", value: "", range: new OffsetRange(0, 0) }]);
        }
        const segments: ParsedPathSegment[] = [];
        function pushLatestLiteralValue() {
            if (segments.length > 0 && segments[segments.length - 1].type === "pathSeparator") {
                segments.push({ type: "literal", value: "", range: OffsetRange.emptyAt(segments[segments.length - 1].range.endExclusive) });
            }
        }
        let i = 0;
        while (i < value.length) {
            if (value[i] === "/" || value[i] === "\\") {
                pushLatestLiteralValue();
                segments.push({ type: "pathSeparator", value: value[i], range: new OffsetRange(i, i + 1) });
                i++;
            } else {
                let len = 1;
                while (value[i + len] && value[i + len] !== "/" && value[i + len] !== "\\") {
                    len++;
                }
                segments.push({ type: "literal", value: value.slice(i, i + len), range: new OffsetRange(i, i + len) });
                i += len;
            }
        }
        pushLatestLiteralValue();
        return new ParsedPath(segments);
    }

    constructor(public readonly segments: readonly ParsedPathSegment[]) { }

    public getLiteralSegmentTouchingPos(pos: number): ParsedPathSegment | undefined {
        return this.segments.find(s => s.type === "literal" && (s.range.deltaEnd(1).contains(pos)));
    }

    public getSubPath(idxEndEx: number): string {
        return this.segments.slice(0, idxEndEx).map(s => s.value).join("");
    }

    public get text(): string {
        return this.segments.map(s => s.value).join("");
    }
}
