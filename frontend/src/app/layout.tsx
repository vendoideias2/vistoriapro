import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: 'Vistoria Imobiliária',
    description: 'Sistema de vistorias para imóveis',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Vistoria',
    },
};

export const viewport: Viewport = {
    themeColor: '#1e3a8a',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR">
            <head>
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
            </head>
            <body className="antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
