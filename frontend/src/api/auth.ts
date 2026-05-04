import { api } from '@/api/client';

export type SignInBody = {
  email: string;
  password: string;
};

export type SignInResponse = {
  token: string;
  user: { id: string; username: string; email: string; balance?: number };
};

export type SignUpBody = {
  username: string;
  email: string;
  password: string;
};

export type SignUpResponse = {
  token: string;
  user: { id: string; username: string; email: string };
};

export async function signIn(body: SignInBody): Promise<SignInResponse> {
  const { data } = await api.post<SignInResponse>('/auth/signin', body);
  return data;
}

export async function signUp(body: SignUpBody): Promise<SignUpResponse> {
  const { data } = await api.post<SignUpResponse>('/auth/signup', body);
  return data;
}
