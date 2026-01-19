import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { createError } from './errorHandler.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        nome: string;
        role: string;
    };
}

export async function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw createError('Token não fornecido', 401);
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'secret';

        const decoded = jwt.verify(token, secret) as {
            id: string;
            email: string;
        };

        const user = await prisma.usuario.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, nome: true, role: true, ativo: true },
        });

        if (!user || !user.ativo) {
            throw createError('Usuário não encontrado ou inativo', 401);
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: 'Token expirado' });
        }
        next(error);
    }
}

export function requireRole(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: `Requer uma das roles: ${roles.join(', ')}`
            });
        }

        next();
    };
}
