import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

import Navigation from '../components/Navigation.component';
import NavigationMobile from '../components/NavigationMobile.component';

export default function App({ Component, pageProps }) {
    const [isMobile, setIsMobile] = useState(false);

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
            {isMobile ? <NavigationMobile /> : <Navigation />}
            {/* Render the current page */}
            <Component {...pageProps} />
        </AuthProvider>
    );
}