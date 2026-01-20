'use client';

import { useAuth } from '../../providers';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Minus, CheckCircle2, AlertCircle, X, MinusCircle, BarChart3 } from 'lucide-react';

const ESTADOS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    BOM: { label: 'Bom', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
    REGULAR: { label: 'Regular', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    RUIM: { label: 'Ruim', icon: X, color: 'text-red-600', bg: 'bg-red-100' },
    NAO_APLICAVEL: { label: 'N/A', icon: MinusCircle, color: 'text-gray-500', bg: 'bg-gray-100' },
    NAO_VERIFICADO: { label: 'Não verificado', icon: MinusCircle, color: 'text-gray-400', bg: 'bg-gray-50' },
};

const ESTADO_ORDEM = ['BOM', 'REGULAR', 'RUIM', 'NAO_APLICAVEL', 'NAO_VERIFICADO'];

function getEstadoChange(entrada: string, saida: string) {
    const idxEntrada = ESTADO_ORDEM.indexOf(entrada);
    const idxSaida = ESTADO_ORDEM.indexOf(saida);

    if (idxEntrada === idxSaida) return 'same';
    if (idxSaida < idxEntrada) return 'improved';
    return 'worsened';
}

export default function ComparativoPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const entradaId = searchParams.get('entrada');
    const saidaId = searchParams.get('saida');

    const [selectedEntrada, setSelectedEntrada] = useState(entradaId || '');
    const [selectedSaida, setSelectedSaida] = useState(saidaId || '');

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    // Buscar vistorias para seleção
    const { data: vistorias } = useQuery({
        queryKey: ['vistorias-all'],
        queryFn: () => api.getVistorias({ limit: '100' }),
        enabled: !!user,
    });

    // Buscar comparativo quando ambos IDs estão selecionados
    const { data: comparativo, isLoading: loadingComp } = useQuery({
        queryKey: ['comparativo', selectedEntrada, selectedSaida],
        queryFn: () => api.compararVistorias(selectedEntrada, selectedSaida),
        enabled: !!user && !!selectedEntrada && !!selectedSaida,
    });

    if (isLoading || !user) return null;

    const vistoriasList = (vistorias as any)?.data || [];
    const comp = comparativo as any;

    // Agrupar por ambiente
    const porAmbiente = comp?.comparativo?.reduce((acc: any, item: any) => {
        if (!acc[item.ambiente]) acc[item.ambiente] = [];
        acc[item.ambiente].push(item);
        return acc;
    }, {}) || {};

    // Estatísticas
    const stats = comp?.comparativo?.reduce((acc: any, item: any) => {
        if (!item.saida) return acc;
        const change = getEstadoChange(item.entrada.estado, item.saida.estado);
        acc[change]++;
        return acc;
    }, { improved: 0, worsened: 0, same: 0 }) || { improved: 0, worsened: 0, same: 0 };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary-800 to-primary-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/vistorias" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <BarChart3 className="h-7 w-7" />
                                Comparativo Entrada x Saída
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Seleção de vistorias */}
                <div className="card mb-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Selecione as vistorias para comparar</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Vistoria de Entrada
                            </label>
                            <select
                                value={selectedEntrada}
                                onChange={(e) => setSelectedEntrada(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">Selecione...</option>
                                {vistoriasList
                                    .filter((v: any) => v.tipo === 'ENTRADA' && v.status === 'FINALIZADA')
                                    .map((v: any) => (
                                        <option key={v.id} value={v.id}>
                                            {v.imovel.endereco} - {new Date(v.dataVistoria).toLocaleDateString('pt-BR')}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Vistoria de Saída
                            </label>
                            <select
                                value={selectedSaida}
                                onChange={(e) => setSelectedSaida(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">Selecione...</option>
                                {vistoriasList
                                    .filter((v: any) => v.tipo === 'SAIDA' && v.status === 'FINALIZADA')
                                    .map((v: any) => (
                                        <option key={v.id} value={v.id}>
                                            {v.imovel.endereco} - {new Date(v.dataVistoria).toLocaleDateString('pt-BR')}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loadingComp && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                )}

                {comp && (
                    <>
                        {/* Resumo */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="card bg-green-50 border-green-200">
                                <div className="flex items-center gap-3">
                                    <ArrowUp className="h-8 w-8 text-green-600" />
                                    <div>
                                        <p className="text-2xl font-bold text-green-700">{stats.improved}</p>
                                        <p className="text-sm text-green-600">Melhoraram</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card bg-gray-50 border-gray-200">
                                <div className="flex items-center gap-3">
                                    <Minus className="h-8 w-8 text-gray-600" />
                                    <div>
                                        <p className="text-2xl font-bold text-gray-700">{stats.same}</p>
                                        <p className="text-sm text-gray-600">Sem alteração</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card bg-red-50 border-red-200">
                                <div className="flex items-center gap-3">
                                    <ArrowDown className="h-8 w-8 text-red-600" />
                                    <div>
                                        <p className="text-2xl font-bold text-red-700">{stats.worsened}</p>
                                        <p className="text-sm text-red-600">Pioraram</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabela comparativa */}
                        {Object.entries(porAmbiente).map(([ambiente, itens]: [string, any]) => (
                            <div key={ambiente} className="card mb-4">
                                <h3 className="font-semibold text-lg bg-primary-100 text-primary-800 px-4 py-2 rounded-lg mb-4">
                                    {ambiente}
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50">
                                                <th className="text-left py-2 px-3 font-medium">Item</th>
                                                <th className="text-center py-2 px-3 font-medium">Entrada</th>
                                                <th className="text-center py-2 px-3 font-medium w-12"></th>
                                                <th className="text-center py-2 px-3 font-medium">Saída</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itens.map((item: any, idx: number) => {
                                                const entradaEstado = ESTADOS[item.entrada.estado] || ESTADOS.NAO_VERIFICADO;
                                                const saidaEstado = item.saida ? ESTADOS[item.saida.estado] || ESTADOS.NAO_VERIFICADO : null;
                                                const change = item.saida ? getEstadoChange(item.entrada.estado, item.saida.estado) : 'same';
                                                const EntradaIcon = entradaEstado.icon;
                                                const SaidaIcon = saidaEstado?.icon;

                                                return (
                                                    <tr key={idx} className={`border-b ${item.mudou ? 'bg-yellow-50' : ''}`}>
                                                        <td className="py-3 px-3 font-medium">{item.item}</td>
                                                        <td className="py-3 px-3">
                                                            <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full ${entradaEstado.bg}`}>
                                                                <EntradaIcon className={`h-4 w-4 ${entradaEstado.color}`} />
                                                                <span className={entradaEstado.color}>{entradaEstado.label}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 text-center">
                                                            {change === 'improved' && <ArrowUp className="h-5 w-5 text-green-600 mx-auto" />}
                                                            {change === 'worsened' && <ArrowDown className="h-5 w-5 text-red-600 mx-auto" />}
                                                            {change === 'same' && <ArrowRight className="h-5 w-5 text-gray-400 mx-auto" />}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            {saidaEstado ? (
                                                                <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full ${saidaEstado.bg}`}>
                                                                    <SaidaIcon className={`h-4 w-4 ${saidaEstado.color}`} />
                                                                    <span className={saidaEstado.color}>{saidaEstado.label}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-center block">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </main>
        </div>
    );
}
