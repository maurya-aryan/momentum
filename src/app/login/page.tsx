'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';

const inputStyle = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-24">
      <h1 className="text-2xl font-bold mb-2">Momentum</h1>
      <p className="text-sm text-neutral-500 mb-6">
        No password. We&apos;ll email you a 6-digit code.
      </p>

      {!sent ? (
        <form onSubmit={handleSendCode} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-green-600 text-white disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send code'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-3">
          <p className="text-sm rounded-lg p-4" style={inputStyle}>
            Sent a 6-digit code to <strong>{email}</strong>. Enter it below
            (check spam if it&apos;s not there in a minute).
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            required
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-center text-lg tracking-widest"
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-green-600 text-white disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Sign in'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode('');
              setError(null);
            }}
            className="w-full text-xs text-neutral-500 underline"
          >
            Use a different email
          </button>
        </form>
      )}
    </main>
  );
}
