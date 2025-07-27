import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

import Navigation from '../components/Navigation.component';
import NavigationMobile from '../components/NavigationMobile.component';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
    const [isMobile, setIsMobile] = useState(false);
    const router = useRouter();

    // Optional: Add a class to the body for dark mode based on system preference
    useEffect(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-mode', prefersDark);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1024);
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <AuthProvider>
            {/* Only show nav if not popout */}
            {router.pathname !== '/popout' && (isMobile ? <NavigationMobile /> : <Navigation />)}
            <Component {...pageProps} />
        </AuthProvider>
    );
}