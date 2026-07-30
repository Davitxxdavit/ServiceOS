import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/types/schemas'
import { updatePassword } from '@/features/auth/services/auth-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ResetPasswordForm() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updatePassword(values.password)
      toast.success('Password updated')
      navigate('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update password')
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
        {errors.confirmPassword ? (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  )
}
