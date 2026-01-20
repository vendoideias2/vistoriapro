import path from 'path';
import fs from 'fs/promises';

// Tipos de storage suportados
export type StorageType = 'local' | 'github';

interface StorageConfig {
    type: StorageType;
    // Local
    uploadDir?: string;
    // GitHub
    githubToken?: string;
    githubRepo?: string;
    githubOwner?: string;
    githubBranch?: string;
}

const config: StorageConfig = {
    type: (process.env.STORAGE_TYPE as StorageType) || 'local',
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPO,
    githubOwner: process.env.GITHUB_OWNER,
    githubBranch: process.env.GITHUB_BRANCH || 'main',
};

// Interface para resultado de upload
interface UploadResult {
    url: string;
    path: string;
}

// Upload para storage local
async function uploadLocal(buffer: Buffer, filename: string): Promise<UploadResult> {
    const uploadDir = config.uploadDir!;

    try {
        await fs.access(uploadDir);
    } catch {
        await fs.mkdir(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, buffer);

    return {
        url: `/uploads/${filename}`,
        path: filepath,
    };
}

// Upload para GitHub
async function uploadGitHub(buffer: Buffer, filename: string): Promise<UploadResult> {
    const { githubToken, githubRepo, githubOwner, githubBranch } = config;

    if (!githubToken || !githubRepo || !githubOwner) {
        throw new Error('Configuração do GitHub incompleta. Defina GITHUB_TOKEN, GITHUB_OWNER e GITHUB_REPO');
    }

    const filePath = `uploads/vistorias/${filename}`;
    const content = buffer.toString('base64');

    // API do GitHub para criar/atualizar arquivo
    const apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`;

    const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Upload: ${filename}`,
            content,
            branch: githubBranch,
        }),
    });

    if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(`Erro ao fazer upload para GitHub: ${error.message}`);
    }

    const data = await response.json();

    // URL raw do arquivo no GitHub
    const rawUrl = `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/${filePath}`;

    return {
        url: rawUrl,
        path: filePath,
    };
}

// Deletar do storage local
async function deleteLocal(filename: string): Promise<void> {
    const filepath = path.join(config.uploadDir!, filename);
    try {
        await fs.unlink(filepath);
    } catch (error) {
        console.error('Erro ao deletar arquivo local:', error);
    }
}

// Deletar do GitHub
async function deleteGitHub(filePath: string): Promise<void> {
    const { githubToken, githubRepo, githubOwner, githubBranch } = config;

    if (!githubToken || !githubRepo || !githubOwner) {
        throw new Error('Configuração do GitHub incompleta');
    }

    // Primeiro, obter o SHA do arquivo
    const apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`;

    const getResponse = await fetch(apiUrl, {
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
        },
    });

    if (!getResponse.ok) {
        console.error('Arquivo não encontrado no GitHub');
        return;
    }

    const fileData = await getResponse.json() as any;

    // Deletar o arquivo
    const deleteResponse = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Delete: ${path.basename(filePath)}`,
            sha: fileData.sha,
            branch: githubBranch,
        }),
    });

    if (!deleteResponse.ok) {
        const error = await deleteResponse.json() as any;
        console.error('Erro ao deletar do GitHub:', error.message);
    }
}

// Funções públicas
export async function uploadFile(buffer: Buffer, filename: string): Promise<UploadResult> {
    if (config.type === 'github') {
        return uploadGitHub(buffer, filename);
    }
    return uploadLocal(buffer, filename);
}

export async function deleteFile(urlOrPath: string): Promise<void> {
    if (config.type === 'github') {
        // Extrair o path do URL do GitHub
        const match = urlOrPath.match(/github\.com\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/(.+)/);
        const filePath = match ? match[1] : urlOrPath;
        return deleteGitHub(filePath);
    }

    const filename = path.basename(urlOrPath);
    return deleteLocal(filename);
}

export function getStorageType(): StorageType {
    return config.type;
}
