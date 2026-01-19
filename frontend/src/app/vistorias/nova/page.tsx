'use client';

import { useAuth } from '../../providers';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck, Building2, Check } from 'lucide-react';

export default function NovaVistoriaPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedImovelId = searchParams.get('imovelId');

    const [step, setStep] = useState(1);
    const [selectedImovel, setSelectedImovel] = useState<any>(null);
    const [tipo, setTipo] = useState('ENTRADA');
    const [ambientesSelecionados, setAmbientesSelecionados] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    const { data: imoveisData } = useQuery({
        queryKey: ['imoveis-all'],
        queryFn: () => api.getImoveis({ limit: '100' }),
        enabled: !!user && !preselectedImovelId,
    });

    const { data: preselectedImovel } = useQuery({
        queryKey: ['imovel', preselectedImovelId],
        queryFn: () => api.getImovel(preselectedImovelId!),
        enabled: !!user && !!preselectedImovelId,
    });

    useEffect(() => {
        if (preselectedImovel) {
            setSelectedImovel(preselectedImovel);
            setAmbientesSelecionados((preselectedImovel as any).ambientes?.map((a: any) => a.id) || []);
            setStep(2);
        }
    }, [preselectedImovel]);

    const handleSelectImovel = (imovel: any) => {
        setSelectedImovel(imovel);
        setAmbientesSelecionados(imovel.ambientes?.map((a: any) => a.id) || []);
        setStep(2);
    };

    const toggleAmbiente = (id: string) => {
        setAmbientesSelecionados(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleCriarVistoria = async () => {
        if (!selectedImovel) return;
        setLoading(true);

        try {
            const vistoria = await api.createVistoria({
                imovelId: selectedImovel.id,
                tipo,
                ambientesExistentes: ambientesSelecionados,
            });
            router.push(`/vistorias/${(vistoria as any).id}`);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    if (isLoading || !user) return null;

    const imoveis = (imoveisData as any)?.data || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary-800 to-primary-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/vistorias" className="p-2 hover:bg-white/10 rounded-lg">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <ClipboardCheck className="h-7 w-7" />
                                Nova Vistoria
                            </h1>
                            <p className="text-primary-200 text-sm">Passo {step} de 3</p>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4 flex gap-2">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-white' : 'bg-white/30'}`}
                            />
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6">
                {/* Step 1: Selecionar imóvel */}
                {step === 1 && (
                    <div className="card animate-fadeIn">
                        <h2 className="text-lg font-semibold mb-4">Selecione o imóvel</h2>
                        {imoveis.length === 0 ? (
                            <div className="text-center py-8">
                                <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 mb-4">Nenhum imóvel cadastrado</p>
                                <Link href="/imoveis" className="btn btn-primary">
                                    Cadastrar Imóvel
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                {imoveis.map((im: any) => (
                                    <button
                                        key={im.id}
                                        onClick={() => handleSelectImovel(im)}
                                        className="w-full text-left p-4 bg-gray-50 hover:bg-primary-50 rounded-lg transition-colors"
                                    >
                                        <p className="font-medium">{im.endereco}, {im.numero || 'S/N'}</p>
                                        <p className="text-sm text-gray-500">{im.bairro} - {im.cidade}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Tipo e ambientes */}
                {step === 2 && selectedImovel && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="card">
                            <h3 className="font-medium text-gray-500 text-sm mb-1">Imóvel selecionado</h3>
                            <p className="font-semibold">{selectedImovel.endereco}, {selectedImovel.numero}</p>
                            <button onClick={() => setStep(1)} className="text-primary-600 text-sm mt-1">
                                Alterar
                            </button>
                        </div>

                        <div className="card">
                            <h2 className="text-lg font-semibold mb-4">Tipo de Vistoria</h2>
                            <div className="grid grid-cols-3 gap-3">
                                {['ENTRADA', 'SAIDA', 'PERIODICA'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTipo(t)}
                                        className={`p-4 rounded-lg border-2 transition-all ${tipo === t
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <p className="font-medium">{t === 'SAIDA' ? 'Saída' : t.charAt(0) + t.slice(1).toLowerCase()}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="card">
                            <h2 className="text-lg font-semibold mb-4">Ambientes a vistoriar</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {selectedImovel.ambientes?.map((amb: any) => (
                                    <button
                                        key={amb.id}
                                        onClick={() => toggleAmbiente(amb.id)}
                                        className={`p-3 rounded-lg border-2 text-left flex items-center justify-between ${ambientesSelecionados.includes(amb.id)
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-gray-200'
                                            }`}
                                    >
                                        <span>{amb.nome}</span>
                                        {ambientesSelecionados.includes(amb.id) && (
                                            <Check className="h-5 w-5 text-primary-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(3)}
                            disabled={ambientesSelecionados.length === 0}
                            className="btn btn-primary w-full py-3"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* Step 3: Confirmar */}
                {step === 3 && selectedImovel && (
                    <div className="card animate-fadeIn">
                        <h2 className="text-lg font-semibold mb-4">Confirmar Vistoria</h2>

                        <div className="space-y-4 mb-6">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Imóvel</p>
                                <p className="font-medium">{selectedImovel.endereco}, {selectedImovel.numero}</p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Tipo</p>
                                <p className="font-medium">{tipo}</p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Ambientes ({ambientesSelecionados.length})</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedImovel.ambientes
                                        ?.filter((a: any) => ambientesSelecionados.includes(a.id))
                                        .map((a: any) => (
                                            <span key={a.id} className="badge badge-info">{a.nome}</span>
                                        ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep(2)} className="btn btn-secondary flex-1">
                                Voltar
                            </button>
                            <button
                                onClick={handleCriarVistoria}
                                disabled={loading}
                                className="btn btn-primary flex-1"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    'Iniciar Vistoria'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
