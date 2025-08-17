import '../styles/globals.css';
import { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

import Navigation from '../components/Navigation.component';
import NavigationMobile from '../components/NavigationMobile.component';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
    const router = useRouter();

    useEffect(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-mode', prefersDark);
    }, []);

    return (
        <AuthProvider>
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