/**
 * @typedef {string & { foo?: TBaseDir }} RelativeFilePath
 * @template TBaseDir
 */

/**
 * @param {RelativeFilePath<'$dir/target'>} path
 */
function myFilePathFn(path) {}

export const data1 = {
	filePath: myFilePathFn("sampleDir/myFile.txt"),
};

export const data2 = {
	fileName: "sampleDir/test2.txt",
	fileContent: "some sample\ntext here",
};
