import { join } from "path";
type RelativeFilePath<T extends string> = string & { baseDir?: T };

function myPathFn(path: RelativeFilePath<'$dir/target'>): string {
	return join(__dirname, 'target', path);
}

myPathFn("sampleDir/foobar123.txt");
