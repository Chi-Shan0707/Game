import '../styles/globals.css';
import type { AppProps } from 'next/app';

function Banner() {
  return (
    <div className='bg-red-600 text-white text-center py-2'>
      <strong>SIMULATION ONLY — NO REAL MONEY</strong>
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      <Banner />
      <main className='p-4'>
        <Component {...pageProps} />
      </main>
    </div>
  );
}
