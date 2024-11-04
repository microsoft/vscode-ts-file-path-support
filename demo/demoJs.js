/**
 * @typedef {string & { foo?: TBaseDir }} RelativeFilePath
 * @template TBaseDir
 */

/**
 * @param {RelativeFilePath<'$dir/target'>} path
 */
function myFilePathFn(path) { }

export const data1 = {
	filePath: myFilePathFn("sampleDir/myFile.txt"),
};

export const data2 = {
	fileName: "sampleDir/test2.txt",
	fileContents: "some sample\ntext here",
};

const data3 = {
	fileName: "foo.txt",
	fileContents: ["line1\\n", "line2\\n", "line3"],
};