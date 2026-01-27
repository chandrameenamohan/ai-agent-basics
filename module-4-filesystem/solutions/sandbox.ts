/**
 * Module 4: Path sandbox
 * All file operations must resolve under the allowed root.
 */
import * as path from "path";

export class Sandbox {
  constructor(public readonly root: string) {}

  resolve(filePath: string): string {
    const resolved = path.resolve(this.root, filePath);
    if (!resolved.startsWith(this.root)) {
      throw new Error(`Path "${filePath}" escapes sandbox root "${this.root}"`);
    }
    return resolved;
  }
}
