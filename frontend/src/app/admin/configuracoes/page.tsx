'use client';

import { useAuth } from '../../providers';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Settings, Mail, MessageCircle, Globe, Save, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

interface Config {
    id?: string;
    categoria: string;
    chave: string;
    valor: string;
    descricao?: string;
    sensivel?: boolean;
}

const CATEGORIAS = [
    { id: 'sistema', label: 'Sistema', icon: Globe, description: 'Configurações gerais do sistema' },
    { id: 'smtp', label: 'Email (SMTP)', icon: Mail, description: 'Configurações de envio de email' },
    { id: 'chatwoot', label: 'WhatsApp (Chatwoot)', icon: MessageCircle, description: 'Integração com Chatwoot/Baileys' },
];

const CONFIG_FIELDS: Record<string, Array<{ chave: string; label: string; descricao: string; sensivel?: boolean; placeholder?: string }>> = {
    sistema: [
        { chave: 'app_url', label: 'URL do App', descricao: 'URL pública do frontend', placeholder: 'https://app.seudominio.com' },
        { chave: 'api_url', label: 'URL da API', descricao: 'URL pública do backend', placeholder: 'https://api.seudominio.com' },
    ],
    smtp: [
        { chave: 'host', label: 'Host SMTP', descricao: 'Servidor SMTP', placeholder: 'smtp.gmail.com' },
        { chave: 'port', label: 'Porta', descricao: 'Porta do servidor SMTP', placeholder: '587' },
        { chave: 'secure', label: 'SSL/TLS', descricao: 'true ou false', placeholder: 'false' },
        { chave: 'user', label: 'Usuário', descricao: 'Email de autenticação', placeholder: 'seu-email@gmail.com' },
        { chave: 'pass', label: 'Senha', descricao: 'Senha ou App Password', sensivel: true, placeholder: '••••••••' },
        { chave: 'from', label: 'Remetente', descricao: 'Nome e email do remetente', placeholder: 'App Vistoria <noreply@app.com>' },
    ],
    chatwoot: [
        { chave: 'api_url', label: 'URL da API', descricao: 'URL do Chatwoot', placeholder: 'https://app.chatwoot.com' },
        { chave: 'api_token', label: 'API Token', descricao: 'Token de acesso', sensivel: true, placeholder: '••••••••' },
        { chave: 'account_id', label: 'Account ID', descricao: 'ID da conta no Chatwoot', placeholder: '1' },
        { chave: 'inbox_id', label: 'Inbox ID', descricao: 'ID da inbox (WhatsApp)', placeholder: '1' },
    ],
};

export default function ConfiguracoesPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [activeCategory, setActiveCategory] = useState('sistema');
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
        if (!isLoading && user && (user as any).role !== 'ADMIN') {
            router.push('/');
        }
    }, [user, isLoading, router]);

    // Buscar configurações
    const { data: configs, isLoading: loadingConfigs } = useQuery({
        queryKey: ['configuracoes'],
        queryFn: () => api.getConfiguracoes(),
        enabled: !!user && (user as any).role === 'ADMIN',
    });

    // Atualizar formData quando configs mudam
    useEffect(() => {
        if (configs) {
            const data: Record<string, string> = {};
            (configs as Config[]).forEach(c => {
                data[`${c.categoria}_${c.chave}`] = c.valor;
            });
            setFormData(data);
        }
    }, [configs]);

    // Mutation para salvar
    const saveMutation = useMutation({
        mutationFn: (configs: Config[]) => api.saveConfiguracoesBatch(configs),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        },
        onError: () => {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        },
    });

    const handleChange = (categoria: string, chave: string, valor: string) => {
        setFormData(prev => ({
            ...prev,
            [`${categoria}_${chave}`]: valor,
        }));
    };

    const handleSave = () => {
        setSaveStatus('saving');

        const configsToSave: Config[] = [];
        const fields = CONFIG_FIELDS[activeCategory] || [];

        fields.forEach(field => {
            const key = `${activeCategory}_${field.chave}`;
            const valor = formData[key] || '';

            // Só salva se o valor mudou e não é mascarado
            if (valor && valor !== '••••••••') {
                configsToSave.push({
                    categoria: activeCategory,
                    chave: field.chave,
                    valor,
                    descricao: field.descricao,
                    sensivel: field.sensivel,
                });
            }
        });

        if (configsToSave.length > 0) {
            saveMutation.mutate(configsToSave);
        } else {
            setSaveStatus('idle');
        }
    };

    const togglePassword = (key: string) => {
        setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (isLoading || !user || (user as any).role !== 'ADMIN') return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 pb-20">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary-900 to-primary-700 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Settings className="h-7 w-7" />
                                Configurações
                            </h1>
                            <p className="text-primary-200 text-sm">Gerencie as configurações do sistema</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid md:grid-cols-4 gap-6">
                    {/* Sidebar - Categorias */}
                    <div className="md:col-span-1">
                        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                            <h3 className="text-white font-semibold mb-4">Categorias</h3>
                            <div className="space-y-2">
                                {CATEGORIAS.map(cat => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${activeCategory === cat.id
                                                    ? 'bg-primary-600 text-white'
                                                    : 'text-slate-300 hover:bg-slate-700'
                                                }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <div>
                                                <p className="font-medium">{cat.label}</p>
                                                <p className={`text-xs ${activeCategory === cat.id ? 'text-primary-200' : 'text-slate-500'}`}>
                                                    {cat.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="md:col-span-3">
                        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-white font-semibold text-lg">
                                    {CATEGORIAS.find(c => c.id === activeCategory)?.label}
                                </h3>
                                <button
                                    onClick={handleSave}
                                    disabled={saveStatus === 'saving'}
                                    className={`btn ${saveStatus === 'success' ? 'bg-green-600 hover:bg-green-700' :
                                            saveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' :
                                                'bg-primary-600 hover:bg-primary-700'
                                        } text-white`}
                                >
                                    {saveStatus === 'saving' ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    ) : saveStatus === 'success' ? (
                                        <CheckCircle2 className="h-5 w-5" />
                                    ) : saveStatus === 'error' ? (
                                        <AlertCircle className="h-5 w-5" />
                                    ) : (
                                        <Save className="h-5 w-5" />
                                    )}
                                    {saveStatus === 'saving' ? 'Salvando...' :
                                        saveStatus === 'success' ? 'Salvo!' :
                                            saveStatus === 'error' ? 'Erro!' : 'Salvar'}
                                </button>
                            </div>

                            {loadingConfigs ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {CONFIG_FIELDS[activeCategory]?.map(field => {
                                        const key = `${activeCategory}_${field.chave}`;
                                        const value = formData[key] || '';
                                        const isPassword = field.sensivel;
                                        const showPassword = showPasswords[key];

                                        return (
                                            <div key={field.chave}>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                                    {field.label}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={isPassword && !showPassword ? 'password' : 'text'}
                                                        value={value}
                                                        onChange={(e) => handleChange(activeCategory, field.chave, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                    />
                                                    {isPassword && (
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePassword(key)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                                        >
                                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{field.descricao}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Info box */}
                        <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 mt-4">
                            <p className="text-blue-300 text-sm">
                                💡 <strong>Dica:</strong> As configurações sensíveis (senhas e tokens) são armazenadas de forma segura e mascaradas na interface.
                                Após salvar uma senha, ela aparecerá como "••••••••".
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
