/**
 * Phone login through Firebase (API DECISIONS #78), on when EXPO_PUBLIC_PHONE_AUTH=firebase:
 * Firebase sends and checks the code, and the API turns Firebase's ID token into our session.
 */
import * as firebase from '@react-native-firebase/auth';

jest.mock('expo-secure-store', () => require('../../../support/inMemorySecureStore'));

import { sendOtp } from '@/features/auth/api/requestOtp';
import { verifyOtp } from '@/features/auth/api/verifyOtp';

const PHONE = '+5511999990000';
const TOKENS = { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 900, userId: 'u1', isNewUser: true };

beforeEach(() => {
  process.env.EXPO_PUBLIC_PHONE_AUTH = 'firebase';
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_PHONE_AUTH;
});

describe('Firebase phone login', () => {
  it('sends the code with Firebase and logs in with its ID token', async () => {
    const confirm = jest.fn(async () => ({ user: { uid: 'fb' } }));
    (firebase.signInWithPhoneNumber as jest.Mock).mockResolvedValue({ confirm });
    (firebase.getIdToken as jest.Mock).mockResolvedValue('firebase-id-token');
    const fetchMock = jest.fn(async () => new Response(JSON.stringify(TOKENS), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await sendOtp(PHONE);
    expect(firebase.signInWithPhoneNumber).toHaveBeenCalledWith(expect.anything(), PHONE);
    expect(fetchMock).not.toHaveBeenCalled();

    const result = await verifyOtp({ phone: PHONE, code: '123456' });

    expect(confirm).toHaveBeenCalledWith('123456');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/v1/auth/login/firebase-phone');
    expect(JSON.parse(String(init.body))).toEqual({ idToken: 'firebase-id-token' });
    expect(firebase.signOut).toHaveBeenCalled();
    expect(result.user.id).toBe('u1');
  });

  it('logs in when Android already verified the number by itself and the code is spent', async () => {
    const confirm = jest.fn(async () => {
      throw Object.assign(new Error('expired'), { code: 'auth/session-expired' });
    });
    const autoUser = { uid: 'fb', phoneNumber: PHONE };
    (firebase.signInWithPhoneNumber as jest.Mock).mockResolvedValue({ confirm });
    (firebase.getAuth as jest.Mock).mockReturnValue({ currentUser: autoUser });
    (firebase.getIdToken as jest.Mock).mockResolvedValue('firebase-id-token');
    const fetchMock = jest.fn(async () => new Response(JSON.stringify(TOKENS), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await sendOtp(PHONE);
      const result = await verifyOtp({ phone: PHONE, code: '123456' });

      expect(firebase.getIdToken).toHaveBeenCalledWith(autoUser, true);
      expect(JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({
        idToken: 'firebase-id-token',
      });
      expect(result.user.id).toBe('u1');
    } finally {
      (firebase.getAuth as jest.Mock).mockReturnValue({});
    }
  });

  it('keeps "O código expirou" when Firebase is signed in with another number', async () => {
    const confirm = jest.fn(async () => {
      throw Object.assign(new Error('expired'), { code: 'auth/session-expired' });
    });
    (firebase.signInWithPhoneNumber as jest.Mock).mockResolvedValue({ confirm });
    (firebase.getAuth as jest.Mock).mockReturnValue({ currentUser: { uid: 'x', phoneNumber: '+5511888880000' } });
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await sendOtp(PHONE);
      await expect(verifyOtp({ phone: PHONE, code: '123456' })).rejects.toThrow('O código expirou');
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      (firebase.getAuth as jest.Mock).mockReturnValue({});
    }
  });

  it('shows a wrong code as "Código inválido" without calling the API', async () => {
    const confirm = jest.fn(async () => {
      throw Object.assign(new Error('bad'), { code: 'auth/invalid-verification-code' });
    });
    (firebase.signInWithPhoneNumber as jest.Mock).mockResolvedValue({ confirm });
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await sendOtp(PHONE);
    await expect(verifyOtp({ phone: PHONE, code: '000000' })).rejects.toThrow('Código inválido');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains an SMS blocked by the Firebase region policy', async () => {
    (firebase.signInWithPhoneNumber as jest.Mock).mockRejectedValue(
      Object.assign(new Error('region'), { code: 'auth/operation-not-allowed' }),
    );

    await expect(sendOtp(PHONE)).rejects.toThrow('O envio de SMS para este número não está liberado');
  });

  it('without the flag the code goes through the API, as before', async () => {
    delete process.env.EXPO_PUBLIC_PHONE_AUTH;
    const fetchMock = jest.fn(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    (firebase.signInWithPhoneNumber as jest.Mock).mockClear();

    await sendOtp(PHONE);

    expect(firebase.signInWithPhoneNumber).not.toHaveBeenCalled();
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toContain('/api/v1/auth/login/sms-otp');
  });
});
