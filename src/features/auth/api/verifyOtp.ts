import { useMutation } from '@tanstack/react-query';

import { confirmFirebaseCode, firebaseAuthMessage, usesFirebasePhone } from '@/features/auth/api/firebasePhone';
import {
  type AuthResult,
  type AuthSession,
  type AuthTokensResponse,
  type AuthUser,
  completeLogin,
  toAuthError,
} from '@/features/auth/api/session';
import { apiClient } from '@/lib/api/client';

export type VerifyOtpInput = {
  /** Full phone number in E.164 form, e.g. "+5511999999999". */
  phone: string;
  /** The 6-digit code entered by the user. */
  code: string;
};

export type VerifyOtpSession = AuthSession;
export type VerifyOtpUser = AuthUser;
export type VerifyOtpResult = AuthResult;

/**
 * Verifies the SMS OTP (POST /api/v1/auth/login/sms-otp, step "verify"). A valid
 * code logs the phone number in — creating its account on first use — and the
 * returned tokens are persisted to expo-secure-store. A wrong or expired code
 * rejects with `new Error('Código inválido')`.
 */
export async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  let tokens: AuthTokensResponse;
  if (usesFirebasePhone()) {
    // Firebase checks the code; the API turns its ID token into our session (API DECISIONS #78).
    let idToken: string;
    try {
      idToken = await confirmFirebaseCode(input.phone, input.code);
    } catch (error) {
      throw firebaseAuthMessage(error, 'Não foi possível verificar o código.');
    }
    try {
      tokens = await apiClient<AuthTokensResponse>('/api/v1/auth/login/firebase-phone', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
    } catch (error) {
      throw toAuthError(error, 'Não foi possível entrar. Tente novamente.');
    }
    return completeLogin(tokens);
  }

  try {
    tokens = await apiClient<AuthTokensResponse>('/api/v1/auth/login/sms-otp', {
      method: 'POST',
      body: JSON.stringify({
        step: 'verify',
        phoneNumber: input.phone,
        code: input.code,
      }),
    });
  } catch (error) {
    throw toAuthError(
      error,
      'Não foi possível verificar o código.',
      'Código inválido',
    );
  }
  return completeLogin(tokens);
}

export function useVerifyOtp() {
  return useMutation<VerifyOtpResult, Error, VerifyOtpInput>({
    mutationFn: verifyOtp,
  });
}
