import type * as ts from "typescript/lib/tsserverlibrary";
import { decorateLanguageServiceWithCustomService } from "./rpc/decorateLanguageServiceWithCustomService";
import { createServiceImpl } from "./impl/createServiceImpl";

export default function init(modules: { typescript: typeof ts }) {
	return {
		create(info: ts.server.PluginCreateInfo): ts.LanguageService {
			return decorateLanguageServiceWithCustomService(
				info.languageService,
				createServiceImpl(modules.typescript, info.languageService)
			);
		},
	};
};
