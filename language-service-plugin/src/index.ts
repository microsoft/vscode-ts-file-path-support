import type * as ts from "typescript/lib/tsserverlibrary";
import { registerCustomService } from "./rpc/registerCustomService";
import { createServiceImpl } from "./impl/createServiceImpl";
import { RelativeFilePathServiceId } from "./api";

export default function init(modules: { typescript: typeof ts }) {
	return {
		create(info: ts.server.PluginCreateInfo): ts.LanguageService {
			const id: RelativeFilePathServiceId = "tsRelativeFilePath";
			registerCustomService(id, info, createServiceImpl(modules.typescript, info.languageService));
			return info.languageService;
		},
	};
};
