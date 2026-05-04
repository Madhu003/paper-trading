import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { signUp, type SignUpBody } from '@/api/auth';
import { setAuthToken } from '@/api/client';

export function useSignUpMutation() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (body: SignUpBody) => signUp(body),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      setAuthToken(data.token);
      toast.success('Account created — you are signed in');
      navigate('/dashboard', { replace: true });
    },
  });
}
