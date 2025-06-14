import Link from 'next/link';

export default function Home() {
    return (
        <div>
            {/* Hero Section */}
            <section style={{ padding: '60px 0', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Clipify It</h1>
                <p style={{ fontSize: '1.5rem', marginBottom: '30px' }}>
                    The ultimate clipboard manager for productivity.
                </p>
                <Link href="/app">
                    <button style={{ fontSize: '1.2rem', padding: '16px 32px', background: '#6599a6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Open App
                    </button>
                </Link>
            </section>

            {/* Features Section */}
            <section style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px' }}>
                <h2>Features - Free Forever</h2>
                <ul style={{ fontSize: '1.1rem', lineHeight: 2 }}>
                    <li>📝 Save and organize your clipboard history</li>
                    <li>📅 Saved locally in your browser</li>
                    <li>🔍 Search and filter clipboard items</li>
                    <li>📋 One-click copy and paste</li>
                    <li>🖊️ Edit and manage items</li>
                    <li>🗑️ Clear and restore clipboard history</li>
                    <li>🌙 Dark mode support</li>
                    <li>✨ And more in the Pro version!</li>
                </ul>
                <Link href="/app">
                    <button style={{ marginTop: 24, fontSize: '1rem', padding: '12px 24px', background: '#6599a6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Try Clipify It Now
                    </button>
                </Link>
            </section>

            {/* Pro Version Section */}
            <section style={{ padding: '40px 0', textAlign: 'center' }}>
                <h2>Upgrade to Pro</h2>
                <p>Unlock unlimited history, cloud sync, and more!</p>
                <Link href="/app">
                    <button style={{ fontSize: '1rem', padding: '12px 24px', background: '#007BFF', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Go Pro
                    </button>
                </Link>
            </section>
        </div>
    );
}