import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['600', '700', '800'],
});

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const viewport: Viewport = {
  themeColor: '#0f3a33',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'EcoVision Mini AI - Campus Waste Sorting Assistant',
  description:
    'Instant AI-powered waste classification for college campuses using Google Gemini. Detects recyclable, organic, hazardous, and general waste in seconds.',
  keywords: [
    'waste sorting',
    'campus recycling',
    'AI waste classification',
    'EcoVision',
    'Google Gemini',
    'sustainability',
  ],
  authors: [{ name: 'EcoVision Team' }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
