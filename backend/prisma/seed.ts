import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Criar usuário admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@vistoria.app';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2026!';

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.usuario.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            nome: 'Administrador',
            email: adminEmail,
            senha: hashedPassword,
            role: 'ADMIN',
            ativo: true,
        },
    });

    console.log(`✅ Usuário admin criado: ${admin.email}`);

    // Criar usuário vistoriador de exemplo
    const vistoriador = await prisma.usuario.upsert({
        where: { email: 'vistoriador@vistoria.app' },
        update: {},
        create: {
            nome: 'Vistoriador Exemplo',
            email: 'vistoriador@vistoria.app',
            senha: await bcrypt.hash('Vistoria@2026!', 12),
            role: 'VISTORIADOR',
            ativo: true,
        },
    });

    console.log(`✅ Usuário vistoriador criado: ${vistoriador.email}`);

    // Criar imóvel de exemplo
    const imovel = await prisma.imovel.create({
        data: {
            tipo: 'APARTAMENTO',
            endereco: 'Rua Exemplo',
            numero: '123',
            complemento: 'Apto 101',
            bairro: 'Centro',
            cidade: 'São Paulo',
            estado: 'SP',
            cep: '01310-100',
            proprietario: 'João da Silva',
            telefone: '(11) 99999-9999',
            observacoes: 'Imóvel de exemplo para testes',
            ambientes: {
                create: [
                    { nome: 'Sala de Estar', ordem: 1 },
                    { nome: 'Cozinha', ordem: 2 },
                    { nome: 'Quarto 1', ordem: 3 },
                    { nome: 'Quarto 2', ordem: 4 },
                    { nome: 'Banheiro Social', ordem: 5 },
                    { nome: 'Área de Serviço', ordem: 6 },
                ],
            },
        },
        include: { ambientes: true },
    });

    console.log(`✅ Imóvel de exemplo criado: ${imovel.endereco}, ${imovel.numero}`);
    console.log(`   📦 ${imovel.ambientes.length} ambientes criados`);

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('\n📋 Credenciais de acesso:');
    console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`   Vistoriador: vistoriador@vistoria.app / Vistoria@2026!`);
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
