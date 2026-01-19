import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';
import { sendEmail, emailTemplates } from '../services/email.js';
import { sendWhatsAppMessage, whatsappTemplates } from '../services/whatsapp.js';

const router = Router();

// Itens padrão do checklist
const ITENS_CHECKLIST = [
    'Piso',
    'Paredes',
    'Teto',
    'Portas',
    'Janelas',
    'Pintura',
    'Elétrica',
    'Hidráulica',
    'Outros',
];

// Schemas de validação
const createVistoriaSchema = z.object({
    imovelId: z.string().uuid('ID do imóvel inválido'),
    tipo: z.enum(['ENTRADA', 'SAIDA', 'PERIODICA']),
    observacoes: z.string().optional(),
    ambientesExistentes: z.array(z.string().uuid()).optional(),
});

const updateItemSchema = z.object({
    estado: z.enum(['BOM', 'REGULAR', 'RUIM', 'NAO_APLICAVEL', 'NAO_VERIFICADO']),
    observacao: z.string().optional(),
});

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// GET /api/vistorias - Listar vistorias
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { imovelId, status, tipo, page = '1', limit = '20' } = req.query;

        const where: any = {};

        if (imovelId) {
            where.imovelId = String(imovelId);
        }

        if (status) {
            where.status = String(status);
        }

        if (tipo) {
            where.tipo = String(tipo);
        }

        // Se não for admin, só vê suas próprias vistorias
        if (req.user!.role !== 'ADMIN') {
            where.vistoriadorId = req.user!.id;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [vistorias, total] = await Promise.all([
            prisma.vistoria.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { criadoEm: 'desc' },
                select: {
                    id: true,
                    tipo: true,
                    status: true,
                    dataVistoria: true,
                    criadoEm: true,
                    imovel: {
                        select: {
                            id: true,
                            endereco: true,
                            numero: true,
                            bairro: true,
                            cidade: true,
                        },
                    },
                    vistoriador: {
                        select: { id: true, nome: true },
                    },
                    _count: {
                        select: { itens: true },
                    },
                },
            }),
            prisma.vistoria.count({ where }),
        ]);

        res.json({
            data: vistorias,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/vistorias/itens-checklist - Lista de itens padrão
router.get('/itens-checklist', async (req: AuthRequest, res) => {
    res.json(ITENS_CHECKLIST);
});

// GET /api/vistorias/:id - Detalhes da vistoria
router.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { id: req.params.id },
            include: {
                imovel: {
                    include: {
                        ambientes: {
                            orderBy: { ordem: 'asc' },
                        },
                    },
                },
                vistoriador: {
                    select: { id: true, nome: true, email: true },
                },
                itens: {
                    include: {
                        ambiente: true,
                        fotos: {
                            orderBy: { criadoEm: 'asc' },
                        },
                    },
                    orderBy: { criadoEm: 'asc' },
                },
            },
        });

        if (!vistoria) {
            throw createError('Vistoria não encontrada', 404);
        }

        res.json(vistoria);
    } catch (error) {
        next(error);
    }
});

// POST /api/vistorias - Criar vistoria
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        const data = createVistoriaSchema.parse(req.body);

        // Verificar se o imóvel existe
        const imovel = await prisma.imovel.findUnique({
            where: { id: data.imovelId },
            include: {
                ambientes: {
                    orderBy: { ordem: 'asc' },
                },
            },
        });

        if (!imovel) {
            throw createError('Imóvel não encontrado', 404);
        }

        // Criar vistoria
        const vistoria = await prisma.vistoria.create({
            data: {
                tipo: data.tipo,
                observacoes: data.observacoes,
                imovelId: data.imovelId,
                vistoriadorId: req.user!.id,
            },
        });

        // Determinar ambientes a usar
        const ambientesParaUsar = data.ambientesExistentes
            ? imovel.ambientes.filter(a => data.ambientesExistentes!.includes(a.id))
            : imovel.ambientes.filter(a => a.existe);

        // Criar itens de checklist para cada ambiente
        const itensToCreate = ambientesParaUsar.flatMap(ambiente =>
            ITENS_CHECKLIST.map(item => ({
                vistoriaId: vistoria.id,
                ambienteId: ambiente.id,
                item,
                estado: 'NAO_VERIFICADO' as const,
            }))
        );

        await prisma.itemVistoria.createMany({
            data: itensToCreate,
        });

        // Log
        await prisma.log.create({
            data: {
                acao: 'CRIAR',
                entidade: 'Vistoria',
                entidadeId: vistoria.id,
                usuarioId: req.user!.id,
                dados: { tipo: data.tipo, imovelId: data.imovelId },
                ip: req.ip,
            },
        });

        // Retornar vistoria completa
        const vistoriaCompleta = await prisma.vistoria.findUnique({
            where: { id: vistoria.id },
            include: {
                imovel: true,
                itens: {
                    include: {
                        ambiente: true,
                        fotos: true,
                    },
                },
            },
        });

        res.status(201).json(vistoriaCompleta);
    } catch (error) {
        next(error);
    }
});

