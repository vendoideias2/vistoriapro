import nodemailer from 'nodemailer';

// Configuração do transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
    }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Vistoria App <noreply@vistoria.app>',
            ...options,
        });
        return true;
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        return false;
    }
}

// Templates de email
export const emailTemplates = {
    vistoriaFinalizada: (vistoria: any) => ({
        subject: `✅ Vistoria Finalizada - ${vistoria.imovel.endereco}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
                    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #0ea5e9; }
                    .btn { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px; }
                    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">📋 Vistoria Finalizada</h1>
                    </div>
                    <div class="content">
                        <p>Olá,</p>
                        <p>A vistoria do imóvel foi concluída com sucesso!</p>
                        
                        <div class="info-box">
                            <strong>📍 Endereço:</strong> ${vistoria.imovel.endereco}, ${vistoria.imovel.numero || 'S/N'}<br>
                            <strong>🏘️ Bairro:</strong> ${vistoria.imovel.bairro}<br>
                            <strong>📅 Data:</strong> ${new Date(vistoria.finalizadoEm).toLocaleDateString('pt-BR')}<br>
                            <strong>👤 Vistoriador:</strong> ${vistoria.vistoriador.nome}<br>
                            <strong>📝 Tipo:</strong> ${vistoria.tipo}
                        </div>
                        
                        <p>Você pode acessar o relatório completo através do sistema.</p>
                        
                        <a href="${process.env.FRONTEND_URL}/vistorias/${vistoria.id}/relatorio" class="btn">
                            Ver Relatório
                        </a>
                    </div>
                    <div class="footer">
                        <p>Sistema de Vistoria Imobiliária</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    }),
};
