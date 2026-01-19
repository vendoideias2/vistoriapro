import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middlewares/auth.js';
import { createError } from '../middlewares/errorHandler.js';
import { uploadFile, deleteFile } from '../services/storage.js';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 10 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
    },
});

router.use(authMiddleware);

router.post('/foto/:itemId', upload.single('foto'), async (req: AuthRequest, res, next) => {
    try {
        if (!req.file) throw createError('Nenhuma foto enviada', 400);

        const item = await prisma.itemVistoria.findUnique({
            where: { id: req.params.itemId },
            include: { vistoria: true },
        });

        if (!item) throw createError('Item não encontrado', 404);
        if (item.vistoria.status === 'FINALIZADA') throw createError('Vistoria finalizada', 400);

        // Processar imagem
        const filename = `${Date.now()}-${req.params.itemId}.webp`;
        const processedBuffer = await sharp(req.file.buffer)
            .resize(1920, 1440, { fit: 'inside' })
            .webp({ quality: 85 })
            .toBuffer();

        // Upload para storage (local ou GitHub)
        const result = await uploadFile(processedBuffer, filename);

        const foto = await prisma.foto.create({
            data: { url: result.url, descricao: req.body.descricao, itemVistoriaId: req.params.itemId },
        });

        res.status(201).json(foto);
    } catch (error) { next(error); }
});

router.delete('/foto/:fotoId', async (req: AuthRequest, res, next) => {
    try {
        const foto = await prisma.foto.findUnique({
            where: { id: req.params.fotoId },
            include: { itemVistoria: { include: { vistoria: true } } },
        });

        if (!foto) throw createError('Foto não encontrada', 404);
        if (foto.itemVistoria.vistoria.status === 'FINALIZADA') throw createError('Vistoria finalizada', 400);

        // Deletar do storage
        await deleteFile(foto.url);
        await prisma.foto.delete({ where: { id: req.params.fotoId } });

        res.json({ message: 'Foto deletada' });
    } catch (error) { next(error); }
});

export default router;
