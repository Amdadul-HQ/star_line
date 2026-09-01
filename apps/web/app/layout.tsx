import type { Metadata } from 'next';
import { Inter, Noto_Sans_Bengali } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n';
import { QueryProvider } from '@/lib/query';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const bengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bengali',
});

export const metadata: Metadata = {
  title: 'Star Line — Travel Smarter',
  description:
    'Star Line bus transportation platform: book intercity tickets, track buses live and manage fleet operations across Bangladesh.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bengali.variable}`}>
      <body>
        <I18nProvider>
          <QueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
