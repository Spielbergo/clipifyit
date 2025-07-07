import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LogInOptions() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        // Sign up with email and password
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } }
        });
        if (error) throw error;
        // Insert into profiles table if you want to store more info
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

  return (
    <div style={{ maxWidth: 320, margin: '0 auto', textAlign: 'center' }}>
      <button
        onClick={handleGoogleLogin}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: 12,
          background: '#6599a6',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontWeight: 600,
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        Sign in with Google
      </button>
      <form onSubmit={handleEmailLogin} style={{ marginBottom: 8 }}>
        {isSignUp && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            required
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            background: '#222',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          {isSignUp ? 'Sign Up with Email' : 'Sign In with Email'}
        </button>
      </form>
      <button
        style={{
          background: 'none',
          border: 'none',
          color: '#6599a6',
          cursor: 'pointer',
          marginTop: 4,
          fontSize: 15,
        }}
        onClick={() => setIsSignUp(s => !s)}
      >
        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </div>
  );
}