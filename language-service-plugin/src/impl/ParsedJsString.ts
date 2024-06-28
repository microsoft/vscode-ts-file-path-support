import { OffsetRange } from "../utils/offsetRange";

type ParsedStringPart = { type: "escapeSequence" | "literalValue" | "meta"; range: OffsetRange; value: string; };

export class ParsedJsString {
    public static parse(source: string): ParsedJsString {
        const result: ParsedStringPart[] = [];
        let i = 0;
        while (i < source.length) {
            const c = source[i];
            if (c === "\\") {
                const next = source[i + 1];
                if (next === "n") {
                    result.push({ type: "escapeSequence", range: new OffsetRange(i, i + 2), value: "\n" });
                } else if (next === "r") {
                    result.push({ type: "escapeSequence", range: new OffsetRange(i, i + 2), value: "\r" });
                } else if (next === "t") {
                    result.push({ type: "escapeSequence", range: new OffsetRange(i, i + 2), value: "\t" });
                } else {
                    result.push({ type: "escapeSequence", range: new OffsetRange(i, i + 2), value: next });
                }
                i += 2;
            } else if (c === "\'" || c === "\"") {
                result.push({ type: "meta", range: new OffsetRange(i, i + 1), value: '' });
                i += 1;
            } else {
                let len = 1;
                while (source[i + len] && source[i + len] !== "\\" && source[i + len] !== "\"" && source[i + len] !== "'") {
                    len++;
                }
                result.push({ type: "literalValue", range: new OffsetRange(i, i + len), value: source.slice(i, i + len) });
                i += len;
            }
        }
        return new ParsedJsString(result, source);
    }

    constructor(
        public readonly parts: readonly ParsedStringPart[],
        public readonly source: string
    ) { }

    get value() {
        return this.parts.map(p => p.value).join("");
    }

    posInSourceToValue(pos: number): number {
        let valueLengthBefore = 0;
        for (const p of this.parts) {
            if (p.range.contains(pos)) {
                return valueLengthBefore + pos - p.range.start;
            }
            valueLengthBefore += p.value.length;
        }
        return this.value.length;
    }

    posInValueToSource(pos: number): number {
        let valueLengthBefore = 0;
        for (const p of this.parts) {
            if (valueLengthBefore + p.value.length >= pos) {
                if (p.type === "escapeSequence" || p.type === "meta") {
                    return p.range.endExclusive;
                }
                return p.range.start + pos - valueLengthBefore;
            }
            valueLengthBefore += p.value.length;
        }

        return this.source.length;
    }

    getRangeWithoutQuotes(): OffsetRange {
        const firstMeta = this.parts.find(p => p.type === "meta");
        const lastMeta = this.parts.slice().reverse().find(p => p.type === "meta");
        if (!firstMeta || !lastMeta) {
            return new OffsetRange(0, this.source.length);
        }
        if (firstMeta === lastMeta) {
            return new OffsetRange(firstMeta.range.endExclusive, firstMeta.range.endExclusive);
        }
        return new OffsetRange(firstMeta.range.endExclusive, lastMeta.range.start);
    }
}
