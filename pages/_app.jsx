import '../styles/globals.css';
import { useEffect } from 'react';
import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';

import Navigation from '../components/Navigation.component';
import NavigationMobile from '../components/NavigationMobile.component';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
    const router = useRouter();

    useEffect(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-mode', prefersDark);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(async (reg) => {
                try { await reg.update(); } catch {}
            }).catch(() => {});
            // Also ensure current active registration checks for updates
            navigator.serviceWorker.ready?.then(reg => { try { reg.update(); } catch {} });
        }
        // Ask for persistent storage on supported browsers (helps avoid eviction)
        navigator.storage?.persist?.().catch(() => {});
    }, []);

    return (
        <AuthProvider>
            <Head>
                <link rel="manifest" href="/manifest.webmanifest" />
                <meta name="theme-color" content="#0b0b0b" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <link rel="apple-touch-icon" href="/logos/logo-light-text.png" />
            </Head>
            {router.pathname !== '/popout' && (
                <>
                    <div className="navDesktopOnly">
                        <Navigation />
                    </div>
                    <div className="navMobileOnly">
                        <NavigationMobile />
                    </div>
                </>
            )}
            <Component {...pageProps} />
        </AuthProvider>
    );
}