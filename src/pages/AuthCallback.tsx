import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session after OAuth or email confirmation
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          toast.error('Authentication failed');
          navigate('/auth');
          return;
        }

        if (session) {
          toast.success('Successfully signed in!');
          navigate('/dashboard');
        } else {
          // Check for error parameters in URL
          const params = new URLSearchParams(window.location.search);
          const errorParam = params.get('error');
          const errorDescription = params.get('error_description');
          
          if (errorParam) {
            toast.error(errorDescription || 'Authentication failed');
            navigate('/auth');
          } else {
            // Maybe it's an email confirmation
            toast.success('Email confirmed! You can now sign in.');
            navigate('/auth');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        toast.error('Something went wrong');
        navigate('/auth');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}