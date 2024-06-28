type RelativeFilePath<T extends string> = string & { baseDir?: T };

function resolveFilePath(path: RelativeFilePath<'$dir/target'>);
function resolveFilePath(path: {}, foo: string);
function resolveFilePath(...args: any[]) { }

export const data1 = {
	filePath: resolveFilePath("sampleDir/test1.txt")
};

export const data2 = {
	fileName: "sampleDir/test2.txt",
	fileContent: "some sample\ntext here"
};
