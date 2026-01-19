const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(error.error || 'Erro na requisição');
    }

    return res.json();
}

export const api = {
    // Auth
    login: (email: string, password: string) =>
        request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

    me: () => request('/api/auth/me'),

    // Imóveis
    getImoveis: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return request(`/api/imoveis${query}`);
    },

    getImovel: (id: string) => request(`/api/imoveis/${id}`),

    createImovel: (data: any) =>
        request('/api/imoveis', { method: 'POST', body: JSON.stringify(data) }),

    updateImovel: (id: string, data: any) =>
        request(`/api/imoveis/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    getAmbientesPadrao: () => request<string[]>('/api/imoveis/ambientes-padrao'),

    // Vistorias
    getVistorias: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return request(`/api/vistorias${query}`);
    },

    getVistoria: (id: string) => request(`/api/vistorias/${id}`),

    createVistoria: (data: any) =>
        request('/api/vistorias', { method: 'POST', body: JSON.stringify(data) }),

    finalizarVistoria: (id: string) =>
        request(`/api/vistorias/${id}/finalizar`, { method: 'POST' }),

    updateItem: (vistoriaId: string, itemId: string, data: any) =>
        request(`/api/vistorias/${vistoriaId}/itens/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),

    getProgresso: (id: string) => request(`/api/vistorias/${id}/progresso`),

    getItensChecklist: () => request<string[]>('/api/vistorias/itens-checklist'),

    // Upload
    uploadFoto: async (itemId: string, file: File, descricao?: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const formData = new FormData();
        formData.append('foto', file);
        if (descricao) formData.append('descricao', descricao);

        const res = await fetch(`${API_URL}/api/upload/foto/${itemId}`, {
            method: 'POST',
            headers: { ...(token && { Authorization: `Bearer ${token}` }) },
            body: formData,
        });

        if (!res.ok) throw new Error('Erro ao fazer upload');
        return res.json();
    },

    deleteFoto: (fotoId: string) =>
        request(`/api/upload/foto/${fotoId}`, { method: 'DELETE' }),

    // Assinatura
    assinarVistoria: (id: string, data: { assinaturaVistoriador?: string; assinaturaCliente?: string; nomeCliente?: string }) =>
        request(`/api/vistorias/${id}/assinar`, { method: 'POST', body: JSON.stringify(data) }),

    // Comparativo
    compararVistorias: (entradaId: string, saidaId: string) =>
        request(`/api/vistorias/comparar?entrada=${entradaId}&saida=${saidaId}`),

    // Admin
    getMetricas: () => request('/api/admin/metricas'),
    getVistoriasPorMes: () => request('/api/admin/vistorias-por-mes'),
    getUsuariosAtivos: () => request('/api/admin/usuarios-ativos'),

    // Configurações
    getConfiguracoes: () => request('/api/configuracoes'),
    getConfiguracoesByCategoria: (categoria: string) => request(`/api/configuracoes/${categoria}`),
    saveConfiguracao: (data: { categoria: string; chave: string; valor: string; descricao?: string; sensivel?: boolean }) =>
        request('/api/configuracoes', { method: 'PUT', body: JSON.stringify(data) }),
    saveConfiguracoesBatch: (configs: Array<{ categoria: string; chave: string; valor: string; descricao?: string; sensivel?: boolean }>) =>
        request('/api/configuracoes/batch', { method: 'PUT', body: JSON.stringify(configs) }),

    // Relatórios
    getRelatorioUrl: (vistoriaId: string) => `${API_URL}/api/relatorios/${vistoriaId}`,
};

