'use client';

import { useAuth } from '../providers';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ClipboardCheck, ArrowLeft, Search, Filter, Plus, Clock, CheckCircle2 } from 'lucide-react';

export default function VistoriasPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    const { data, isLoading: loading } = useQuery({
        queryKey: ['vistorias', statusFilter],
        queryFn: () => api.getVistorias(statusFilter ? { status: statusFilter } : undefined),
        enabled: !!user,
    });

    if (isLoading || !user) return null;

    const vistorias = ((data as any)?.data || []).filter((v: any) =>
        search ? v.imovel.endereco.toLowerCase().includes(search.toLowerCase()) : true
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary-800 to-primary-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <ClipboardCheck className="h-7 w-7" />
                                Vistorias
                            </h1>
                        </div>
                        <Link href="/vistorias/nova" className="btn bg-white text-primary-700 hover:bg-primary-50">
                            <Plus className="h-5 w-5" />
                            <span className="hidden sm:inline">Nova</span>
                        </Link>
                    </div>

                    {/* Filtros */}
                    <div className="mt-4 flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-300" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-primary-200 focus:bg-white/20"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        >
                            <option value="">Todos</option>
                            <option value="EM_ANDAMENTO">Em andamento</option>
                            <option value="FINALIZADA">Finalizadas</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                ) : vistorias.length === 0 ? (
                    <div className="card text-center py-12">
                        <ClipboardCheck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma vistoria</h3>
                        <Link href="/vistorias/nova" className="btn btn-primary">
                            <Plus className="h-5 w-5" /> Criar Vistoria
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {vistorias.map((v: any, idx: number) => (
                            <Link
                                key={v.id}
                                href={`/vistorias/${v.id}`}
                                className="card hover:shadow-lg transition-all animate-fadeIn flex items-center gap-4"
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                <div className={`p-3 rounded-lg ${v.status === 'FINALIZADA' ? 'bg-green-100' : 'bg-yellow-100'
                                    }`}>
                                    {v.status === 'FINALIZADA' ? (
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                    ) : (
                                        <Clock className="h-6 w-6 text-yellow-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate">
                                        {v.imovel.endereco}, {v.imovel.numero}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {v.tipo} • {new Date(v.dataVistoria).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`badge ${v.status === 'FINALIZADA' ? 'badge-success' : 'badge-warning'
                                        }`}>
                                        {v.status.replace('_', ' ')}
                                    </span>
                                    <p className="text-xs text-gray-400 mt-1">{v.vistoriador?.nome}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
