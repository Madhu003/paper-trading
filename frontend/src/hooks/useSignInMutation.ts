import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { signIn, type SignInBody } from '@/api/auth';
import { setAuthToken } from '@/api/client';

export function useSignInMutation() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (body: SignInBody) => signIn(body),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      setAuthToken(data.token);
      toast.success('Signed in');
      navigate('/dashboard', { replace: true });
    },
  });
}
