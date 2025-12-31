import '../styles/globals.css';
import type { AppProps } from 'next/app';
import ComplianceBanner from '../components/ComplianceBanner';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Offline prototype: no realtime setup
  }, []);

  return (
    <>
      <ComplianceBanner />
      <div className="container mx-auto p-4">
        <Component {...pageProps} />
      </div>
    </>
  );
}
