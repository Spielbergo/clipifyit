import { useState } from 'react';
import { supabase } from '../lib/supabase';
import styles from './login-options.module.css';

export default function LogInOptions() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } }
        });
        if (error) throw error;
        setNotification('Check your email to verify your account. You can close this window, a new one will open when you confirm.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { prompt: 'select_account' }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { prompt: 'select_account' }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.login_page__bg}>
      <div className={styles.container}>
        <div className={styles.title}>Sign in to Clipify It</div>
        {/* >>>>>>>>>>>>>>>>>>>> SCOTT - 'DRY' THIS UP <<<<<<<<<<<<<<<<<<<<<<<< */}
        <button className={styles.socialBtn} onClick={() => handleOAuthLogin('google')}>
          <svg width="22" height="22" viewBox="0 0 48 48" style={{ marginRight: 6 }}>
            <g>
              <circle fill="#fff" cx="24" cy="24" r="24"/>
              <path fill="#4285F4" d="M34.6 24.2c0-.7-.1-1.4-.2-2H24v4.1h6c-.3 1.5-1.4 2.7-2.9 3.5v2.9h4.7c2.7-2.5 4.3-6.2 4.3-10.5z"/>
              <path fill="#34A853" d="M24 36c3.6 0 6.6-1.2 8.8-3.2l-4.7-2.9c-1.3.9-3 .1-3.7-.7h-4.8v3h4.4c.9.7 2.1 1.1 3.3 1.1z"/>
              <path fill="#FBBC05" d="M15.2 28.1c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2v-3h-4.8C9.5 23.1 9 25.5 9 28c0 2.5.5 4.9 1.4 7l4.8-3.1z"/>
              <path fill="#EA4335" d="M24 14.5c2 0 3.8.7 5.2 2.1l3.9-3.9C30.6 10.3 27.5 9 24 9c-4.3 0-8 2.5-9.8 6.1l4.8 3.1c1.1-2.2 3.3-3.7 6-3.7z"/>
            </g>
          </svg>
          
    
          Sign in with Google
        </button>
        <button className={styles.socialBtn} onClick={() => handleOAuthLogin('github')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
            <path fill="#fff" d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.01c-3.2.7-3.87-1.54-3.87-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.75.41-1.27.75-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.12 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.68 5.41-5.24 5.7.42.36.8 1.08.8 2.18v3.24c0 .31.21.67.8.56C20.71 21.39 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5z"/>
          </svg>
          Sign in with GitHub
        </button>
        <button className={styles.socialBtn} onClick={() => handleOAuthLogin('microsoft')}>
          <svg width="22" height="22" viewBox="0 0 48 48" style={{ marginRight: 6 }}>
            <rect width="22" height="22" fill="#f25022"/>
            <rect y="24" width="22" height="22" fill="#7fba00"/>
            <rect x="24" width="22" height="22" fill="#00a4ef"/>
            <rect x="24" y="24" width="22" height="22" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>
        <button className={styles.socialBtn} onClick={() => handleOAuthLogin('apple')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
            <path fill="#fff" d="M16.365 1.43c0 1.14-.93 2.07-2.07 2.07-1.14 0-2.07-.93-2.07-2.07 0-1.14.93-2.07 2.07-2.07 1.14 0 2.07.93 2.07 2.07zm4.13 6.2c-1.13-1.36-2.81-1.36-3.53-1.36-.77 0-1.68.36-2.77.36-1.09 0-2.05-.36-2.77-.36-.72 0-2.4 0-3.53 1.36-1.23 1.48-1.02 4.28.97 7.12.8 1.22 1.87 2.59 3.23 2.59.64 0 .89-.23 1.67-.23.78 0 1.01.23 1.67.23 1.36 0 2.43-1.37 3.23-2.59 1.99-2.84 2.2-5.64.97-7.12z"/>
          </svg>
          Sign in with Apple
        </button>
        <hr className={styles.separator} />
        <form className={styles.form} onSubmit={handleEmailLogin}>
          {isSignUp && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              required
              onChange={e => setName(e.target.value)}
              className={styles.input}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={e => setEmail(e.target.value)}
            className={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={e => setPassword(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.submitBtn}>
            {isSignUp ? 'Sign Up with Email' : 'Sign In with Email'}
          </button>
        </form>
        {notification && (
          <div className={styles.notification}>
            {notification}
          </div>
        )}
        <button
          className={styles.switchBtn}
          onClick={() => setIsSignUp(s => !s)}
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}