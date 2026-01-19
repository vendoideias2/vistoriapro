// Integração com Chatwoot/Baileys para WhatsApp
// Esta integração envia mensagens via API do Chatwoot

interface ChatwootConfig {
    apiUrl: string;
    apiToken: string;
    accountId: string;
    inboxId: string;
}

const config: ChatwootConfig = {
    apiUrl: process.env.CHATWOOT_API_URL || 'https://app.chatwoot.com',
    apiToken: process.env.CHATWOOT_API_TOKEN || '',
    accountId: process.env.CHATWOOT_ACCOUNT_ID || '',
    inboxId: process.env.CHATWOOT_INBOX_ID || '',
};

interface WhatsAppMessage {
    phoneNumber: string;
    message: string;
}

// Busca ou cria contato no Chatwoot
async function findOrCreateContact(phoneNumber: string, name?: string): Promise<string | null> {
    try {
        // Formata número
        const formattedPhone = phoneNumber.replace(/\D/g, '');

        // Busca contato existente
        const searchRes = await fetch(
            `${config.apiUrl}/api/v1/accounts/${config.accountId}/contacts/search?q=${formattedPhone}`,
            {
                headers: {
                    'api_access_token': config.apiToken,
                    'Content-Type': 'application/json',
                },
            }
        );

        const searchData = await searchRes.json();

        if (searchData.payload?.length > 0) {
            return searchData.payload[0].id;
        }

        // Cria novo contato
        const createRes = await fetch(
            `${config.apiUrl}/api/v1/accounts/${config.accountId}/contacts`,
            {
                method: 'POST',
                headers: {
                    'api_access_token': config.apiToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inbox_id: config.inboxId,
                    name: name || `+${formattedPhone}`,
                    phone_number: `+${formattedPhone}`,
                }),
            }
        );

        const createData = await createRes.json();
        return createData.payload?.contact?.id || null;
    } catch (error) {
        console.error('Erro ao buscar/criar contato:', error);
        return null;
    }
}

// Busca ou cria conversa
async function findOrCreateConversation(contactId: string): Promise<string | null> {
    try {
        // Busca conversas do contato
        const res = await fetch(
            `${config.apiUrl}/api/v1/accounts/${config.accountId}/contacts/${contactId}/conversations`,
            {
                headers: {
                    'api_access_token': config.apiToken,
                },
            }
        );

        const data = await res.json();

        // Retorna conversa existente aberta
        const openConversation = data.payload?.find((c: any) => c.status === 'open');
        if (openConversation) {
            return openConversation.id;
        }

        // Cria nova conversa
        const createRes = await fetch(
            `${config.apiUrl}/api/v1/accounts/${config.accountId}/conversations`,
            {
                method: 'POST',
                headers: {
                    'api_access_token': config.apiToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inbox_id: config.inboxId,
                    contact_id: contactId,
                }),
            }
        );

        const createData = await createRes.json();
        return createData.id || null;
    } catch (error) {
        console.error('Erro ao buscar/criar conversa:', error);
        return null;
    }
}

// Envia mensagem
export async function sendWhatsAppMessage(options: WhatsAppMessage): Promise<boolean> {
    try {
        if (!config.apiToken || !config.accountId || !config.inboxId) {
            console.warn('Configuração do Chatwoot incompleta');
            return false;
        }

        // Busca/cria contato
        const contactId = await findOrCreateContact(options.phoneNumber);
        if (!contactId) {
            console.error('Não foi possível criar contato');
            return false;
        }

        // Busca/cria conversa
        const conversationId = await findOrCreateConversation(contactId);
        if (!conversationId) {
            console.error('Não foi possível criar conversa');
            return false;
        }

        // Envia mensagem
        const res = await fetch(
            `${config.apiUrl}/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
            {
                method: 'POST',
                headers: {
                    'api_access_token': config.apiToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: options.message,
                    message_type: 'outgoing',
                    private: false,
                }),
            }
        );

        return res.ok;
    } catch (error) {
        console.error('Erro ao enviar WhatsApp:', error);
        return false;
    }
}

// Templates de mensagem
export const whatsappTemplates = {
    vistoriaFinalizada: (vistoria: any) => `
📋 *Vistoria Finalizada*

Olá! A vistoria do seu imóvel foi concluída.

📍 *Endereço:* ${vistoria.imovel.endereco}, ${vistoria.imovel.numero || 'S/N'}
🏘️ *Bairro:* ${vistoria.imovel.bairro}
📅 *Data:* ${new Date(vistoria.finalizadoEm).toLocaleDateString('pt-BR')}
👤 *Vistoriador:* ${vistoria.vistoriador.nome}

Acesse o relatório completo em:
${process.env.FRONTEND_URL}/vistorias/${vistoria.id}/relatorio

_Sistema de Vistoria Imobiliária_
    `.trim(),
};
