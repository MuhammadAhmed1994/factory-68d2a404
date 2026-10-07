import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

@Injectable()
export class PrivateFileStore {
  private readonly rootDirectory: string;

  constructor(rootDirectory?: string) {
    this.rootDirectory = resolve(
      rootDirectory ?? process.env.ATTACHMENT_STORAGE_PATH ?? join(tmpdir(), 'simpledesk-private-attachments'),
    );
  }

  async store(bytes: Buffer): Promise<string> {
    await mkdir(this.rootDirectory, { recursive: true, mode: 0o700 });
    const storageKey = randomUUID();
    const destination = this.resolveStorageKey(storageKey);
    const temporaryPath = join(this.rootDirectory, `.${storageKey}.tmp`);
    try {
      await writeFile(temporaryPath, bytes, { flag: 'wx', mode: 0o600 });
      await rename(temporaryPath, destination);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
    return storageKey;
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveStorageKey(storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    await rm(this.resolveStorageKey(storageKey), { force: true });
  }

  private resolveStorageKey(storageKey: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storageKey)) {
      throw new Error('Invalid private attachment storage key');
    }
    const path = resolve(this.rootDirectory, storageKey);
    if (dirname(path) !== this.rootDirectory) throw new Error('Invalid private attachment storage key');
    return path;
  }
}
