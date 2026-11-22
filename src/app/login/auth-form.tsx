'use client';

import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';

export default function AuthForm({ registrationEnabled }: { registrationEnabled: boolean }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);

    try {
      if (mode === 'register') {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, isAdult }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo crear la cuenta.');
        setMode('login');
        setPassword('');
        setMessage('Si la cuenta se pudo crear, ya podés iniciar sesión. Si ya existía, iniciá sesión con tu contraseña.');
        setBusy(false);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        redirectTo: '/dashboard',
      });

      if (result?.error) throw new Error('Correo o contraseña incorrectos.');
      window.location.assign('/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocurrió un error. Intentá nuevamente.');
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {mode === 'register' && (
        <label>Nombre
          <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
        </label>
      )}
      <label>Correo electrónico
        <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
      </label>
      <label>Contraseña
        <input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === 'register' ? 12 : 1} maxLength={72} />
        {mode === 'register' && <small>Mínimo 12 caracteres.</small>}
      </label>
      {mode === 'register' && (
        <label className="auth-check">
          <input type="checkbox" checked={isAdult} onChange={(event) => setIsAdult(event.target.checked)} required />
          Confirmo que tengo 18 años o más.
        </label>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-success" role="status">{message}</p>}
      <button className="button auth-submit" type="submit" disabled={busy}>
        {busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </button>
      {registrationEnabled && <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }}>
        {mode === 'login' ? 'Crear una cuenta' : 'Ya tengo una cuenta'}
      </button>}
    </form>
  );
}