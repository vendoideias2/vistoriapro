'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineDb } from '@/lib/offlineDb';
import { api } from '@/lib/api';

interface SyncStatus {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    lastSync: Date | null;
}

export function useOffline() {
    const [status, setStatus] = useState<SyncStatus>({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        pendingCount: 0,
        isSyncing: false,
        lastSync: null,
    });

    // Atualiza contagem de pendências
    const updatePendingCount = useCallback(async () => {
        try {
            const count = await offlineDb.getPendingCount();
            setStatus(prev => ({ ...prev, pendingCount: count }));
        } catch (error) {
            console.error('Erro ao contar pendências:', error);
        }
    }, []);

    // Sincroniza dados offline
    const sync = useCallback(async () => {
        if (!navigator.onLine || status.isSyncing) return;

        setStatus(prev => ({ ...prev, isSyncing: true }));

        try {
            // Sincroniza vistorias
            const vistorias = await offlineDb.getUnsyncedVistorias();
            for (const vistoria of vistorias) {
                try {
                    await api.createVistoria(vistoria.data);
                    await offlineDb.markVistoriaSynced(vistoria.id!);
                } catch (error) {
                    console.error('Erro ao sincronizar vistoria:', error);
                }
            }

            // Sincroniza itens
            const itens = await offlineDb.getUnsyncedItems();
            for (const item of itens) {
                try {
                    await api.updateItem(item.vistoriaId, item.itemId, item.data);
                    await offlineDb.markItemSynced(item.id!);
                } catch (error) {
                    console.error('Erro ao sincronizar item:', error);
                }
            }

            // Sincroniza fotos
            const fotos = await offlineDb.getUnsyncedFotos();
            for (const foto of fotos) {
                try {
                    const file = new File([foto.file], 'foto.jpg', { type: 'image/jpeg' });
                    await api.uploadFoto(foto.itemId, file, foto.descricao);
                    await offlineDb.markFotoSynced(foto.id!);
                } catch (error) {
                    console.error('Erro ao sincronizar foto:', error);
                }
            }

            // Limpa dados antigos
            await offlineDb.cleanup();

            setStatus(prev => ({
                ...prev,
                lastSync: new Date(),
            }));

            await updatePendingCount();
        } catch (error) {
            console.error('Erro na sincronização:', error);
        } finally {
            setStatus(prev => ({ ...prev, isSyncing: false }));
        }
    }, [status.isSyncing, updatePendingCount]);

    // Listeners de online/offline
    useEffect(() => {
        const handleOnline = () => {
            setStatus(prev => ({ ...prev, isOnline: true }));
            // Sincroniza automaticamente quando voltar online
            sync();
        };

        const handleOffline = () => {
            setStatus(prev => ({ ...prev, isOnline: false }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Atualiza contagem inicial
        updatePendingCount();

        // Sincronização periódica (a cada 5 minutos)
        const interval = setInterval(() => {
            if (navigator.onLine) {
                sync();
            }
        }, 5 * 60 * 1000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [sync, updatePendingCount]);

    return {
        ...status,
        sync,
        updatePendingCount,
    };
}
