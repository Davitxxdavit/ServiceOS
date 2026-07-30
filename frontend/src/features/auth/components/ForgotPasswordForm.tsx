import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/types/schemas'
import { requestPasswordReset } from '@/features/auth/services/auth-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await requestPasswordReset(values.email)
      toast.success('Reset link sent if that email exists')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send reset email')
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">We will email you a secure reset link.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
