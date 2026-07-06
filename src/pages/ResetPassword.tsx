import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { resetPassword, updatePassword } = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Check if we're in the reset flow (with token in URL)
  const isResetFlow = window.location.search.includes('token=');

  async function handleResetRequest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await resetPassword(email);
      setEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordUpdate(e: FormEvent) {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setBusy(true);
    try {
      await updatePassword(newPassword);
      toast.success('Password updated successfully!');
      navigate('/auth');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="font-serif text-xl">Hubwise</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-serif text-3xl">
            {isResetFlow ? 'Set new password' : emailSent ? 'Check your email' : 'Reset password'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isResetFlow 
              ? 'Enter your new password below.'
              : emailSent 
                ? `We've sent a password reset link to ${email}`
                : 'We\'ll send you a link to reset your password.'}
          </p>

          {isResetFlow ? (
            // Password update form (when user clicks reset link)
            <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          ) : emailSent ? (
            // Email sent confirmation
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-primary/10 p-4 text-sm text-primary">
                Click the link in the email to reset your password. If you don't see it, check your spam folder.
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/auth')}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            // Email request form
            <form onSubmit={handleResetRequest} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Sending...' : 'Send reset link'}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/auth')}
              >
                Back to sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}