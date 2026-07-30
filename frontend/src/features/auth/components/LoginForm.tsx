import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { loginSchema, type LoginInput } from '@/features/auth/types/schemas'
import { signIn } from '@/features/auth/services/auth-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_NAME } from '@/lib/constants'

export function LoginForm() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn(values)
      toast.success('Welcome back')
      navigate('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign in')
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to {APP_NAME}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Run your floor from one calm workspace.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link to="/forgot-password" className="text-xs text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New restaurant?{' '}
        <Link to="/signup" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  )
}
