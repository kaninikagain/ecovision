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
  themeColor: '#0b1a16',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'EcoVision - AI Waste Scanner, Sustainability Hub & Eco-Gamification',
  description:
    'Real-time AI waste sorting scanner with Google Gemini. Detects recyclable, organic, hazardous, and general waste with instant contamination alerts, dynamic carbon impact metrics, local drop-off maps, and AI upcycling guides.',
  keywords: [
    'EcoVision',
    'AI waste scanner',
    'campus waste sorting',
    'recycling AI',
    'carbon footprint tracker',
    'upcycling recipes',
    'Google Gemini AI',
    'sustainability dashboard',
    'smart recycling bin',
  ],
  authors: [{ name: 'EcoVision AI Team' }],
  creator: 'EcoVision',
  publisher: 'EcoVision Campus Sustainability',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ecovision-six.vercel.app',
    title: 'EcoVision - AI Waste Scanner & Sustainability Hub',
    description:
      'Instant AI-powered waste classification, contamination detection, eco-impact translator, and drop-off maps for campuses and households.',
    siteName: 'EcoVision AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EcoVision - AI Waste Scanner & Sustainability Hub',
    description:
      'Instant AI waste classification, contamination detection, and smart eco-impact translation powered by Google Gemini.',
  },
  alternates: {
    canonical: 'https://ecovision-six.vercel.app',
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
