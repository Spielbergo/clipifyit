import { useAuth } from '../contexts/AuthContext';
import dynamic from 'next/dynamic';

const ProApp = dynamic(() => import('../components/app/ProApp'), { ssr: false });
const FreeApp = dynamic(() => import('../components/app/FreeApp'), { ssr: false });

export default function AppPage() {
    const { user } = useAuth();

    if (user === undefined) {
        return <div>Loading...</div>;
    }

    return user ? <ProApp /> : <FreeApp />;
}