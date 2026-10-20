import { getAuth, getIdToken, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';

/**
 * Firebase Phone Auth (API DECISIONS #78): Firebase sends the SMS and checks the code; the app
 * then hands Firebase's ID token to the API, which logs the phone in. Firebase's own session
 * is not kept: the API session is the only one.
 *
 * On when the build sets EXPO_PUBLIC_PHONE_AUTH=firebase; otherwise the code goes through the
 * API (`login/sms-otp`, the fixed test code on the test environment).
 */
export function usesFirebasePhone(): boolean {
  return process.env.EXPO_PUBLIC_PHONE_AUTH === 'firebase';
}

// The code sent to a number, waiting for the user to type it (one at a time).
let pending: { phone: string; confirmation: Awaited<ReturnType<typeof signInWithPhoneNumber>> } | null = null;

/** Sends (or resends) the SMS code to `phone` through Firebase. */
export async function sendFirebaseCode(phone: string): Promise<void> {
  const confirmation = await signInWithPhoneNumber(getAuth(), phone);
  pending = { phone, confirmation };
}

/** Checks the typed code with Firebase and returns its ID token for the API. */
export async function confirmFirebaseCode(phone: string, code: string): Promise<string> {
  if (!pending || pending.phone !== phone) {
    throw Object.assign(new Error('No code was sent to this number.'), { code: 'auth/session-expired' });
  }

  const credential = await pending.confirmation.confirm(code);
  if (!credential?.user) {
    throw Object.assign(new Error('Firebase did not sign in.'), { code: 'auth/session-expired' });
  }

  const idToken = await getIdToken(credential.user, true);
  pending = null;
  await signOut(getAuth()).catch(() => undefined);
  return idToken;
}

/** A Firebase error as the message the login screens show. */
export function firebaseAuthMessage(error: unknown, fallback: string): Error {
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/invalid-verification-code':
      return new Error('Código inválido');
    case 'auth/session-expired':
    case 'auth/code-expired':
      return new Error('O código expirou. Peça um novo.');
    case 'auth/invalid-phone-number':
      return new Error('Este número não pode receber SMS.');
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return new Error('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
    case 'auth/operation-not-allowed':
      // Phone provider off or the number's country blocked in Firebase's SMS region policy.
      return new Error('O envio de SMS para este número não está liberado. Tente mais tarde.');
    case 'auth/network-request-failed':
      return new Error('Sem conexão. Verifique sua internet e tente de novo.');
    default:
      return new Error(fallback);
  }
}
