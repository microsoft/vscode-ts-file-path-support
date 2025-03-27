import type * as ts from "typescript/lib/tsserverlibrary";
import { IRequestMessage, IResponseMessage, ServiceDescription, ServiceToSyncObj } from "./service";

export function createCustomService<TService extends ServiceDescription>(
    customService: ServiceToSyncObj<TService, { fileName: string, position: number }>): ServiceToSyncObj<TService, { fileName: string, position: number }> {
    return customService;
}

export function registerCustomService<TService extends ServiceDescription>(
    id: string,
    info: ts.server.PluginCreateInfo,
    customService: ServiceToSyncObj<TService, { fileName: string, position: number }>
): void {
    const tsCommandId = '_handleRpc' + id;
    info.session?.addProtocolHandler(tsCommandId, (request) => {
        const msg = request.arguments as IRequestMessage & { file: string; position: { line: number, char: number } };

        if (!customService[msg.method]) {
            throw new Error(`Method ${msg.method} not found in custom service`);
        }

        const pos = msg.position;
        const src = info.languageService.getProgram()?.getSourceFile(msg.file);
        const p = src?.getPositionOfLineAndCharacter(pos.line, pos.char);
        if (p === undefined) {
            throw new Error(`Position ${pos.line}:${pos.char} not found in file ${msg.file}`);
        }

        const result = customService[msg.method]({ ...msg.args, fileName: msg.file, position: p });
        const response: IResponseMessage = {
            result: result,
            error: undefined
        };
        return {
            response: response
        };
    });
}
