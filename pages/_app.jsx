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
                {/* Language and charset */}
                <meta charSet="utf-8" />
                <meta httpEquiv="Content-Language" content="en" />
                {/* Viewport and mobile */}
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
                {/* SEO basics */}
                <title>ClipifyIt – Clipboard Manager & Pro Productivity</title>
                <meta name="description" content="ClipifyIt: Effortless clipboard management, cloud sync, folders, and more. Upgrade to Pro for advanced features!" />
                <meta name="keywords" content="clipboard, productivity, cloud sync, folders, pro, ClipifyIt" />
                <meta name="author" content="ClipifyIt Team" />
                {/* Social sharing (Open Graph & Twitter) */}
                <meta property="og:type" content="website" />
                <meta property="og:title" content="ClipifyIt – Clipboard Manager & Pro Productivity" />
                <meta property="og:description" content="Effortless clipboard management, cloud sync, folders, and more. Upgrade to Pro for advanced features!" />
                <meta property="og:image" content="/screenshots/clipifyit-screenshot.jpg" />
                <meta property="og:url" content="https://clipifyit.com/" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="ClipifyIt – Clipboard Manager & Pro Productivity" />
                <meta name="twitter:description" content="Effortless clipboard management, cloud sync, folders, and more. Upgrade to Pro for advanced features!" />
                <meta name="twitter:image" content="/screenshots/clipifyit-screenshot.jpg" />
                {/* PWA & theme */}
                <link rel="manifest" href="/logos/favicons/site.webmanifest" />
                <meta name="theme-color" content="#0b0b0b" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                {/* App icons & favicons */}
                <link rel="apple-touch-icon" sizes="180x180" href="/logos/favicons/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/logos/favicons/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/logos/favicons/favicon-16x16.png" />
                <link rel="icon" type="image/png" sizes="192x192" href="/logos/favicons/android-chrome-192x192.png" />
                <link rel="icon" type="image/png" sizes="512x512" href="/logos/favicons/android-chrome-512x512.png" />
                {/* Fallback favicon */}
                <link rel="icon" href="/favicon.ico" />
                {/* Canonical URL */}
                <link rel="canonical" href="https://clipifyit.com/" />
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