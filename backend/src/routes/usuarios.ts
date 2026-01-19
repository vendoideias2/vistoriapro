import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';

const router = Router();

// Schemas de validação
const createUsuarioSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    role: z.enum(['ADMIN', 'VISTORIADOR', 'CORRETOR', 'VISUALIZADOR']).optional(),
});

const updateUsuarioSchema = z.object({
    nome: z.string().min(2).optional(),
    email: z.string().email().optional(),
    senha: z.string().min(6).optional(),
    role: z.enum(['ADMIN', 'VISTORIADOR', 'CORRETOR', 'VISUALIZADOR']).optional(),
    ativo: z.boolean().optional(),
});

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// GET /api/usuarios - Listar usuários (apenas admin)
router.get('/', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                ativo: true,
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

// GET /api/usuarios/:id - Detalhes do usuário
router.get('/:id', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                ativo: true,
                criadoEm: true,
                vistorias: {
                    take: 10,
                    orderBy: { criadoEm: 'desc' },
                    select: {
                        id: true,
                        tipo: true,
                        status: true,
                        dataVistoria: true,
                        imovel: {
                            select: { endereco: true, numero: true },
                        },
                    },
                },
            },
        });

        if (!usuario) {
            throw createError('Usuário não encontrado', 404);
        }

        res.json(usuario);
    } catch (error) {
        next(error);
    }
});

// POST /api/usuarios - Criar usuário (apenas admin)
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
    try {
        const data = createUsuarioSchema.parse(req.body);

        // Verificar se email já existe
        const existing = await prisma.usuario.findUnique({
            where: { email: data.email },
        });

        if (existing) {
            throw createError('Email já cadastrado', 400);
        }

        const hashedPassword = await bcrypt.hash(data.senha, 12);

        const usuario = await prisma.usuario.create({
            data: {
                nome: data.nome,
                email: data.email,
                senha: hashedPassword,
                role: data.role || 'VISTORIADOR',
            },
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                ativo: true,
                criadoEm: true,
            },
        });

        // Log
        await prisma.log.create({
            data: {
                acao: 'CRIAR',
                entidade: 'Usuario',
                entidadeId: usuario.id,
                usuarioId: req.user!.id,
                dados: { nome: data.nome, email: data.email, role: data.role },
                ip: req.ip,
            },
        });

        res.status(201).json(usuario);
    } catch (error) {
        next(error);
    }
});

// PUT /api/usuarios/:id - Atualizar usuário
router.put('/:id', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
    try {
        const data = updateUsuarioSchema.parse(req.body);

        const updateData: any = { ...data };

        if (data.senha) {
            updateData.senha = await bcrypt.hash(data.senha, 12);
        }

        const usuario = await prisma.usuario.update({
            where: { id: req.params.id },
            data: updateData,
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                ativo: true,
                atualizadoEm: true,
            },
        });

        // Log
        await prisma.log.create({
            data: {
                acao: 'ATUALIZAR',
                entidade: 'Usuario',
                entidadeId: usuario.id,
                usuarioId: req.user!.id,
                dados: Object.keys(data).filter(k => k !== 'senha'),
                ip: req.ip,
            },
        });

        res.json(usuario);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/usuarios/:id - Desativar usuário (soft delete)
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
    try {
        // Não permitir auto-exclusão
        if (req.params.id === req.user!.id) {
            throw createError('Você não pode desativar sua própria conta', 400);
        }

        const usuario = await prisma.usuario.update({
            where: { id: req.params.id },
            data: { ativo: false },
        });

        // Log
        await prisma.log.create({
            data: {
                acao: 'DESATIVAR',
                entidade: 'Usuario',
                entidadeId: usuario.id,
                usuarioId: req.user!.id,
                ip: req.ip,
            },
        });

        res.json({ message: 'Usuário desativado com sucesso' });
    } catch (error) {
        next(error);
    }
});

export default router;
