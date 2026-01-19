'use client';

import { useAuth } from '../../providers';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import {
    ArrowLeft, ClipboardCheck, Camera, Check, X, ChevronDown, ChevronUp,
    FileText, CheckCircle2, AlertCircle, MinusCircle, HelpCircle, Trash2
} from 'lucide-react';

const ESTADOS = [
    { value: 'BOM', label: 'Bom', icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
    { value: 'REGULAR', label: 'Regular', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-100' },
    { value: 'RUIM', label: 'Ruim', icon: X, color: 'text-red-600 bg-red-100' },
    { value: 'NAO_APLICAVEL', label: 'N/A', icon: MinusCircle, color: 'text-gray-600 bg-gray-100' },
];

export default function VistoriaPage({ params }: { params: { id: string } }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [expandedAmbiente, setExpandedAmbiente] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingItem, setUploadingItem] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    const { data: vistoria, isLoading: loading, refetch } = useQuery({
        queryKey: ['vistoria', params.id],
        queryFn: () => api.getVistoria(params.id),
        enabled: !!user,
    });

    const { data: progresso } = useQuery({
        queryKey: ['progresso', params.id],
        queryFn: () => api.getProgresso(params.id),
        enabled: !!user,
        refetchInterval: 5000,
    });

    const updateItemMutation = useMutation({
        mutationFn: ({ itemId, data }: { itemId: string; data: any }) =>
            api.updateItem(params.id, itemId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vistoria', params.id] });
            queryClient.invalidateQueries({ queryKey: ['progresso', params.id] });
        },
    });

    const finalizarMutation = useMutation({
        mutationFn: () => api.finalizarVistoria(params.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vistoria', params.id] });
            router.push(`/vistorias/${params.id}/relatorio`);
        },
    });

    const handleUploadPhoto = async (itemId: string, file: File) => {
        setUploadingItem(itemId);
        try {
            const compressed = await imageCompression(file, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            });
            await api.uploadFoto(itemId, compressed);
            refetch();
        } catch (error) {
            console.error('Erro no upload:', error);
        } finally {
            setUploadingItem(null);
        }
    };

    if (isLoading || !user || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const v = vistoria as any;
    const prog = progresso as any;
    const isFinalizada = v.status === 'FINALIZADA';

    // Agrupar itens por ambiente
    const itensPorAmbiente = v.itens?.reduce((acc: any, item: any) => {
        const ambNome = item.ambiente.nome;
        if (!acc[ambNome]) acc[ambNome] = { id: item.ambiente.id, itens: [] };
        acc[ambNome].itens.push(item);
        return acc;
    }, {}) || {};

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-24">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary-800 to-primary-600 text-white shadow-lg sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/vistorias" className="p-2 hover:bg-white/10 rounded-lg">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <h1 className="font-bold truncate">{v.imovel?.endereco}</h1>
                            <p className="text-primary-200 text-sm">{v.tipo} • {new Date(v.dataVistoria).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <span className={`badge ${isFinalizada ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                            {v.status.replace('_', ' ')}
                        </span>
                    </div>

                    {/* Progress bar */}
                    {prog && !isFinalizada && (
                        <div className="mt-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span>Progresso</span>
                                <span>{prog.percentual}%</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all duration-300"
                                    style={{ width: `${prog.percentual}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
                {Object.entries(itensPorAmbiente).map(([ambNome, data]: [string, any]) => (
                    <div key={ambNome} className="card overflow-hidden">
                        <button
                            onClick={() => setExpandedAmbiente(expandedAmbiente === ambNome ? null : ambNome)}
                            className="w-full flex items-center justify-between p-4 -m-6 mb-0 hover:bg-gray-50"
                        >
                            <div className="flex items-center gap-3">
                                <h2 className="font-semibold text-gray-900">{ambNome}</h2>
                                <span className="text-sm text-gray-500">
                                    {data.itens.filter((i: any) => i.estado !== 'NAO_VERIFICADO').length}/{data.itens.length}
                                </span>
                            </div>
                            {expandedAmbiente === ambNome ? (
                                <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                        </button>

                        {expandedAmbiente === ambNome && (
                            <div className="mt-4 pt-4 border-t space-y-4">
                                {data.itens.map((item: any) => (
                                    <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium">{item.item}</h3>
                                            {!isFinalizada && (
                                                <button
                                                    onClick={() => {
                                                        setUploadingItem(item.id);
                                                        fileInputRef.current?.click();
                                                    }}
                                                    className="btn btn-secondary text-sm py-1 px-3"
                                                >
                                                    <Camera className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Estado buttons */}
                                        {!isFinalizada && (
                                            <div className="flex gap-2 mb-3">
                                                {ESTADOS.map(e => (
                                                    <button
                                                        key={e.value}
                                                        onClick={() => updateItemMutation.mutate({
                                                            itemId: item.id,
                                                            data: { estado: e.value }
                                                        })}
                                                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${item.estado === e.value ? e.color : 'bg-gray-200 text-gray-600'
                                                            }`}
                                                    >
                                                        <e.icon className="h-4 w-4" />
                                                        <span className="hidden sm:inline">{e.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Observação */}
                                        {!isFinalizada ? (
                                            <input
                                                type="text"
                                                placeholder="Observação..."
                                                defaultValue={item.observacao || ''}
                                                onBlur={(e) => {
                                                    if (e.target.value !== (item.observacao || '')) {
                                                        updateItemMutation.mutate({
                                                            itemId: item.id,
                                                            data: { estado: item.estado, observacao: e.target.value }
                                                        });
                                                    }
                                                }}
                                                className="w-full px-3 py-2 text-sm border rounded-lg"
                                            />
                                        ) : item.observacao && (
                                            <p className="text-sm text-gray-600">{item.observacao}</p>
                                        )}

                                        {/* Fotos */}
                                        {item.fotos?.length > 0 && (
                                            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                                                {item.fotos.map((foto: any) => (
                                                    <div key={foto.id} className="relative flex-shrink-0">
                                                        <img
                                                            src={`${process.env.NEXT_PUBLIC_API_URL}${foto.url}`}
                                                            alt=""
                                                            className="w-20 h-20 object-cover rounded-lg"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {uploadingItem === item.id && (
                                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                                                Enviando foto...
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </main>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && uploadingItem) {
                        handleUploadPhoto(uploadingItem, file);
                    }
                    e.target.value = '';
                }}
            />

            {/* Bottom actions */}
            {!isFinalizada && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
                    <div className="max-w-3xl mx-auto flex gap-3">
                        <Link href={`/vistorias/${params.id}/relatorio`} className="btn btn-secondary flex-1">
                            <FileText className="h-5 w-5" />
                            Ver Prévia
                        </Link>
                        <button
                            onClick={() => finalizarMutation.mutate()}
                            disabled={prog?.percentual < 100 || finalizarMutation.isPending}
                            className="btn btn-success flex-1"
                        >
                            {finalizarMutation.isPending ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Check className="h-5 w-5" />
                                    Finalizar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {isFinalizada && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
                    <div className="max-w-3xl mx-auto">
                        <Link href={`/vistorias/${params.id}/relatorio`} className="btn btn-primary w-full">
                            <FileText className="h-5 w-5" />
                            Ver Relatório
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
