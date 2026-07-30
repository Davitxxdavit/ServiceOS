import { LoginForm } from '@/features/auth/components/LoginForm'
import { SignupForm } from '@/features/auth/components/SignupForm'
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm'
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function LoginPage() {
  return <LoginForm />
}

export function SignupPage() {
  return <SignupForm />
}

export function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}

export function ResetPasswordPage() {
  return <ResetPasswordForm />
}

export function VerifyEmailPage() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
      <p className="text-sm text-muted-foreground">
        We sent a verification link. Open it to activate your account, then sign in.
      </p>
      <Link to="/login">
        <Button>Back to sign in</Button>
      </Link>
    </div>
  )
}
