'use client';

import { useAuth } from '../../providers';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Users, Home, ClipboardCheck, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444'];

export default function AdminDashboardPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        if (!isLoading && user && (user as any).role !== 'ADMIN') {
            router.push('/');
        }
    }, [user, isLoading, router]);

    const { data: metricas, isLoading: loadingMetricas } = useQuery({
        queryKey: ['admin-metricas'],
        queryFn: () => api.getMetricas(),
        enabled: !!user && (user as any).role === 'ADMIN',
    });

    const { data: vistoriasPorMes, isLoading: loadingGrafico } = useQuery({
        queryKey: ['admin-vistorias-por-mes'],
        queryFn: () => api.getVistoriasPorMes(),
        enabled: !!user && (user as any).role === 'ADMIN',
    });

    const { data: usuarios } = useQuery({
        queryKey: ['admin-usuarios'],
        queryFn: () => api.getUsuariosAtivos(),
        enabled: !!user && (user as any).role === 'ADMIN',
    });

    if (isLoading || !user || (user as any).role !== 'ADMIN') return null;

    const m = metricas as any;
    const chartData = vistoriasPorMes as any[] || [];
    const usersList = usuarios as any[] || [];

    const pieData = m?.vistoriasPorTipo ? [
        { name: 'Entrada', value: m.vistoriasPorTipo.ENTRADA || 0 },
        { name: 'Saída', value: m.vistoriasPorTipo.SAIDA || 0 },
        { name: 'Periódica', value: m.vistoriasPorTipo.PERIODICA || 0 },
    ].filter(d => d.value > 0) : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 pb-20">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary-900 to-primary-700 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <BarChart3 className="h-7 w-7" />
                                Dashboard Admin
                            </h1>
                            <p className="text-primary-200 text-sm">Métricas e estatísticas</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {loadingMetricas ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                    </div>
                ) : (
                    <>
                        {/* Cards de estatísticas */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-100 text-sm">Total Vistorias</p>
                                        <p className="text-3xl font-bold">{m?.totais?.vistorias || 0}</p>
                                    </div>
                                    <ClipboardCheck className="h-10 w-10 text-blue-200" />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-100 text-sm">Finalizadas</p>
                                        <p className="text-3xl font-bold">{m?.totais?.finalizadas || 0}</p>
                                    </div>
                                    <CheckCircle2 className="h-10 w-10 text-green-200" />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-yellow-100 text-sm">Em Andamento</p>
                                        <p className="text-3xl font-bold">{m?.totais?.emAndamento || 0}</p>
                                    </div>
                                    <Clock className="h-10 w-10 text-yellow-200" />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-purple-100 text-sm">Este Mês</p>
                                        <p className="text-3xl font-bold">{m?.totais?.vistoriasMes || 0}</p>
                                    </div>
                                    <TrendingUp className="h-10 w-10 text-purple-200" />
                                </div>
                            </div>
                        </div>

                        {/* Segunda linha de cards */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="p-3 bg-indigo-500/20 rounded-lg">
                                        <Home className="h-6 w-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-sm">Imóveis Cadastrados</p>
                                        <p className="text-2xl font-bold">{m?.totais?.imoveis || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="p-3 bg-pink-500/20 rounded-lg">
                                        <Users className="h-6 w-6 text-pink-400" />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-sm">Usuários Ativos</p>
                                        <p className="text-2xl font-bold">{m?.totais?.usuarios || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Gráficos */}
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            {/* Gráfico de barras - Vistorias por mês */}
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <h3 className="text-white font-semibold mb-4">Vistorias por Mês</h3>
                                <div className="h-64">
                                    {loadingGrafico ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
                                                <YAxis stroke="#94a3b8" fontSize={12} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                                    labelStyle={{ color: '#fff' }}
                                                />
                                                <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Gráfico de pizza - Tipos de vistoria */}
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <h3 className="text-white font-semibold mb-4">Tipos de Vistoria</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                            />
                                            <Legend
                                                wrapperStyle={{ color: '#94a3b8' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Últimas vistorias */}
                        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
                            <h3 className="text-white font-semibold mb-4">Últimas Vistorias</h3>
                            <div className="space-y-3">
                                {m?.ultimasVistorias?.map((v: any) => (
                                    <Link
                                        key={v.id}
                                        href={`/vistorias/${v.id}`}
                                        className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${v.status === 'FINALIZADA' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                            <div>
                                                <p className="text-white font-medium">{v.imovel.endereco}, {v.imovel.numero || 'S/N'}</p>
                                                <p className="text-slate-400 text-sm">{v.vistoriador.nome} • {v.tipo}</p>
                                            </div>
                                        </div>
                                        <span className="text-slate-400 text-sm">
                                            {new Date(v.criadoEm).toLocaleDateString('pt-BR')}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Lista de usuários */}
                        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                            <h3 className="text-white font-semibold mb-4">Usuários do Sistema</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Nome</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Função</th>
                                            <th className="text-center py-3 px-4 text-slate-400 font-medium">Vistorias</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usersList.map((u: any) => (
                                            <tr key={u.id} className="border-b border-slate-700/50">
                                                <td className="py-3 px-4 text-white">{u.nome}</td>
                                                <td className="py-3 px-4 text-slate-400">{u.email}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                                                            u.role === 'VISTORIADOR' ? 'bg-blue-500/20 text-blue-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center text-white">{u._count?.vistorias || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
