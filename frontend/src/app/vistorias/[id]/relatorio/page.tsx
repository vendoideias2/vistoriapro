'use client';

import { useAuth } from '../../../providers';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Download, CheckCircle2, AlertCircle, X, MinusCircle } from 'lucide-react';

const ESTADOS: Record<string, { label: string; icon: any; color: string }> = {
    BOM: { label: 'Bom', icon: CheckCircle2, color: 'text-green-600' },
    REGULAR: { label: 'Regular', icon: AlertCircle, color: 'text-yellow-600' },
    RUIM: { label: 'Ruim', icon: X, color: 'text-red-600' },
    NAO_APLICAVEL: { label: 'N/A', icon: MinusCircle, color: 'text-gray-500' },
    NAO_VERIFICADO: { label: 'Não verificado', icon: MinusCircle, color: 'text-gray-400' },
};

export default function RelatorioPage({ params }: { params: { id: string } }) {
    const { user, isLoading, token } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    const { data: vistoria, isLoading: loading } = useQuery({
        queryKey: ['vistoria', params.id],
        queryFn: () => api.getVistoria(params.id),
        enabled: !!user,
    });

    if (isLoading || !user || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const v = vistoria as any;

    // Agrupar itens por ambiente
    const itensPorAmbiente = v.itens?.reduce((acc: any, item: any) => {
        const ambNome = item.ambiente.nome;
        if (!acc[ambNome]) acc[ambNome] = [];
        acc[ambNome].push(item);
        return acc;
    }, {}) || {};

    const handleDownloadPDF = () => {
        const url = `${api.getRelatorioUrl(params.id)}?token=${token}`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary-800 to-primary-600 text-white shadow-lg sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/vistorias/${params.id}`} className="p-2 hover:bg-white/10 rounded-lg">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="font-bold">Relatório de Vistoria</h1>
                            <p className="text-primary-200 text-sm">{v.imovel?.endereco}</p>
                        </div>
                        <button onClick={handleDownloadPDF} className="btn bg-white text-primary-700 hover:bg-primary-50">
                            <Download className="h-5 w-5" />
                            <span className="hidden sm:inline">PDF</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Report content */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Cabeçalho do relatório */}
                <div className="text-center mb-8 pb-6 border-b">
                    <h1 className="text-3xl font-bold text-primary-800 mb-2">📋 Relatório de Vistoria</h1>
                    <p className="text-gray-500">
                        Gerado em {new Date().toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>

                {/* Info cards */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3">Informações da Vistoria</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Tipo:</span> {v.tipo}</p>
                            <p><span className="text-gray-500">Status:</span> {v.status.replace('_', ' ')}</p>
                            <p><span className="text-gray-500">Data:</span> {new Date(v.dataVistoria).toLocaleDateString('pt-BR')}</p>
                            <p><span className="text-gray-500">Vistoriador:</span> {v.vistoriador?.nome}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3">Dados do Imóvel</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Endereço:</span> {v.imovel?.endereco}, {v.imovel?.numero || 'S/N'}</p>
                            <p><span className="text-gray-500">Bairro:</span> {v.imovel?.bairro}</p>
                            <p><span className="text-gray-500">Cidade:</span> {v.imovel?.cidade} - {v.imovel?.estado}</p>
                            <p><span className="text-gray-500">Tipo:</span> {v.imovel?.tipo}</p>
                        </div>
                    </div>
                </div>

                {/* Checklist por ambiente */}
                <h2 className="text-xl font-bold text-gray-900 mb-4">📝 Checklist por Ambiente</h2>

                {Object.entries(itensPorAmbiente).map(([ambNome, itens]: [string, any]) => (
                    <div key={ambNome} className="mb-6">
                        <h3 className="font-semibold text-lg bg-primary-100 text-primary-800 px-4 py-2 rounded-lg mb-3">
                            {ambNome}
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 px-3">Item</th>
                                        <th className="text-left py-2 px-3">Estado</th>
                                        <th className="text-left py-2 px-3">Observação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(itens as any[]).map((item: any) => {
                                        const estado = ESTADOS[item.estado] || ESTADOS.NAO_VERIFICADO;
                                        const Icon = estado.icon;
                                        return (
                                            <tr key={item.id} className="border-b">
                                                <td className="py-2 px-3 font-medium">{item.item}</td>
                                                <td className="py-2 px-3">
                                                    <span className={`flex items-center gap-1 ${estado.color}`}>
                                                        <Icon className="h-4 w-4" />
                                                        {estado.label}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-gray-600">{item.observacao || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Fotos do ambiente */}
                        {(itens as any[]).some(i => i.fotos?.length > 0) && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Fotos:</p>
                                <div className="flex flex-wrap gap-3">
                                    {(itens as any[]).flatMap(i => i.fotos || []).map((foto: any) => (
                                        <img
                                            key={foto.id}
                                            src={`${process.env.NEXT_PUBLIC_API_URL}${foto.url}`}
                                            alt=""
                                            className="w-32 h-24 object-cover rounded-lg border"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Observações gerais */}
                {v.observacoes && (
                    <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h3 className="font-semibold text-gray-900 mb-2">📌 Observações Gerais</h3>
                        <p className="text-gray-700">{v.observacoes}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
                    <p>Documento gerado pelo Sistema de Vistoria Imobiliária</p>
                    <p className="mt-1">Este relatório tem valor jurídico quando assinado pelas partes</p>
                </div>
            </main>
        </div>
    );
}
