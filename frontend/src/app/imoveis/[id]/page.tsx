'use client';

import { useAuth } from '../../providers';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Building2, ArrowLeft, MapPin, ClipboardCheck, Plus, User, Phone, Edit2 } from 'lucide-react';

export default function ImovelDetalhePage({ params }: { params: { id: string } }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    const { data: imovel, isLoading: loadingImovel } = useQuery({
        queryKey: ['imovel', params.id],
        queryFn: () => api.getImovel(params.id),
        enabled: !!user,
    });

    if (isLoading || !user) return null;

    if (loadingImovel) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const im = imovel as any;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary-800 to-primary-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/imoveis" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold">
                                {im.endereco}, {im.numero || 'S/N'}
                            </h1>
                            <p className="text-primary-200 text-sm flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {im.bairro} - {im.cidade}/{im.estado}
                            </p>
                        </div>
                        <span className="badge bg-white/20 text-white">{im.tipo}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Ações rápidas */}
                <div className="grid grid-cols-2 gap-4">
                    <Link
                        href={`/vistorias/nova?imovelId=${im.id}`}
                        className="card bg-gradient-to-br from-primary-500 to-primary-700 text-white hover:shadow-lg transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <ClipboardCheck className="h-8 w-8" />
                            <div>
                                <p className="font-semibold">Nova Vistoria</p>
                                <p className="text-sm text-primary-100">Iniciar vistoria</p>
                            </div>
                        </div>
                    </Link>

                    <button className="card hover:shadow-lg transition-all text-left">
                        <div className="flex items-center gap-3">
                            <Edit2 className="h-8 w-8 text-gray-400" />
                            <div>
                                <p className="font-semibold text-gray-900">Editar</p>
                                <p className="text-sm text-gray-500">Alterar dados</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Informações */}
                <div className="card">
                    <h2 className="font-semibold text-gray-900 mb-4">Informações</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {im.proprietario && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <User className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Proprietário</p>
                                    <p className="font-medium">{im.proprietario}</p>
                                </div>
                            </div>
                        )}
                        {im.telefone && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Phone className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Telefone</p>
                                    <p className="font-medium">{im.telefone}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ambientes */}
                <div className="card">
                    <h2 className="font-semibold text-gray-900 mb-4">
                        Ambientes ({im.ambientes?.length || 0})
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {im.ambientes?.map((amb: any) => (
                            <span
                                key={amb.id}
                                className={`badge ${amb.existe ? 'badge-success' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {amb.nome}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Histórico de vistorias */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-900">Vistorias</h2>
                        <Link href={`/vistorias/nova?imovelId=${im.id}`} className="btn btn-primary btn-sm">
                            <Plus className="h-4 w-4" /> Nova
                        </Link>
                    </div>

                    {im.vistorias?.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Nenhuma vistoria realizada</p>
                    ) : (
                        <div className="space-y-2">
                            {im.vistorias?.map((v: any) => (
                                <Link
                                    key={v.id}
                                    href={`/vistorias/${v.id}`}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium">{v.tipo}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(v.dataVistoria).toLocaleDateString('pt-BR')} • {v.vistoriador?.nome}
                                        </p>
                                    </div>
                                    <span className={`badge ${v.status === 'FINALIZADA' ? 'badge-success' :
                                            v.status === 'EM_ANDAMENTO' ? 'badge-warning' : 'badge-danger'
                                        }`}>
                                        {v.status.replace('_', ' ')}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
