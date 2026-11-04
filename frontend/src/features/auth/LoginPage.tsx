import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { Surface } from '../../components/ui/Surface.tsx'
import { Wordmark } from '../../components/ui/Wordmark.tsx'
import { api, errorMessage, session } from '../../lib/api-client.ts'
import type { TokenResponse } from '../../types/api.ts'

const schema = z.object({
  email: z.email('Enter the email you sign in with.'),
  password: z.string().min(1, 'Enter your password.'),
})

type Credentials = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ resolver: zodResolver(schema) })

  if (session.get()) return <Navigate to="/" replace />

  const signIn = handleSubmit(async (credentials) => {
    setServerError(null)
    try {
      const { data } = await api.post<TokenResponse>('/auth/login', credentials)
      session.set(data.access_token)
      navigate('/', { replace: true })
    } catch (error) {
      setServerError(errorMessage(error))
    }
  })

  return (
    <Surface className="grid min-h-dvh place-items-center px-5 py-12">
      <main className="w-full max-w-sm">
        <Wordmark className="text-[1.75rem]" />
        <h1 className="mt-12 text-[1.75rem] font-bold tracking-[-0.02em]">Sign in</h1>
        <p className="mt-1 text-fg-muted">Owner account only.</p>
        <form onSubmit={signIn} noValidate className="mt-8 flex flex-col gap-5">
          <TextField label="Email" type="email" autoComplete="username" error={errors.email?.message} {...register('email')} />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {serverError && (
            <p role="alert" className="flex items-start gap-1.5 text-[0.8125rem] text-led">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {serverError}
            </p>
          )}
          <Button variant="primary" type="submit" loading={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? 'Signing in' : 'Sign in'}
          </Button>
        </form>
      </main>
    </Surface>
  )
}
