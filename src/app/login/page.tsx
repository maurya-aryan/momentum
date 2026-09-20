'use client';

import { useState } from 'react';
import { createClient } from '@/lib/db/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <main className="max-w-sm mx-auto px-4 py-24">
      <h1 className="text-2xl font-bold mb-2">Momentum</h1>
      <p className="text-sm text-neutral-500 mb-6">
        No password. We&apos;ll email you a sign-in link.
      </p>

      {sent ? (
        <p className="text-sm rounded-lg p-4" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          Check <strong>{email}</strong> for a sign-in link.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-green-600 text-white disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send sign-in link'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}
    </main>
  );
}
