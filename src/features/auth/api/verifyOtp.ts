import { useMutation } from '@tanstack/react-query';

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
async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  let tokens: AuthTokensResponse;
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
