import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';

const router = Router();

// Todas as rotas requerem autenticação admin
router.use(authMiddleware);
router.use((req: AuthRequest, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return next(createError('Acesso negado. Apenas administradores.', 403));
    }
    next();
});

// Schema de validação
const configSchema = z.object({
    categoria: z.string().min(1),
    chave: z.string().min(1),
    valor: z.string(),
    descricao: z.string().optional(),
    sensivel: z.boolean().optional(),
});

// GET /api/configuracoes - Listar todas as configurações
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const configs = await prisma.configuracao.findMany({
            orderBy: [{ categoria: 'asc' }, { chave: 'asc' }],
        });

        // Mascarar valores sensíveis
        const maskedConfigs = configs.map(c => ({
            ...c,
            valor: c.sensivel ? '••••••••' : c.valor,
        }));

        res.json(maskedConfigs);
    } catch (error) {
        next(error);
    }
});

// GET /api/configuracoes/:categoria - Listar por categoria
router.get('/:categoria', async (req: AuthRequest, res, next) => {
    try {
        const configs = await prisma.configuracao.findMany({
            where: { categoria: req.params.categoria },
            orderBy: { chave: 'asc' },
        });

        const maskedConfigs = configs.map(c => ({
            ...c,
            valor: c.sensivel ? '••••••••' : c.valor,
        }));

        res.json(maskedConfigs);
    } catch (error) {
        next(error);
    }
});

// PUT /api/configuracoes - Criar ou atualizar configuração
router.put('/', async (req: AuthRequest, res, next) => {
    try {
        const data = configSchema.parse(req.body);

        const config = await prisma.configuracao.upsert({
            where: {
                categoria_chave: {
                    categoria: data.categoria,
                    chave: data.chave,
                },
            },
            update: {
                valor: data.valor,
                descricao: data.descricao,
                sensivel: data.sensivel,
            },
            create: {
                categoria: data.categoria,
                chave: data.chave,
                valor: data.valor,
                descricao: data.descricao,
                sensivel: data.sensivel ?? false,
            },
        });

        // Log
        await prisma.log.create({
            data: {
                acao: 'ATUALIZAR_CONFIG',
                entidade: 'Configuracao',
                entidadeId: config.id,
                usuarioId: req.user!.id,
                dados: { categoria: data.categoria, chave: data.chave },
                ip: req.ip,
            },
        });

        res.json(config);
    } catch (error) {
        next(error);
    }
});

// PUT /api/configuracoes/batch - Atualizar múltiplas configurações
router.put('/batch', async (req: AuthRequest, res, next) => {
    try {
        const configs = z.array(configSchema).parse(req.body);

        const results = await Promise.all(
            configs.map(data =>
                prisma.configuracao.upsert({
                    where: {
                        categoria_chave: {
                            categoria: data.categoria,
                            chave: data.chave,
                        },
                    },
                    update: {
                        valor: data.valor,
                        descricao: data.descricao,
                        sensivel: data.sensivel,
                    },
                    create: {
                        categoria: data.categoria,
                        chave: data.chave,
                        valor: data.valor,
                        descricao: data.descricao,
                        sensivel: data.sensivel ?? false,
                    },
                })
            )
        );

        // Log
        await prisma.log.create({
            data: {
                acao: 'ATUALIZAR_CONFIGS_BATCH',
                entidade: 'Configuracao',
                entidadeId: 'batch',
                usuarioId: req.user!.id,
                dados: { count: configs.length },
                ip: req.ip,
            },
        });

        res.json(results);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/configuracoes/:id - Remover configuração
router.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        await prisma.configuracao.delete({
            where: { id: req.params.id },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// GET /api/configuracoes/valor/:categoria/:chave - Obter valor (para uso interno)
router.get('/valor/:categoria/:chave', async (req: AuthRequest, res, next) => {
    try {
        const config = await prisma.configuracao.findUnique({
            where: {
                categoria_chave: {
                    categoria: req.params.categoria,
                    chave: req.params.chave,
                },
            },
        });

        if (!config) {
            throw createError('Configuração não encontrada', 404);
        }

        res.json({ valor: config.valor });
    } catch (error) {
        next(error);
    }
});

export default router;

// Helper para obter configuração (uso interno nos services)
export async function getConfig(categoria: string, chave: string, defaultValue: string = ''): Promise<string> {
    try {
        const config = await prisma.configuracao.findUnique({
            where: {
                categoria_chave: { categoria, chave },
            },
        });
        return config?.valor ?? defaultValue;
    } catch {
        return defaultValue;
    }
}

// Helper para obter todas as configs de uma categoria
export async function getConfigsByCategory(categoria: string): Promise<Record<string, string>> {
    try {
        const configs = await prisma.configuracao.findMany({
            where: { categoria },
        });
        return configs.reduce((acc, c) => {
            acc[c.chave] = c.valor;
            return acc;
        }, {} as Record<string, string>);
    } catch {
        return {};
    }
}
