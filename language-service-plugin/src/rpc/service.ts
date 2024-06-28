export type ServiceDescription = Record<string, { request: unknown, response: unknown }>;

export type CreateServicesDescription<T extends ServiceDescription> = T;

export type ServiceToSyncObj<T extends ServiceDescription, TContext = {}> =
    { [K in keyof T]: { (args: T[K]['request'] & TContext): T[K]['response'] } };

export type ServiceToAsyncObj<T extends ServiceDescription, TContext = {}> =
    { [K in keyof T]: { (args: T[K]['request'] & TContext): Promise<T[K]['response']> } };

export const magicKind = 'refactor.customService::';

export interface IRequestMessage {
    method: string;
    args: {};
}

export interface IResponseMessage {
    result: any;
    error: any;
}
