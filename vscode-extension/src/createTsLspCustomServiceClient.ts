import { Uri, Position, commands, Range } from "vscode";
import type { ServiceDescription, ServiceToAsyncObj, IRequestMessage, IResponseMessage } from "ts-plugin-file-path-support/src/rpc/service";

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
                const resultStr = (result as any)[0].title;
                const response = JSON.parse(resultStr) as IResponseMessage;
                return response.result;
            };
        }
    }) as any;
}
