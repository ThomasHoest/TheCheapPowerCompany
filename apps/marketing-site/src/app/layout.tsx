import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import SkipToContent from '@/components/SkipToContent';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://tcpc.dk'),
  description: 'Køb strøm til spotpris med et lille fast tillæg. Ingen binding. Tilmeld dig med MitID.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Køb strøm til spotpris med et lille fast tillæg. Ingen binding. Tilmeld dig med MitID og betal med MobilePay."
        />
      </head>
      <body>
        <SkipToContent />
        <NavBar />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
