import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

@Injectable()
export class PrivateFileStore {
  private readonly directory = resolve(
    process.env.ATTACHMENTS_STORAGE_DIR || join(process.cwd(), '.private-attachments'),
  );

  async store(bytes: Buffer): Promise<string> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await chmod(this.directory, 0o700);
    const storageKey = randomBytes(32).toString('hex');
    await writeFile(this.pathFor(storageKey), bytes, { flag: 'wx', mode: 0o600 });
    return storageKey;
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.pathFor(storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await unlink(this.pathFor(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  private pathFor(storageKey: string): string {
    if (!/^[a-f0-9]{64}$/.test(storageKey)) throw new Error('Invalid private storage key');
    return join(this.directory, storageKey);
  }
}
