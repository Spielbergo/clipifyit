import Image from 'next/image';
import Link from 'next/link';
import styles from './free-sidebar.module.css';

// Pro features
const proFeatures = [
	{ key: 'cloud-sync', label: 'Cloud sync across all devices', emoji: '☁️' },
	{ key: 'folders', label: 'Unlimited folders', emoji: '🗂️' },
	{ key: 'search', label: 'Advanced search & filters', emoji: '🔍' },
	{ key: 'offline', label: 'Offline mode with auto sync', emoji: '📡' },
	{ key: 'ad-free', label: '100% Ad Free', emoji: '📡' },
];

export default function FreeSidebar() {
	return (
		<aside className={styles.sidebar} aria-label="Upgrade benefits sidebar">
			<div className={styles.promoCard}>
				<header className={styles.cardHeader}>
					<h2 className={styles.title}>Go Pro & Level Up</h2>
					<p className={styles.subtitle}>Unlock productivity & peace of mind.</p>
				</header>

				<div className={styles.screenshotWrap}>
					<Image
						src="/screenshots/clipifyit-screenshot.jpg"
						alt="Preview of Pro features"
						width={420}
						height={240}
						className={styles.screenshot}
						priority
					/>
				</div>

				<ul className={styles.featureList}>
					{proFeatures.map(f => (
						<li key={f.key} className={styles.featureItem}>
							<span className={styles.featureEmoji} aria-hidden="true">{f.emoji}</span>
							<span className={styles.featureLabel}>{f.label}</span>
						</li>
					))}
				</ul>

				<div className={styles.ctaWrap}>
					<Link href="/prices" className={styles.upgradeBtn} aria-label="View Pro pricing plans">
						Upgrade to Pro
					</Link>
					<p className={styles.disclaimer}>Free tier keeps core features. Pro supercharges everything.</p>
				</div>
			</div>

			<div className={styles.adPlaceholder} aria-label="Future advertisement space" role="complementary">
				<div className={styles.adInner}>Ad Space</div>
			</div>
		</aside>
	);
}

