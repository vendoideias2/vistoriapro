'use client';

import { useAuth } from './providers';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Building2, ClipboardCheck, Plus, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function HomePage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    const { data: vistoriasData } = useQuery({
        queryKey: ['vistorias-recentes'],
        queryFn: () => api.getVistorias({ limit: '5' }),
        enabled: !!user,
    });

    const { data: imoveisData } = useQuery({
        queryKey: ['imoveis-count'],
        queryFn: () => api.getImoveis({ limit: '1' }),
        enabled: !!user,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!user) return null;

    const vistorias = (vistoriasData as any)?.data || [];
    const totalImoveis = (imoveisData as any)?.pagination?.total || 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary-800 to-primary-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <ClipboardCheck className="h-8 w-8" />
                                Vistoria Imobiliária
                            </h1>
                            <p className="text-primary-100 text-sm mt-1">Olá, {user.nome}!</p>
                        </div>
                        <Link
                            href="/vistorias/nova"
                            className="btn bg-white text-primary-700 hover:bg-primary-50 shadow-md"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="hidden sm:inline">Nova Vistoria</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="card animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary-100 rounded-lg">
                                <Building2 className="h-6 w-6 text-primary-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{totalImoveis}</p>
                                <p className="text-sm text-gray-500">Imóveis</p>
                            </div>
                        </div>
                    </div>

                    <div className="card animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {vistorias.filter((v: any) => v.status === 'EM_ANDAMENTO').length}
                                </p>
                                <p className="text-sm text-gray-500">Em andamento</p>
                            </div>
                        </div>
                    </div>

                    <div className="card animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {vistorias.filter((v: any) => v.status === 'FINALIZADA').length}
                                </p>
                                <p className="text-sm text-gray-500">Finalizadas</p>
                            </div>
                        </div>
                    </div>

                    <div className="card animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <ClipboardCheck className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{vistorias.length}</p>
                                <p className="text-sm text-gray-500">Total</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <Link href="/imoveis" className="card hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl text-white">
                                    <Building2 className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Imóveis</h3>
                                    <p className="text-gray-500">Gerenciar imóveis cadastrados</p>
                                </div>
                            </div>
                            <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-primary-600 transition-colors" />
                        </div>
                    </Link>

                    <Link href="/vistorias" className="card hover:shadow-lg transition-shadow group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl text-white">
                                    <ClipboardCheck className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Vistorias</h3>
                                    <p className="text-gray-500">Ver todas as vistorias</p>
                                </div>
                            </div>
                            <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-primary-600 transition-colors" />
                        </div>
                    </Link>
                </div>

                {/* Vistorias recentes */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Vistorias Recentes</h2>
                    {vistorias.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>Nenhuma vistoria encontrada</p>
                            <Link href="/vistorias/nova" className="btn btn-primary mt-4 inline-flex">
                                <Plus className="h-4 w-4" /> Criar primeira vistoria
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {vistorias.map((vistoria: any) => (
                                <Link
                                    key={vistoria.id}
                                    href={`/vistorias/${vistoria.id}`}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {vistoria.imovel.endereco}, {vistoria.imovel.numero}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {vistoria.tipo} • {new Date(vistoria.dataVistoria).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <span className={`badge ${vistoria.status === 'FINALIZADA' ? 'badge-success' :
                                            vistoria.status === 'EM_ANDAMENTO' ? 'badge-warning' : 'badge-danger'
                                        }`}>
                                        {vistoria.status.replace('_', ' ')}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom nav mobile */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
                <div className="flex justify-around py-2">
                    <Link href="/" className="flex flex-col items-center py-2 px-4 text-primary-600">
                        <ClipboardCheck className="h-6 w-6" />
                        <span className="text-xs mt-1">Início</span>
                    </Link>
                    <Link href="/imoveis" className="flex flex-col items-center py-2 px-4 text-gray-500">
                        <Building2 className="h-6 w-6" />
                        <span className="text-xs mt-1">Imóveis</span>
                    </Link>
                    <Link href="/vistorias/nova" className="flex flex-col items-center py-2 px-4 text-gray-500">
                        <Plus className="h-6 w-6" />
                        <span className="text-xs mt-1">Nova</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
