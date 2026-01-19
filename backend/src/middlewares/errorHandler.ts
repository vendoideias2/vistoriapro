import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

export function errorHandler(
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('❌ Erro:', err);

    // Erros de validação Zod
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: 'Erro de validação',
            details: err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
    }

    // Erros operacionais (esperados)
    if (err.isOperational) {
        return res.status(err.statusCode || 400).json({
            error: err.message,
        });
    }

    // Erros de Prisma
    if (err.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
            error: 'Erro de banco de dados',
            message: 'Operação inválida ou registro não encontrado',
        });
    }

    // Erro genérico
    return res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
}

export function createError(message: string, statusCode: number = 400): AppError {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
}
