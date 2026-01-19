import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../index.js';
import { createError } from '../middlewares/errorHandler.js';
import { authMiddleware, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// Schema de validação
const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.usuario.findUnique({
            where: { email },
        });

        if (!user) {
            throw createError('Credenciais inválidas', 401);
        }

        if (!user.ativo) {
            throw createError('Usuário desativado', 401);
        }

        const validPassword = await bcrypt.compare(password, user.senha);
        if (!validPassword) {
            throw createError('Credenciais inválidas', 401);
        }

        const secret = process.env.JWT_SECRET || 'secret';

        const accessToken = jwt.sign(
            { id: user.id, email: user.email },
            secret,
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { id: user.id, email: user.email, type: 'refresh' },
            secret,
            { expiresIn: '7d' }
        );

        // Log de login
        await prisma.log.create({
            data: {
                acao: 'LOGIN',
                entidade: 'Usuario',
                entidadeId: user.id,
                usuarioId: user.id,
                ip: req.ip || req.socket.remoteAddress,
            },
        });

        res.json({
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                role: user.role,
            },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw createError('Refresh token não fornecido', 401);
        }

        const secret = process.env.JWT_SECRET || 'secret';

        const decoded = jwt.verify(refreshToken, secret) as {
            id: string;
            email: string;
            type: string;
        };

        if (decoded.type !== 'refresh') {
            throw createError('Token inválido', 401);
        }

        const user = await prisma.usuario.findUnique({
            where: { id: decoded.id },
        });

        if (!user || !user.ativo) {
            throw createError('Usuário não encontrado', 401);
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email },
            secret,
            { expiresIn: '24h' }
        );

        res.json({ accessToken });
    } catch (error) {
        next(error);
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.usuario.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                criadoEm: true,
            },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
});

export default router;
