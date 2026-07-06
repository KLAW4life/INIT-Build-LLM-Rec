import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, type FormEvent, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();

  // Get mode from URL state or default to signin
  const [mode, setMode] = useState<'signin' | 'signup'>(() => {
    const state = location.state as { mode?: 'signin' | 'signup' | 'demo' };
    return state?.mode === 'signup' ? 'signup' : 'signin';
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);

  // Auto-redirect if already signed in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [loading, user, navigate]);

  // Handle demo mode from navigation state
  useEffect(() => {
    const state = location.state as { mode?: 'signin' | 'signup' | 'demo' };
    if (state?.mode === 'demo' && !busy && !user) {
      handleDemoSignIn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, displayName);
        // If email confirmation is enabled, show message
        // User will need to confirm email before accessing dashboard
        const state = location.state as { mode?: string };
        if (state?.mode !== 'demo') {
          toast.success('Account created! Please check your email to confirm.');
        }
        // If session exists, user is already logged in (email confirmation disabled)
        if (user) {
          navigate('/dashboard');
        }
      } else {
        await signIn(email, password);
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setBusy(true);
    try {
      await signInWithGoogle();
      // User will be redirected to Google, then back to the callback
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed');
      setBusy(false);
    }
  }

  async function handleDemoSignIn() {
    setBusy(true);
    try {
      const demoEmail = 'demo@hubwise.com';
      const demoPassword = 'Demo123!';
      
      // Try to sign in with demo credentials
      try {
        await signIn(demoEmail, demoPassword);
        toast.success('Welcome to the demo!');
        navigate('/dashboard');
      } catch (signInError) {
        // If demo user doesn't exist, create it
        try {
          await signUp(demoEmail, demoPassword, 'Demo User');
          // Wait a moment for the user to be created
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Then sign in again
          await signIn(demoEmail, demoPassword);
          toast.success('Welcome to the demo!');
          navigate('/dashboard');
        } catch (signUpError) {
          throw new Error('Could not create or sign in to demo account');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Demo sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Left panel — brand */}
        <div className="hidden flex-col justify-between border-r border-border/60 bg-accent/40 p-10 lg:flex">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="font-serif text-xl">BuildHub</span>
          </Link>
          <div>
            <h2 className="font-serif text-5xl leading-tight">
              A calm place to run <em className="text-primary">your team's applications.</em>
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Hubs, invites, forms, and matching — designed for small groups that want structure without bloat.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">© BuildHub</p>
        </div>

        {/* Right panel — form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary" />
                <span className="font-serif text-lg">BuildHub</span>
              </Link>
            </div>

            <h1 className="font-serif text-4xl">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === 'signup'
                ? 'Start a hub and invite your team.'
                : 'Sign in to your hub.'}
            </p>

            <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
              {mode === 'signup' && (
                <div>
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
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
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                />
              </div>
              {mode === 'signin' && (
                <div className="text-right">
                  <Link 
                    to="/auth/reset-password" 
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={busy || loading}>
                {busy || loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              or
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleSignIn} 
                disabled={busy || loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={handleDemoSignIn} 
                disabled={busy || loading}
              >
                Try the demo hub
              </Button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              >
                {mode === 'signup' ? 'Sign in' : 'Create account'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}