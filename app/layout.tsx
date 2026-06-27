import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: `mtoool Menu - India's #1 Digital Menu Management Platform`,
  description: "mtoool Menu: The ultimate QR code menu builder for restaurants. Features real-time digital menu management, contactless ordering, and integrated Google Review tools to increase your restaurant's visibility and customer satisfaction.",

  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },

  openGraph: {
    images: [
      {
        url: '/banner.png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: '/banner.png',
      },
    ],
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
