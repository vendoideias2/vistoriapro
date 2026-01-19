import { Router } from 'express';
import puppeteer from 'puppeteer';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';

const router = Router();
router.use(authMiddleware);

function gerarHtmlRelatorio(vistoria: any): string {
    const estadoLabel: Record<string, string> = {
        BOM: '✅ Bom', REGULAR: '⚠️ Regular', RUIM: '❌ Ruim',
        NAO_APLICAVEL: '➖ N/A', NAO_VERIFICADO: '❓ Não verificado'
    };

    const itensPorAmbiente = vistoria.itens.reduce((acc: any, item: any) => {
        const amb = item.ambiente.nome;
        if (!acc[amb]) acc[amb] = [];
        acc[amb].push(item);
        return acc;
    }, {});

    let ambientesHtml = '';
    for (const [ambiente, itens] of Object.entries(itensPorAmbiente) as any) {
        ambientesHtml += `
      <div class="ambiente">
        <h3>${ambiente}</h3>
        <table>
          <tr><th>Item</th><th>Estado</th><th>Observação</th></tr>
          ${itens.map((i: any) => `
            <tr>
              <td>${i.item}</td>
              <td>${estadoLabel[i.estado] || i.estado}</td>
              <td>${i.observacao || '-'}</td>
            </tr>
          `).join('')}
        </table>
        ${itens.some((i: any) => i.fotos?.length) ? `
          <div class="fotos">
            ${itens.flatMap((i: any) => i.fotos || []).map((f: any) =>
            `<img src="${process.env.APP_URL || 'http://localhost:3001'}${f.url}" />`
        ).join('')}
          </div>
        ` : ''}
      </div>
    `;
    }

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Vistoria - ${vistoria.imovel.endereco}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
  h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
  h2 { color: #2d3748; margin-top: 30px; }
  h3 { background: #edf2f7; padding: 10px; margin: 20px 0 10px; border-radius: 5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
  th { background: #4a5568; color: white; }
  tr:nth-child(even) { background: #f7fafc; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
  .info p { margin: 5px 0; }
  .fotos { display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; }
  .fotos img { max-width: 200px; max-height: 150px; border-radius: 5px; border: 1px solid #ccc; }
  .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 12px; color: #666; }
</style></head>
<body>
  <h1>📋 Relatório de Vistoria</h1>
  <div class="info">
    <p><strong>Tipo:</strong> ${vistoria.tipo}</p>
    <p><strong>Status:</strong> ${vistoria.status}</p>
    <p><strong>Data:</strong> ${new Date(vistoria.dataVistoria).toLocaleDateString('pt-BR')}</p>
    <p><strong>Vistoriador:</strong> ${vistoria.vistoriador.nome}</p>
  </div>
  <h2>🏠 Imóvel</h2>
  <div class="info">
    <p><strong>Endereço:</strong> ${vistoria.imovel.endereco}, ${vistoria.imovel.numero || 'S/N'}</p>
    <p><strong>Bairro:</strong> ${vistoria.imovel.bairro}</p>
    <p><strong>Cidade:</strong> ${vistoria.imovel.cidade} - ${vistoria.imovel.estado}</p>
    <p><strong>Tipo:</strong> ${vistoria.imovel.tipo}</p>
  </div>
  <h2>📝 Checklist por Ambiente</h2>
  ${ambientesHtml}
  ${vistoria.observacoes ? `<h2>📌 Observações Gerais</h2><p>${vistoria.observacoes}</p>` : ''}
  <div class="footer">
    <p>Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
    <p>Sistema de Vistoria Imobiliária</p>
  </div>
</body></html>`;
}

router.get('/:vistoriaId', async (req: AuthRequest, res, next) => {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { id: req.params.vistoriaId },
            include: {
                imovel: true,
                vistoriador: { select: { nome: true } },
                itens: { include: { ambiente: true, fotos: true }, orderBy: { criadoEm: 'asc' } },
            },
        });

        if (!vistoria) throw createError('Vistoria não encontrada', 404);

        const html = gerarHtmlRelatorio(vistoria);
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' } });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=vistoria-${vistoria.id}.pdf`);
        res.send(pdf);
    } catch (error) { next(error); }
});

router.get('/:vistoriaId/html', async (req: AuthRequest, res, next) => {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { id: req.params.vistoriaId },
            include: {
                imovel: true,
                vistoriador: { select: { nome: true } },
                itens: { include: { ambiente: true, fotos: true } },
            },
        });

        if (!vistoria) throw createError('Vistoria não encontrada', 404);
        res.send(gerarHtmlRelatorio(vistoria));
    } catch (error) { next(error); }
});

export default router;
