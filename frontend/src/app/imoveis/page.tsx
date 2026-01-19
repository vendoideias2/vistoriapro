'use client';

import { useAuth } from '../providers';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Building2, Plus, Search, MapPin, ArrowLeft, X, Home } from 'lucide-react';

export default function ImoveisPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    const { data, isLoading: loadingImoveis } = useQuery({
        queryKey: ['imoveis', search],
        queryFn: () => api.getImoveis(search ? { search } : undefined),
        enabled: !!user,
    });

    if (isLoading || !user) return null;

    const imoveis = (data as any)?.data || [];

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
                                <Building2 className="h-7 w-7" />
                                Imóveis
                            </h1>
                        </div>
                        <button onClick={() => setShowModal(true)} className="btn bg-white text-primary-700 hover:bg-primary-50">
                            <Plus className="h-5 w-5" />
                            <span className="hidden sm:inline">Novo</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="mt-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-300" />
                        <input
                            type="text"
                            placeholder="Buscar por endereço, bairro..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-primary-200 focus:bg-white/20 focus:border-white/40 outline-none transition-all"
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {loadingImoveis ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                ) : imoveis.length === 0 ? (
                    <div className="card text-center py-12">
                        <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum imóvel encontrado</h3>
                        <p className="text-gray-500 mb-4">Cadastre seu primeiro imóvel para começar</p>
                        <button onClick={() => setShowModal(true)} className="btn btn-primary">
                            <Plus className="h-5 w-5" /> Cadastrar Imóvel
                        </button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {imoveis.map((imovel: any, idx: number) => (
                            <Link
                                key={imovel.id}
                                href={`/imoveis/${imovel.id}`}
                                className="card hover:shadow-lg transition-all animate-fadeIn"
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="p-3 bg-primary-100 rounded-lg">
                                        <Home className="h-6 w-6 text-primary-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {imovel.endereco}, {imovel.numero || 'S/N'}
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <MapPin className="h-4 w-4" />
                                            {imovel.bairro} - {imovel.cidade}
                                        </p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className="badge badge-info">{imovel.tipo}</span>
                                            <span className="text-xs text-gray-400">
                                                {imovel._count?.vistorias || 0} vistorias
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal Novo Imóvel */}
            {showModal && <NovoImovelModal onClose={() => setShowModal(false)} />}
        </div>
    );
}

function NovoImovelModal({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [form, setForm] = useState({
        tipo: 'APARTAMENTO',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        proprietario: '',
        telefone: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const imovel = await api.createImovel(form);
            queryClient.invalidateQueries({ queryKey: ['imoveis'] });
            onClose();
            router.push(`/imoveis/${(imovel as any).id}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">Novo Imóvel</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                    <div>
                        <label className="label">Tipo</label>
                        <select
                            value={form.tipo}
                            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                            className="input"
                        >
                            <option value="APARTAMENTO">Apartamento</option>
                            <option value="CASA">Casa</option>
                            <option value="COMERCIAL">Comercial</option>
                            <option value="TERRENO">Terreno</option>
                            <option value="RURAL">Rural</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="label">Endereço *</label>
                            <input
                                type="text"
                                value={form.endereco}
                                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                                className="input"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Número</label>
                            <input
                                type="text"
                                value={form.numero}
                                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                                className="input"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Complemento</label>
                        <input
                            type="text"
                            value={form.complemento}
                            onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                            className="input"
                            placeholder="Apto, Bloco, etc"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Bairro *</label>
                            <input
                                type="text"
                                value={form.bairro}
                                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                                className="input"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">CEP</label>
                            <input
                                type="text"
                                value={form.cep}
                                onChange={(e) => setForm({ ...form, cep: e.target.value })}
                                className="input"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="label">Cidade *</label>
                            <input
                                type="text"
                                value={form.cidade}
                                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                                className="input"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">UF *</label>
                            <input
                                type="text"
                                value={form.estado}
                                onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                                className="input"
                                maxLength={2}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Proprietário</label>
                            <input
                                type="text"
                                value={form.proprietario}
                                onChange={(e) => setForm({ ...form, proprietario: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Telefone</label>
                            <input
                                type="tel"
                                value={form.telefone}
                                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                                className="input"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
