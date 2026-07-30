import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { signupSchema, type SignupInput } from '@/features/auth/types/schemas'
import { signUp } from '@/features/auth/services/auth-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignupForm() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await signUp(values)
      if (result.session) {
        toast.success('Account created')
        navigate('/')
      } else {
        toast.success('Check your email to verify your account')
        navigate('/verify-email')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign up')
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">Owner account + restaurant in one step.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Your name</Label>
        <Input id="fullName" {...register('fullName')} />
        {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="restaurantName">Restaurant name</Label>
        <Input id="restaurantName" {...register('restaurantName')} />
        {errors.restaurantName ? (
          <p className="text-xs text-destructive">{errors.restaurantName.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          ) : null}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
