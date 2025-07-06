import { useState, useEffect } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa'; // Import moon and sun icons

export default function DarkModeToggle() {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);
        document.body.classList.toggle('dark-mode', prefersDark);
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        document.body.classList.toggle('dark-mode', !isDarkMode);
    };

    return (
        <button
            onClick={toggleDarkMode}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5rem',
                color: isDarkMode ? '#FFD700' : '#4A4A4A', // Gold for sun, gray for moon
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {isDarkMode ? <FaMoon /> : <FaSun />}
        </button>
    );
}