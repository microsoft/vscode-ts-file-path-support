import { CreateServicesDescription } from "./rpc/service";

export type RelativeFilePathService = CreateServicesDescription<{
    findRelativeFileNodeAt: {
        request: {
            // uses position and filename
        };
        response: {
            stringValueRange: [start: number, endEx: number];
            cursorSegmentRange: [start: number, endEx: number];
            relativePath: string;
            baseDir: string;
            fullPath: string;
            fullDirPathBeforeCursor: string;
        } | undefined;
    };

    findFilePathObjAt: {
        request: {
            // uses position and filename
        };
        response: {
            isMultiLine: boolean;
            replaceRange: [start: number, endEx: number];
            fullPath: string;
            relativePath: string;
        } | undefined;
    }

    findFileNameFileContentObjAt: {
        request: {
            // uses position and filename
        };
        response: {
            isMultiLine: boolean;
            replaceRange: [start: number, endEx: number];
            fileContent: string;
            fileName: string;

            relativeFilePathFnName: string;
            relativeFilePathBaseDir: string;
        } | undefined;
    }
}>;
