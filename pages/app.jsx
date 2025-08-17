import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSubscription from '../hooks/useSubscription';
import Loader from '../components/Loader.component';
import dynamic from 'next/dynamic';

const ProApp = dynamic(() => import('../components/app/ProApp'), { ssr: false });
const FreeApp = dynamic(() => import('../components/app/FreeApp'), { ssr: false });

export default function AppPage() {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const { loading, isActive } = useSubscription();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        // Render a stable placeholder on both server and the very first client render
        return <div suppressHydrationWarning />;
    }

    // Suppress hydration warnings for this client-only subtree
    if (!user) return <div suppressHydrationWarning><FreeApp /></div>;
    if (loading) return <div suppressHydrationWarning style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}><Loader size={56} /></div>;
    return <div suppressHydrationWarning>{isActive ? <ProApp /> : <FreeApp />}</div>;
}