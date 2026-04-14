import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ApiWarmup from '@/components/ApiWarmup';

export const metadata: Metadata = {
  title: "I'm Broke – Find Amazing Deals in Singapore",
  description:
    'Student discounts, flash sales, 1-for-1 deals and local events — all in one place for Singapore. Updated daily.',
  keywords: ['deals', 'discounts', 'student', 'Singapore', 'flash sale', '1-for-1'],
  openGraph: {
    title: "I'm Broke – Find Amazing Deals in Singapore",
    description: 'Student discounts, flash sales, 1-for-1 deals and local events.',
    type: 'website',
    locale: 'en_SG',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ApiWarmup />
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
