import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api, setAuthToken } from '@/lib/api'

type SignUpVars = { username: string; email: string; password: string }

type SignUpResponse = {
  token: string
  user: { id: string; username: string; email: string }
}

export function SignUp() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(
    () => username.trim().length >= 3 && email.trim() && password.trim().length >= 6,
    [username, email, password],
  )

  const signUp = useMutation({
    mutationFn: async (vars: SignUpVars) => {
      const { data } = await api.post<SignUpResponse>('/auth/signup', vars)
      return data
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token)
      setAuthToken(data.token)
      navigate('/dashboard', { replace: true })
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Sign up failed')
        return
      }
      setError('Sign up failed')
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    signUp.mutate({ username, email, password })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-6 text-2xl font-bold tracking-tight text-primary">Paper</div>
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Registers in MongoDB via the API.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                placeholder="trader"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="min 6 chars"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={signUp.isPending || !canSubmit}>
              {signUp.isPending ? 'Creating…' : 'Create account'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
