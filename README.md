# 🏠 App Web de Vistoria Imobiliária

Aplicação completa para realizar vistorias de imóveis com checklist por ambiente, registro fotográfico, comparação de vistorias e geração de relatórios PDF profissionais.

## 📋 Funcionalidades

- ✅ **Cadastro de Imóveis** - Gerenciamento completo de imóveis
- ✅ **Vistorias** - Entrada, saída e periódicas
- ✅ **Checklist por Ambiente** - Piso, paredes, teto, elétrica, hidráulica...
- ✅ **Registro Fotográfico** - Upload direto do celular com compressão
- ✅ **Relatórios PDF** - Geração automática de relatórios profissionais
- ✅ **PWA** - Instalável como app no celular
- ✅ **Multi-usuário** - Admin, vistoriador, corretor

## 🚀 Início Rápido

### Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento local)

### Deploy com Docker

1. **Clone o repositório** e navegue até a pasta:
```bash
cd "app vistoria"
```

2. **Configure as variáveis de ambiente**:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

3. **Inicie os containers**:
```bash
docker-compose up -d
```

4. **Acesse o app**:
- Frontend: http://localhost (ou https://app.seudominio.com.br)
- API: http://localhost:3001 (ou https://api.seudominio.com.br)

### Credenciais Padrão

| Usuário | Email | Senha |
|---------|-------|-------|
| Admin | admin@vistoria.app | Admin@2026! |
| Vistoriador | vistoriador@vistoria.app | Vistoria@2026! |

> ⚠️ **Importante**: Altere as senhas em produção!

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DOMAIN` | Domínio principal | seudominio.com.br |
| `DB_PASSWORD` | Senha do PostgreSQL | SuaSenhaSegura123! |
| `JWT_SECRET` | Chave secreta JWT | sua-chave-super-secreta |
| `ADMIN_EMAIL` | Email do admin inicial | admin@seudominio.com.br |
| `ADMIN_PASSWORD` | Senha do admin inicial | SenhaAdmin123! |

### Storage de Imagens

O app suporta dois tipos de storage:

#### 1. Local (padrão)
As imagens são salvas na VPS em `/app/uploads`.

#### 2. GitHub
As imagens são salvas em um repositório do GitHub.

Configure as seguintes variáveis:
```env
STORAGE_TYPE=github
GITHUB_TOKEN=seu_personal_access_token
GITHUB_OWNER=seu_usuario
GITHUB_REPO=nome_do_repositorio
GITHUB_BRANCH=main
```

Para criar um token:
1. Acesse https://github.com/settings/tokens
2. Gere um novo token com permissão `repo`
3. Crie um repositório público ou privado para as imagens

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        VPS / Docker                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │
│  │  Nginx  │──│  Frontend   │  │   Backend   │──│ Postgres│ │
│  │  :80    │  │  Next.js    │  │   Node.js   │  │  :5432  │ │
│  │  :443   │  │  :3000      │  │   :3001     │  │         │ │
│  └─────────┘  └─────────────┘  └─────────────┘  └────────┘ │
│       │                              │                      │
│       └──────────────────────────────┤                      │
│                                      │                      │
│                              ┌───────▼───────┐              │
│                              │    Storage    │              │
│                              │ Local/GitHub  │              │
│                              └───────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Estrutura do Projeto

```
app vistoria/
├── docker-compose.yml      # Orquestração dos containers
├── .env.example            # Template de variáveis
├── nginx/
│   └── nginx.conf          # Configuração do proxy reverso
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma   # Modelo de dados
│   │   └── seed.ts         # Dados iniciais
│   └── src/
│       ├── index.ts        # Entrada da API
│       ├── routes/         # Rotas da API
│       ├── middlewares/    # Auth, erros
│       └── services/       # Storage, etc
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── public/
    │   └── manifest.json   # PWA
    └── src/
        ├── app/            # Páginas Next.js
        └── lib/            # API client
```

## 🔐 Segurança

- HTTPS obrigatório (Let's Encrypt)
- Autenticação JWT
- Senhas com hash bcrypt
- Rate limiting
- Logs de auditoria
- CORS configurado

## 📖 API

### Autenticação

```
POST /api/auth/login        # Login
POST /api/auth/refresh      # Renovar token
GET  /api/auth/me           # Usuário atual
```

### Imóveis

```
GET    /api/imoveis         # Listar
POST   /api/imoveis         # Criar
GET    /api/imoveis/:id     # Detalhes
PUT    /api/imoveis/:id     # Atualizar
DELETE /api/imoveis/:id     # Desativar
```

### Vistorias

```
GET    /api/vistorias              # Listar
POST   /api/vistorias              # Criar
GET    /api/vistorias/:id          # Detalhes
POST   /api/vistorias/:id/finalizar # Finalizar
PUT    /api/vistorias/:id/itens/:itemId # Atualizar item
```

### Relatórios

```
GET /api/relatorios/:vistoriaId     # Gerar PDF
GET /api/relatorios/:vistoriaId/html # Prévia HTML
```

## 🔧 Desenvolvimento Local

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Configure o DATABASE_URL
npm run prisma:migrate:dev
npm run prisma:seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📱 PWA

O app pode ser instalado como aplicativo:

1. Acesse o app pelo navegador do celular
2. Clique em "Adicionar à tela inicial"
3. Use como um app nativo

## 🆘 Suporte

Para configurar SSL com Let's Encrypt:

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx

# Gerar certificado
certbot --nginx -d app.seudominio.com.br -d api.seudominio.com.br

# Renovação automática
certbot renew --dry-run
```

## 📄 Licença

Uso interno - Todos os direitos reservados.
