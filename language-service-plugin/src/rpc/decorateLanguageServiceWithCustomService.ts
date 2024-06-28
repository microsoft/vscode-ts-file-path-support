import type * as ts from "typescript/lib/tsserverlibrary";
import { IRequestMessage, IResponseMessage, magicKind, ServiceDescription, ServiceToSyncObj } from "./service";

export function createCustomService<TService extends ServiceDescription>(
    customService: ServiceToSyncObj<TService, { fileName: string, position: number }>): ServiceToSyncObj<TService, { fileName: string, position: number }> {
    return customService;
}

export function decorateLanguageServiceWithCustomService<TService extends ServiceDescription>(
    languageService: ts.LanguageService,
    customService: ServiceToSyncObj<TService, { fileName: string, position: number }>
): ts.LanguageService {
    return {
        ...languageService,
        getApplicableRefactors(fileName, positionOrRange, preferences, triggerReason, kind, ...args) {
            if (kind && kind.startsWith(magicKind)) {
                const dataStr = kind.substring(magicKind.length);
                const data = JSON.parse(dataStr) as IRequestMessage;

                if (customService[data.method]) {
                    const position = typeof positionOrRange === "number" ? positionOrRange : positionOrRange.pos;
                    const result = customService[data.method]({ ...data.args, fileName, position });
                    const response: IResponseMessage = {
                        result: result,
                        error: undefined
                    };
                    return [{
                        name: "Response",
                        actions: [{
                            name: 'response',
                            kind: kind,
                            description: JSON.stringify(response),
                        }],
                        description: '',
                    }];
                }
            }

            const original = languageService.getApplicableRefactors(fileName, positionOrRange, preferences, triggerReason, kind, ...args);
            return original;
        },
    };
}
