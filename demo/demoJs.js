/**
 * @typedef {string & { foo?: TBaseDir }} RelativeFilePath
 * @template TBaseDir
 */

/**
 * @param {RelativeFilePath<'$dir/target'>} path
 */
function toFilePath(path) {}

export const data1 = {
	filePath: toFilePath("sampleDir/test1.txt"),
};

export const data2 = {
	fileName: "sampleDir/test2.txt",
	fileContent: "some sample\ntext here",
};
