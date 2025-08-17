import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import LogInOptions from '../components/LogInOptions';

export default function LoginPage() {
	const router = useRouter();
	const { user } = useAuth();

	useEffect(() => {
		if (user?.id) {
			try {
				const raw = localStorage.getItem('pendingCheckout');
				if (raw) {
					const pending = JSON.parse(raw);
					localStorage.removeItem('pendingCheckout');
					const params = new URLSearchParams();
					if (pending?.plan) params.set('plan', pending.plan);
					if (pending?.term) params.set('term', pending.term);
					router.replace(`/prices?${params.toString()}`);
					return;
				}
			} catch {}
			router.replace('/');
		}
	}, [user, router]);

	return <LogInOptions />;
}