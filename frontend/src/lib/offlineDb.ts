import Dexie, { Table } from 'dexie';

// Tipos para dados offline
interface OfflineVistoria {
    id?: number;
    tempId: string;
    data: any;
    synced: boolean;
    createdAt: Date;
}

interface OfflineItem {
    id?: number;
    vistoriaId: string;
    itemId: string;
    data: any;
    synced: boolean;
    createdAt: Date;
}

interface OfflineFoto {
    id?: number;
    itemId: string;
    file: Blob;
    descricao?: string;
    synced: boolean;
    createdAt: Date;
}

interface CachedData {
    id?: number;
    key: string;
    data: any;
    expiresAt: Date;
}

// Database
class VistoriaOfflineDB extends Dexie {
    vistorias!: Table<OfflineVistoria>;
    itens!: Table<OfflineItem>;
    fotos!: Table<OfflineFoto>;
    cache!: Table<CachedData>;

    constructor() {
        super('VistoriaOfflineDB');

        this.version(1).stores({
            vistorias: '++id, tempId, synced, createdAt',
            itens: '++id, vistoriaId, itemId, synced, createdAt',
            fotos: '++id, itemId, synced, createdAt',
            cache: '++id, key, expiresAt',
        });
    }
}

const db = new VistoriaOfflineDB();

// Funções helpers
export const offlineDb = {
    // Vistorias
    async saveVistoria(tempId: string, data: any): Promise<number> {
        return db.vistorias.add({
            tempId,
            data,
            synced: false,
            createdAt: new Date(),
        });
    },

    async getUnsyncedVistorias(): Promise<OfflineVistoria[]> {
        return db.vistorias.where('synced').equals(0).toArray();
    },

    async markVistoriaSynced(id: number): Promise<void> {
        await db.vistorias.update(id, { synced: true });
    },

    async deleteVistoria(id: number): Promise<void> {
        await db.vistorias.delete(id);
    },

    // Itens
    async saveItem(vistoriaId: string, itemId: string, data: any): Promise<number> {
        // Remove item antigo se existir
        await db.itens.where({ vistoriaId, itemId }).delete();

        return db.itens.add({
            vistoriaId,
            itemId,
            data,
            synced: false,
            createdAt: new Date(),
        });
    },

    async getUnsyncedItems(): Promise<OfflineItem[]> {
        return db.itens.where('synced').equals(0).toArray();
    },

    async markItemSynced(id: number): Promise<void> {
        await db.itens.update(id, { synced: true });
    },

    // Fotos
    async saveFoto(itemId: string, file: Blob, descricao?: string): Promise<number> {
        return db.fotos.add({
            itemId,
            file,
            descricao,
            synced: false,
            createdAt: new Date(),
        });
    },

    async getUnsyncedFotos(): Promise<OfflineFoto[]> {
        return db.fotos.where('synced').equals(0).toArray();
    },

    async markFotoSynced(id: number): Promise<void> {
        await db.fotos.update(id, { synced: true });
    },

    // Cache
    async cacheData(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        // Remove cache antigo
        await db.cache.where('key').equals(key).delete();

        await db.cache.add({ key, data, expiresAt });
    },

    async getCachedData<T>(key: string): Promise<T | null> {
        const cached = await db.cache.where('key').equals(key).first();

        if (!cached) return null;

        // Verifica expiração
        if (new Date() > cached.expiresAt) {
            await db.cache.delete(cached.id!);
            return null;
        }

        return cached.data as T;
    },

    // Limpar dados antigos
    async cleanup(): Promise<void> {
        // Remove cache expirado
        const now = new Date();
        await db.cache.where('expiresAt').below(now).delete();

        // Remove dados sincronizados com mais de 7 dias
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await db.vistorias.where('createdAt').below(weekAgo).and(v => v.synced).delete();
        await db.itens.where('createdAt').below(weekAgo).and(i => i.synced).delete();
        await db.fotos.where('createdAt').below(weekAgo).and(f => f.synced).delete();
    },

    // Conta pendências
    async getPendingCount(): Promise<number> {
        const [vistorias, itens, fotos] = await Promise.all([
            db.vistorias.where('synced').equals(0).count(),
            db.itens.where('synced').equals(0).count(),
            db.fotos.where('synced').equals(0).count(),
        ]);
        return vistorias + itens + fotos;
    },
};

export default db;
