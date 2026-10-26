import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { closeSync, openSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
export type StoredObject = {
    bytes: Buffer;
    version: string;
};
export interface JobObjectStore {
    read(key: string): Promise<StoredObject | null>;
    write(key: string, bytes: Buffer, expectedVersion: string | null): Promise<boolean>;
    delete(key: string): Promise<void>;
    list(prefix: string): Promise<string[]>;
}
function code(error: unknown) { return (error as {
    code?: string | number;
})?.code; }
function validKey(key: string) {
    if (!/^[A-Za-z0-9_.\/-]+$/.test(key) || key.startsWith('/') || key.split('/').some(p => !p || p === '.' || p === '..'))
        throw new Error('INVALID_OBJECT_KEY');
}
const databases = new Map<string, DatabaseSync>();
const initializing = new Map<string, Promise<DatabaseSync>>();
/** Local disk only: SQLite WAL + FULL synchronous writes provide cross-process CAS,
 * crash recovery, and durable atomic publication without stealable lock directories.
 * Every object remains inside this isolated directory; shared network mounts use GCS. */
export class FileJobObjectStore implements JobObjectStore {
    readonly root: string;
    constructor(root: string) { if (!path.isAbsolute(root))
        throw new Error('JOB_ROOT_MUST_BE_ABSOLUTE'); this.root = path.resolve(root); }
    private async database() {
        if (databases.has(this.root))
            return databases.get(this.root)!;
        if (initializing.has(this.root))
            return initializing.get(this.root)!;
        const pending = this.initialize();
        initializing.set(this.root, pending);
        try {
            return await pending;
        }
        finally {
            initializing.delete(this.root);
        }
    }
    private async initialize() {
        await mkdir(this.root, { recursive: true, mode: 0o700 });
        const filename = path.join(this.root, 'jobs.sqlite');
        closeSync(openSync(filename, 'a', 0o600));
        for (let retry = 0; retry < 50; retry++) {
            const db = new DatabaseSync(filename);
            try {
                db.exec('PRAGMA busy_timeout=10000');
                db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS objects (key TEXT PRIMARY KEY, bytes BLOB NOT NULL, version TEXT NOT NULL)');
                databases.set(this.root, db);
                return db;
            }
            catch (error) {
                db.close();
                if ((error as {
                    errcode?: number;
                }).errcode !== 5)
                    throw error;
                // WAL initialization can race before SQLite has installed its busy handler.
                await new Promise(resolve => setTimeout(resolve, 20 + retry * 5));
            }
        }
        throw new Error('STORE_BUSY');
    }
    async read(key: string): Promise<StoredObject | null> { validKey(key); const db = await this.database(); const row = db.prepare('SELECT bytes, version FROM objects WHERE key=?').get(key); return row ? { bytes: Buffer.from(row.bytes as Uint8Array), version: String(row.version) } : null; }
    async write(key: string, bytes: Buffer, expectedVersion: string | null) {
        validKey(key);
        const db = await this.database();
        const version = randomUUID();
        const result = expectedVersion === null ? db.prepare('INSERT OR IGNORE INTO objects(key,bytes,version) VALUES(?,?,?)').run(key, bytes, version) : db.prepare('UPDATE objects SET bytes=?,version=? WHERE key=? AND version=?').run(bytes, version, key, expectedVersion);
        return Number(result.changes) === 1;
    }
    async delete(key: string) { validKey(key); const db = await this.database(); db.prepare('DELETE FROM objects WHERE key=?').run(key); db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); }
    async list(prefix: string) { const db = await this.database(); return db.prepare('SELECT key FROM objects WHERE substr(key,1,?)=? ORDER BY key').all(prefix.length, prefix).map(row => String(row.key)); }
}
/** Uses Application Default Credentials only on the private worker. No browser keys or signed URLs. */
export class GcsJobObjectStore implements JobObjectStore {
    constructor(private readonly bucket: import('@google-cloud/storage').Bucket) { }
    async read(key: string): Promise<StoredObject | null> {
        validKey(key);
        for (let attempt = 0; attempt < 8; attempt++) {
            let generation: string;
            try {
                const [metadata] = await this.bucket.file(key).getMetadata();
                generation = String(metadata.generation);
            }
            catch (error) {
                if (code(error) === 404)
                    return null;
                throw error;
            }
            try {
                // Pin both bytes and CAS token to one generation. Concurrent replacement can
                // delete this generation without deleting the current object: retry metadata.
                const [bytes] = await this.bucket.file(key, { generation }).download({ validation: 'crc32c' });
                return { bytes, version: generation };
            }
            catch (error) {
                if (code(error) !== 404)
                    throw error;
            }
        }
        throw new Error('STORE_BUSY');
    }
    async write(key: string, bytes: Buffer, expectedVersion: string | null) {
        validKey(key);
        try {
            await this.bucket.file(key).save(bytes, { resumable: false, validation: 'crc32c', preconditionOpts: { ifGenerationMatch: expectedVersion ?? 0 }, metadata: { cacheControl: 'no-store', contentType: 'application/octet-stream' } });
            return true;
        }
        catch (error) {
            if (code(error) === 412 || code(error) === 409)
                return false;
            throw error;
        }
    }
    async delete(key: string) { validKey(key); await this.bucket.file(key).delete({ ignoreNotFound: true }); }
    async list(prefix: string) { const [files] = await this.bucket.getFiles({ prefix }); return files.map(file => file.name).sort(); }
}
