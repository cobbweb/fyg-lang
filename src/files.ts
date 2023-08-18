import fg from "fast-glob";

type Filename = string;
type FileSource = string;

export async function getSrcFilesList(
  srcRoots: string[]
): Promise<[Filename, FileSource][]> {
  const files = await Promise.all(
    srcRoots
      .map((root) => `${root}/**/*.fly`)
      .map((globPattern) => fg(globPattern))
  );

  // load all files upfront since we need to build the declared modules list
  // we can optimise this latter (e.g. read the stream until we get to a valid & complete module declaration)
  return await Promise.all(
    files.flat().map(async (filename) => [filename, await loadFile(filename)])
  );
}

const readFiles: Record<string, string> = {};

export async function loadFile(filename: string): Promise<string> {
  // basic file cache, over engineering?
  if (filename in readFiles) return readFiles[filename];
  readFiles[filename] = await Bun.file(filename).text();
  return readFiles[filename];
}
