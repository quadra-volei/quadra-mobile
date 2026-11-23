import * as Sentry from '@sentry/react-native';

import { firebaseAuthMessage } from '@/features/auth/api/firebasePhone';

jest.mock('@react-native-firebase/auth', () => ({}));
jest.mock('@sentry/react-native', () => ({ captureMessage: jest.fn() }));

describe('firebaseAuthMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('explica um erro conhecido sem mandar para o Sentry', () => {
    expect(firebaseAuthMessage({ code: 'auth/too-many-requests' }, 'Falhou').message).toMatch(/Muitas tentativas/);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('mostra o código de um erro desconhecido e manda só o código para o Sentry', () => {
    const error = firebaseAuthMessage({ code: 'auth/app-not-authorized', message: '+5511999999999' }, 'Falhou');
    expect(error.message).toBe('Falhou (auth/app-not-authorized)');
    expect(Sentry.captureMessage).toHaveBeenCalledWith('firebase phone auth: auth/app-not-authorized', {
      level: 'error',
      tags: { firebase_code: 'auth/app-not-authorized' },
    });
  });
});
