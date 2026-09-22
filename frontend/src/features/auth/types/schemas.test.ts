import { describe, expect, it } from 'vitest'
import { loginSchema, signupSchema } from '@/features/auth/types/schemas'

describe('auth schemas', () => {
  it('requires a valid email and an 8+ character password to log in', () => {
    expect(loginSchema.safeParse({ email: 'owner@serviceos.demo', password: 'ServiceOS!Demo1' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'nope', password: 'short' }).success).toBe(false)
  })

  it('reports mismatched passwords on the confirm field', () => {
    const result = signupSchema.safeParse({
      fullName: 'Davit',
      restaurantName: 'Batumi Bistro',
      email: 'd@example.com',
      password: 'password123',
      confirmPassword: 'password124',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword'])
  })
})
