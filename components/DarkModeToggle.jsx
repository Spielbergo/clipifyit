import { useState, useEffect } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { initTheme, toggleTheme as toggleThemeUtil } from '../lib/theme';

export default function DarkModeToggle() {
    const [theme, setTheme] = useState('dark'); // 'dark' | 'light'

    useEffect(() => {
        // Initialize from localStorage or system preference
        const applied = initTheme();
        setTheme(applied);
    }, []);

    const toggleDarkMode = () => {
        const next = toggleThemeUtil(theme);
        setTheme(next);
    };

    return (
        <button
            onClick={toggleDarkMode}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme === 'dark' ? '#222' : '#4A4A4A',
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </button>
    );
}