import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import imoveisRoutes from './routes/imoveis.js';
import vistoriasRoutes from './routes/vistorias.js';
import relatoriosRoutes from './routes/relatorios.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';
import configuracoesRoutes from './routes/configuracoes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por IP
    message: { error: 'Muitas requisições, tente novamente mais tarde.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos de upload
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/imoveis', imoveisRoutes);
app.use('/api/vistorias', vistoriasRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/configuracoes', configuracoesRoutes);

// Error handler
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM recebido, fechando conexões...');
    await prisma.$disconnect();
    process.exit(0);
});

export { prisma };
