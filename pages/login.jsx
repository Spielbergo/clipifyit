import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import LogInOptions from '../components/LogInOptions';
import pageStyles from '../styles/login.module.css';

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

	return (
		<div className={pageStyles.page}>
			<div className={pageStyles.shell}>
				<section className={pageStyles.left}>
					<div className={pageStyles.brandRow}>
						<svg className={pageStyles.logoMark} viewBox="0 0 48 48" aria-hidden="true">
							<defs>
								<linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
									<stop offset="0%" stopColor="#4fc3f7" />
									<stop offset="100%" stopColor="#1976d2" />
								</linearGradient>
							</defs>
							<rect x="4" y="6" width="40" height="30" rx="8" fill="url(#g1)" />
							<rect x="10" y="12" width="28" height="18" rx="4" fill="#0b1020" opacity="0.95" />
							<path d="M16 18h16M16 22h10" stroke="#78d1ff" strokeWidth="2.5" strokeLinecap="round" />
							<circle cx="38" cy="37" r="6" fill="#0b1020" />
							<path d="M36 37l2 2 4-4" stroke="#4fc3f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						<div className={pageStyles.brandText}>
							<div className={pageStyles.brandTitle}>Clipify It</div>
							<div className={pageStyles.brandTag}>Your clipboard companion</div>
						</div>
					</div>
					<h1 className={pageStyles.headline}>Welcome back</h1>
					<p className={pageStyles.subcopy}>
						Organize everything you copy. Sign in to continue where you left off.
					</p>
				</section>
				<section className={pageStyles.right}>
					<div className={pageStyles.panel}>
						<div className={pageStyles.welcome}>Sign in to your account</div>
						{/* Keep all existing functionality – UI lives in LogInOptions */}
						<LogInOptions />
					</div>
				</section>
			</div>
		</div>
	);
}