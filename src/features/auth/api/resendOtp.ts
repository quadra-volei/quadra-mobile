import { useMutation } from '@tanstack/react-query';

import { sendOtp } from '@/features/auth/api/requestOtp';

export type ResendOtpInput = {
  /** Full phone number in E.164 form, e.g. "+5511999999999". */
  phone: string;
};

export type ResendOtpResult = {
  ok: true;
};

/**
 * Resends the SMS OTP for the given phone number. The backend has no dedicated
 * resend route: starting the verification again for the same number resends the
 * code. Kept as its own hook so S3 tracks the resend's pending state separately
 * from the initial request.
 */
export function useResendOtp() {
  return useMutation<ResendOtpResult, Error, ResendOtpInput>({
    mutationFn: (input) => sendOtp(input.phone),
  });
}
