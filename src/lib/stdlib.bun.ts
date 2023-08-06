export async function readFile(filename: string) {
  return await Bun.file(filename).text();
}

export function argv(index: number) {
  return Bun.argv[index];
}
