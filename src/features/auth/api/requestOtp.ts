import { useMutation } from '@tanstack/react-query';

import { toAuthError } from '@/features/auth/api/session';
import { apiClient } from '@/lib/api/client';

export type RequestOtpInput = {
  /** Full phone number in E.164 form, e.g. "+5511999999999". */
  phone: string;
};

export type RequestOtpResult = {
  ok: true;
};

/**
 * Asks the backend to send a 6-digit SMS code to `phone`
 * (POST /api/v1/auth/login/sms-otp, step "initiate"). Works for any number —
 * there is no separate signup; the account is created when the code is verified.
 * Calling it again resends the code.
 */
export async function sendOtp(phone: string): Promise<RequestOtpResult> {
  try {
    await apiClient<unknown>('/api/v1/auth/login/sms-otp', {
      method: 'POST',
      body: JSON.stringify({ step: 'initiate', phoneNumber: phone }),
    });
    return { ok: true };
  } catch (error) {
    throw toAuthError(error, 'Não foi possível enviar o código.');
  }
}

export function useRequestOtp() {
  return useMutation<RequestOtpResult, Error, RequestOtpInput>({
    mutationFn: (input) => sendOtp(input.phone),
  });
}
