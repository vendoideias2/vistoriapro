import { Router } from 'express';
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

// GET /api/admin/metricas - Estatísticas gerais
router.get('/metricas', async (req: AuthRequest, res, next) => {
    try {
        const [
            totalVistorias,
            vistoriasFinalizadas,
            vistoriasEmAndamento,
            totalImoveis,
            totalUsuarios,
            vistoriasMes,
        ] = await Promise.all([
            prisma.vistoria.count(),
            prisma.vistoria.count({ where: { status: 'FINALIZADA' } }),
            prisma.vistoria.count({ where: { status: 'EM_ANDAMENTO' } }),
            prisma.imovel.count({ where: { ativo: true } }),
            prisma.usuario.count({ where: { ativo: true } }),
            prisma.vistoria.count({
                where: {
                    criadoEm: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
        ]);

        // Vistorias por tipo
        const vistoriasPorTipo = await prisma.vistoria.groupBy({
            by: ['tipo'],
            _count: true,
        });

        // Últimas 5 vistorias
        const ultimasVistorias = await prisma.vistoria.findMany({
            take: 5,
            orderBy: { criadoEm: 'desc' },
            include: {
                imovel: { select: { endereco: true, numero: true } },
                vistoriador: { select: { nome: true } },
            },
        });

        res.json({
            totais: {
                vistorias: totalVistorias,
                finalizadas: vistoriasFinalizadas,
                emAndamento: vistoriasEmAndamento,
                imoveis: totalImoveis,
                usuarios: totalUsuarios,
                vistoriasMes,
            },
            vistoriasPorTipo: vistoriasPorTipo.reduce((acc, v) => {
                acc[v.tipo] = v._count;
                return acc;
            }, {} as Record<string, number>),
            ultimasVistorias,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/vistorias-por-mes - Dados para gráfico
router.get('/vistorias-por-mes', async (req: AuthRequest, res, next) => {
    try {
        // Últimos 12 meses
        const meses = [];
        const hoje = new Date();

        for (let i = 11; i >= 0; i--) {
            const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 1);

            const count = await prisma.vistoria.count({
                where: {
                    criadoEm: {
                        gte: data,
                        lt: proximoMes,
                    },
                },
            });

            meses.push({
                mes: data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                total: count,
            });
        }

        res.json(meses);
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/usuarios-ativos - Lista de usuários ativos
router.get('/usuarios-ativos', async (req: AuthRequest, res, next) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            where: { ativo: true },
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                criadoEm: true,
                _count: {
                    select: { vistorias: true },
                },
            },
            orderBy: { nome: 'asc' },
        });

        res.json(usuarios);
    } catch (error) {
        next(error);
    }
});

export default router;
