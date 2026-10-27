import { apiPath, http } from '@/lib/http'

import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  Me,
  ResetPasswordRequest,
  Session,
  TokenRequest,
} from '../types'

// Signing in and out, and the signed-in user's own account (/me). The
// refresh lives in lib/http.ts, which keeps the token.

export function login(body: LoginRequest): Promise<Session> {
  return http.post<Session>(apiPath('/auth/login'), body)
}

/** Ends the session on the server, which clears the refresh cookie too. */
export function logout(): Promise<void> {
  return http.post(apiPath('/auth/logout'))
}

export function forgotPassword(body: ForgotPasswordRequest): Promise<void> {
  return http.post(apiPath('/auth/password/forgot'), body)
}

export function resetPassword(body: ResetPasswordRequest): Promise<void> {
  return http.post(apiPath('/auth/password/reset'), body)
}

export function verifyEmail(body: TokenRequest): Promise<void> {
  return http.post(apiPath('/auth/email/verify'), body)
}

export function getMe(): Promise<Me> {
  return http.get<Me>(apiPath('/me'))
}

/** The user's other sessions end; this one stays. */
export function changePassword(body: ChangePasswordRequest): Promise<void> {
  return http.put(apiPath('/me/password'), body)
}
