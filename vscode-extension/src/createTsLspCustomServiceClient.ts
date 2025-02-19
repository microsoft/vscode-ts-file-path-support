import { Uri, Position, commands, Range, CodeAction } from "vscode";
import type { ServiceDescription, ServiceToAsyncObj, IRequestMessage, IResponseMessage } from "@vscode/ts-plugin-file-path-support/src/rpc/service";

const magicKind = 'refactor.customService::';

export function createTsLspCustomServiceClient<TService extends ServiceDescription>(): ServiceToAsyncObj<TService, { uri: Uri; position: Position; }> {
    return new Proxy({}, {
        get: (target, prop, receiver) => {
            return async (args: any) => {
                const request: IRequestMessage = {
                    method: prop.toString(),
                    args: args,
                };
                const result = await commands.executeCommand(
                    'vscode.executeCodeActionProvider',
                    args.uri,
                    new Range(args.position, args.position),
                    magicKind + JSON.stringify(request)
                );

                if (!isCodeActionArray(result)) {
                    console.error('unexpected result', result);
                    throw new Error("Result is not a code action array");
                }
                if (result.length === 0) {
                    throw new Error("Did not receive data, probably the typescript extension did not start yet.");
                }
                const resultStr = result[0].title;
                if (resultStr === undefined) {
                    throw new Error("Title is undefined");
                }
                const response = JSON.parse(resultStr) as IResponseMessage;
                return response.result;
            };
        }
    }) as any;
}

function isCodeActionArray(result: unknown): result is CodeAction[] {
    return Array.isArray(result) && result.every((item) => 'title' in item);
}
