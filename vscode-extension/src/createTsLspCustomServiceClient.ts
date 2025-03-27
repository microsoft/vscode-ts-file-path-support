import { Uri, Position, commands } from "vscode";
import type { ServiceDescription, ServiceToAsyncObj, IRequestMessage } from "@vscode/ts-plugin-file-path-support/src/rpc/service";

export function createTsLspCustomServiceClient<TService extends ServiceDescription>(id: string): ServiceToAsyncObj<TService, { uri: Uri; position: Position; }> {
    const tsCommandId = '_handleRpc' + id;

    return new Proxy({}, {
        get: (target, prop, receiver) => {
            return async (args: { uri: Uri; position: Position; }) => {
                const request: IRequestMessage & { file: any; position: { line: number, char: number }; } = {
                    method: prop.toString(),
                    args: args,
                    file: args.uri,
                    position: { line: args.position.line, char: args.position.character },
                };
                const result: { body: { result: unknown } } = await commands.executeCommand(
                    'typescript.tsserverRequest',
                    tsCommandId,
                    request
                );
                return result.body.result;
            };
        }
    }) as any;
}
