'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Tag } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [factorId, setFactorId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) { setError(err.message); setLoading(false); return; }

    // Check MFA
    const { data: mfaData } = await supabase.auth.mfa.listFactors();
    const totp = mfaData?.totp?.[0];

    if (totp && totp.status === 'verified') {
      setFactorId(totp.id);
      setStep('mfa');
      setLoading(false);
      return;
    }

    // Check if admin
    const userId = data.user?.id;
    if (!userId) { setError('Login failed'); setLoading(false); return; }

    const { data: adminCheck } = await supabase.from('admin_users').select('id').eq('id', userId).single();
    if (!adminCheck) { setError('Not authorised as admin'); await supabase.auth.signOut(); setLoading(false); return; }

    router.push('/admin/dashboard');
  };

  const handleMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: totpCode });
    if (err) { setError(err.message); setLoading(false); return; }

    router.push('/admin/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-brand-border p-8 w-full max-w-sm shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-lg">Admin Login</h1>
            <p className="text-xs text-brand-muted">I&apos;m Broke Dashboard</p>
          </div>
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-brand-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-brand-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMFA} className="space-y-4">
            <p className="text-sm text-brand-muted">Enter the 6-digit code from your authenticator app.</p>
            <div>
              <label className="block text-sm font-medium mb-1">Authentication Code</label>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                maxLength={6}
                placeholder="000000"
                required
                className="w-full border border-brand-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary tracking-widest text-center text-lg"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
