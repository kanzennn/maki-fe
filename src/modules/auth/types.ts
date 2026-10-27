import type { components } from '@/lib/api-schema'

/** The signed-in user, as GET /me and a session return them. */
export type Me = components['schemas']['Me']

/** What signing in and refreshing return: the access token, and the user it is for. */
export type Session = components['schemas']['Session']

export type LoginRequest = components['schemas']['LoginRequest']
export type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest']
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest']
export type TokenRequest = components['schemas']['TokenRequest']
export type ChangePasswordRequest = components['schemas']['ChangePasswordRequest']

/** The sign-in form, as typed. */
export type LoginValues = { username: string; password: string }

/** The forgotten-password form: a username or an email. */
export type ForgotPasswordValues = { login: string }

/** A new password, typed twice: setting one from an emailed link. */
export type NewPasswordValues = { password: string; confirm: string }

/** Changing one's own password: the current one, then the new one twice. */
export type ChangePasswordValues = { current: string; password: string; confirm: string }
