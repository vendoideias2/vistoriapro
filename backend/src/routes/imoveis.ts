import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { Prisma } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';

const router = Router();

// Schemas de validação
const createImovelSchema = z.object({
    tipo: z.enum(['CASA', 'APARTAMENTO', 'COMERCIAL', 'TERRENO', 'RURAL']),
    endereco: z.string().min(5, 'Endereço deve ter no mínimo 5 caracteres'),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().min(2, 'Bairro é obrigatório'),
    cidade: z.string().min(2, 'Cidade é obrigatória'),
    estado: z.string().length(2, 'Estado deve ter 2 caracteres'),
    cep: z.string().optional(),
    proprietario: z.string().optional(),
    telefone: z.string().optional(),
    observacoes: z.string().optional(),
    ambientes: z.array(z.object({
        nome: z.string(),
        ordem: z.number().optional(),
    })).optional(),
});

const updateImovelSchema = createImovelSchema.partial();

// Lista padrão de ambientes
const AMBIENTES_PADRAO = [
    'Sala de Estar',
    'Sala de Jantar',
    'Cozinha',
    'Área de Serviço',
    'Quarto 1',
    'Quarto 2',
    'Quarto 3',
    'Banheiro Social',
    'Banheiro Suíte',
    'Varanda',
    'Garagem',
    'Área Externa',
];

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// GET /api/imoveis - Listar imóveis
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { search, tipo, cidade, page = '1', limit = '20' } = req.query;

        const where: any = { ativo: true };

        if (search) {
            where.OR = [
                { endereco: { contains: String(search), mode: 'insensitive' } },
                { bairro: { contains: String(search), mode: 'insensitive' } },
                { proprietario: { contains: String(search), mode: 'insensitive' } },
            ];
        }

        if (tipo) {
            where.tipo = String(tipo);
        }

        if (cidade) {
            where.cidade = { contains: String(cidade), mode: 'insensitive' };
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [imoveis, total] = await Promise.all([
            prisma.imovel.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { criadoEm: 'desc' },
                select: {
                    id: true,
                    tipo: true,
                    endereco: true,
                    numero: true,
                    complemento: true,
                    bairro: true,
                    cidade: true,
                    estado: true,
                    proprietario: true,
                    criadoEm: true,
                    _count: {
                        select: { vistorias: true, ambientes: true },
                    },
                },
            }),
            prisma.imovel.count({ where }),
        ]);

        res.json({
            data: imoveis,
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

// GET /api/imoveis/ambientes-padrao - Lista de ambientes padrão
router.get('/ambientes-padrao', async (req: AuthRequest, res) => {
    res.json(AMBIENTES_PADRAO);
});

// GET /api/imoveis/:id - Detalhes do imóvel
router.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const imovel = await prisma.imovel.findUnique({
            where: { id: req.params.id },
            include: {
                ambientes: {
                    orderBy: { ordem: 'asc' },
                },
                vistorias: {
                    take: 10,
                    orderBy: { criadoEm: 'desc' },
                    select: {
                        id: true,
                        tipo: true,
                        status: true,
                        dataVistoria: true,
                        vistoriador: {
                            select: { nome: true },
                        },
                    },
                },
            },
        });

        if (!imovel) {
            throw createError('Imóvel não encontrado', 404);
        }

        res.json(imovel);
    } catch (error) {
        next(error);
    }
});

// POST /api/imoveis - Criar imóvel
router.post('/', async (req: AuthRequest, res, next) => {
    try {
        const data = createImovelSchema.parse(req.body);

        const ambientes = data.ambientes || AMBIENTES_PADRAO.map((nome, index) => ({
            nome,
            ordem: index + 1,
        }));

        const imovel = await prisma.imovel.create({
            data: {
                tipo: data.tipo,
                endereco: data.endereco,
                numero: data.numero,
                complemento: data.complemento,
                bairro: data.bairro,
                cidade: data.cidade,
                estado: data.estado.toUpperCase(),
                cep: data.cep,
                proprietario: data.proprietario,
                telefone: data.telefone,
                observacoes: data.observacoes,
                ambientes: {
                    create: ambientes.map((amb, idx) => ({
                        nome: amb.nome,
                        ordem: amb.ordem ?? idx + 1,
                    })),
                },
            },
            include: {
                ambientes: {
                    orderBy: { ordem: 'asc' },
                },
            },
        });

        // Log
        await prisma.log.create({
            data: {
                acao: 'CRIAR',
                entidade: 'Imovel',
                entidadeId: imovel.id,
                usuarioId: req.user!.id,
                dados: { endereco: data.endereco, tipo: data.tipo },
                ip: req.ip,
            },
        });

        res.status(201).json(imovel);
    } catch (error) {
        next(error);
    }
});

// PUT /api/imoveis/:id - Atualizar imóvel
router.put('/:id', async (req: AuthRequest, res, next) => {
    try {
        const data = updateImovelSchema.parse(req.body);

        const imovel = await prisma.imovel.update({
            where: { id: req.params.id },
            data: {
                ...(data as Prisma.ImovelUpdateInput),
                estado: data.estado?.toUpperCase(),
            },
            include: {
                ambientes: {
                    orderBy: { ordem: 'asc' },
                },
            },
        });

        // Log
        await prisma.log.create({
            data: {
                acao: 'ATUALIZAR',
                entidade: 'Imovel',
                entidadeId: imovel.id,
                usuarioId: req.user!.id,
                dados: data,
                ip: req.ip,
            },
        });

        res.json(imovel);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/imoveis/:id - Desativar imóvel
router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        await prisma.imovel.update({
            where: { id: req.params.id },
            data: { ativo: false },
        });

        // Log
        await prisma.log.create({
            data: {
                acao: 'DESATIVAR',
                entidade: 'Imovel',
                entidadeId: req.params.id,
                usuarioId: req.user!.id,
                ip: req.ip,
            },
        });

        res.json({ message: 'Imóvel desativado com sucesso' });
    } catch (error) {
        next(error);
    }
});

// POST /api/imoveis/:id/ambientes - Adicionar ambiente
router.post('/:id/ambientes', async (req: AuthRequest, res, next) => {
    try {
        const { nome, ordem } = req.body;

        if (!nome) {
            throw createError('Nome do ambiente é obrigatório', 400);
        }

        const ambiente = await prisma.ambiente.create({
            data: {
                nome,
                ordem: ordem || 0,
                imovelId: req.params.id,
            },
        });

        res.status(201).json(ambiente);
    } catch (error) {
        next(error);
    }
});

// PUT /api/imoveis/:imovelId/ambientes/:ambienteId - Atualizar ambiente
router.put('/:imovelId/ambientes/:ambienteId', async (req: AuthRequest, res, next) => {
    try {
        const { nome, existe, ordem } = req.body;

        const ambiente = await prisma.ambiente.update({
            where: { id: req.params.ambienteId },
            data: { nome, existe, ordem },
        });

        res.json(ambiente);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/imoveis/:imovelId/ambientes/:ambienteId - Remover ambiente
router.delete('/:imovelId/ambientes/:ambienteId', async (req: AuthRequest, res, next) => {
    try {
        await prisma.ambiente.delete({
            where: { id: req.params.ambienteId },
        });

        res.json({ message: 'Ambiente removido com sucesso' });
    } catch (error) {
        next(error);
    }
});

export default router;