// PUT /api/vistorias/:id - Atualizar vistoria
router.put('/:id', async (req: AuthRequest, res, next) => {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { id: req.params.id },
        });

        if (!vistoria) {
            throw createError('Vistoria não encontrada', 404);
        }

        if (vistoria.status === 'FINALIZADA') {
            throw createError('Vistoria já finalizada não pode ser editada', 400);
        }

        const { observacoes } = req.body;

        const updated = await prisma.vistoria.update({
            where: { id: req.params.id },
            data: { observacoes },
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// POST /api/vistorias/:id/finalizar - Finalizar vistoria
router.post('/:id/finalizar', async (req: AuthRequest, res, next) => {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { id: req.params.id },
            include: {
                itens: true,
            },
        });

        if (!vistoria) {
            throw createError('Vistoria não encontrada', 404);
        }

        if (vistoria.status === 'FINALIZADA') {
            throw createError('Vistoria já está finalizada', 400);
        }

        // Verificar se todos os itens foram preenchidos
        const naoVerificados = vistoria.itens.filter(i => i.estado === 'NAO_VERIFICADO');
        if (naoVerificados.length > 0) {
            throw createError(
                `Ainda existem ${naoVerificados.length} itens não verificados`,
                400
            );
        }

        const updated = await prisma.vistoria.update({
            where: { id: req.params.id },
            data: {
                status: 'FINALIZADA',
                finalizadoEm: new Date(),
            },
        });

        // Log
        await prisma.log.create({
            data: {
                acao: 'FINALIZAR',
                entidade: 'Vistoria',
                entidadeId: vistoria.id,
                usuarioId: req.user!.id,
                ip: req.ip,
            },
        });

        // Buscar dados completos para notificação
        const vistoriaCompleta = await prisma.vistoria.findUnique({
            where: { id: req.params.id },
            include: {
                imovel: true,
                vistoriador: { select: { nome: true, email: true } },
            },
        });

        // Enviar notificações (em background, não bloqueia resposta)
        if (vistoriaCompleta) {
            // Email para o vistoriador
            const emailTemplate = emailTemplates.vistoriaFinalizada(vistoriaCompleta);
            sendEmail({
                to: vistoriaCompleta.vistoriador.email,
                ...emailTemplate,
            }).catch(err => console.error('Erro ao enviar email:', err));

            // WhatsApp para o proprietário (se tiver telefone)
            if (vistoriaCompleta.imovel.telefone) {
                const whatsappMsg = whatsappTemplates.vistoriaFinalizada(vistoriaCompleta);
                sendWhatsAppMessage({
                    phoneNumber: vistoriaCompleta.imovel.telefone,
                    message: whatsappMsg,
                }).catch(err => console.error('Erro ao enviar WhatsApp:', err));
            }
        }

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// PUT /api/vistorias/:vistoriaId/itens/:itemId - Atualizar item
router.put('/:vistoriaId/itens/:itemId', async (req: AuthRequest, res, next) => {
    try {
        const data = updateItemSchema.parse(req.body);

        // Verificar se a vistoria não está finalizada
        const item = await prisma.itemVistoria.findUnique({
            where: { id: req.params.itemId },
            include: { vistoria: true },
        });

        if (!item) {
            throw createError('Item não encontrado', 404);
        }

        if (item.vistoria.status === 'FINALIZADA') {
            throw createError('Vistoria já finalizada não pode ser editada', 400);
        }

        const updated = await prisma.itemVistoria.update({
            where: { id: req.params.itemId },
            data,
            include: {
                ambiente: true,
                fotos: true,
            },
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// GET /api/vistorias/:id/progresso - Progresso da vistoria
router.get('/:id/progresso', async (req: AuthRequest, res, next) => {
    try {
        const vistoria = await prisma.vistoria.findUnique({
            where: { id: req.params.id },
            include: {
                itens: {
                    include: {
                        ambiente: true,
                    },
                },
            },
        });

        if (!vistoria) {
            throw createError('Vistoria não encontrada', 404);
        }

        const total = vistoria.itens.length;
        const verificados = vistoria.itens.filter(i => i.estado !== 'NAO_VERIFICADO').length;

        // Progresso por ambiente
        const porAmbiente = vistoria.itens.reduce((acc, item) => {
            const ambienteNome = item.ambiente.nome;
            if (!acc[ambienteNome]) {
                acc[ambienteNome] = { total: 0, verificados: 0 };
            }
            acc[ambienteNome].total++;
            if (item.estado !== 'NAO_VERIFICADO') {
                acc[ambienteNome].verificados++;
            }
            return acc;
        }, {} as Record<string, { total: number; verificados: number }>);

        res.json({
            total,
            verificados,
            percentual: total > 0 ? Math.round((verificados / total) * 100) : 0,
            porAmbiente,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/vistorias/:id/assinar - Salvar assinaturas
router.post('/:id/assinar', async (req: AuthRequest, res, next) => {
    try {
        const { assinaturaVistoriador, assinaturaCliente, nomeCliente } = req.body;

        const vistoria = await prisma.vistoria.findUnique({
            where: { id: req.params.id },
        });

        if (!vistoria) {
            throw createError('Vistoria não encontrada', 404);
        }

        const updated = await prisma.vistoria.update({
            where: { id: req.params.id },
            data: {
                assinaturaVistoriador,
                assinaturaCliente,
                nomeCliente,
            },
        });

        // Log
        await prisma.log.create({
            data: {
                acao: 'ASSINAR',
                entidade: 'Vistoria',
                entidadeId: vistoria.id,
                usuarioId: req.user!.id,
                ip: req.ip,
            },
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// GET /api/vistorias/comparar - Comparar vistorias
router.get('/comparar', async (req: AuthRequest, res, next) => {
    try {
        const { entrada, saida } = req.query;

        if (!entrada || !saida) {
            throw createError('IDs de entrada e saída são obrigatórios', 400);
        }

        const [vistoriaEntrada, vistoriaSaida] = await Promise.all([
            prisma.vistoria.findUnique({
                where: { id: String(entrada) },
                include: {
                    imovel: true,
                    vistoriador: { select: { id: true, nome: true } },
                    itens: {
                        include: {
                            ambiente: true,
                            fotos: true,
                        },
                        orderBy: { criadoEm: 'asc' },
                    },
                },
            }),
            prisma.vistoria.findUnique({
                where: { id: String(saida) },
                include: {
                    imovel: true,
                    vistoriador: { select: { id: true, nome: true } },
                    itens: {
                        include: {
                            ambiente: true,
                            fotos: true,
                        },
                        orderBy: { criadoEm: 'asc' },
                    },
                },
            }),
        ]);

        if (!vistoriaEntrada || !vistoriaSaida) {
            throw createError('Uma ou mais vistorias não encontradas', 404);
        }

        // Criar mapa de comparação por ambiente/item
        const comparativo = vistoriaEntrada.itens.map(itemEntrada => {
            const itemSaida = vistoriaSaida.itens.find(
                i => i.ambiente.nome === itemEntrada.ambiente.nome && i.item === itemEntrada.item
            );

            return {
                ambiente: itemEntrada.ambiente.nome,
                item: itemEntrada.item,
                entrada: {
                    estado: itemEntrada.estado,
                    observacao: itemEntrada.observacao,
                    fotos: itemEntrada.fotos,
                },
                saida: itemSaida ? {
                    estado: itemSaida.estado,
                    observacao: itemSaida.observacao,
                    fotos: itemSaida.fotos,
                } : null,
                mudou: itemSaida ? itemEntrada.estado !== itemSaida.estado : false,
            };
        });

        res.json({
            entrada: {
                id: vistoriaEntrada.id,
                tipo: vistoriaEntrada.tipo,
                data: vistoriaEntrada.dataVistoria,
                vistoriador: vistoriaEntrada.vistoriador,
            },
            saida: {
                id: vistoriaSaida.id,
                tipo: vistoriaSaida.tipo,
                data: vistoriaSaida.dataVistoria,
                vistoriador: vistoriaSaida.vistoriador,
            },
            imovel: vistoriaEntrada.imovel,
            comparativo,
        });
    } catch (error) {
        next(error);
    }
});

export default router;

