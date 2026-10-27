// Jest global setup — runs before each test file

// Silence console.error from SplashScreen __DEV__ branches during tests
// (they log routing events intentionally, but clutter test output)
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// AsyncStorage is native: the package's in-memory mock, for stores persisted
// through it (theme, notification prefs, the tour's "seen" record).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-notifications is native (push): a quiet stand-in keeps screens that import it testable.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { DEFAULT: 3 },
}));

// expo-image-manipulator is native (photo shrink before upload): a 1000×800
// image saved back under the same uri, so upload tests see the picked file.
jest.mock('expo-image-manipulator', () => {
  type MockCtx = { resize: () => MockCtx; renderAsync: () => Promise<object> };
  const context = (uri: string) => {
    const ctx: MockCtx = {
      resize: jest.fn(() => ctx),
      renderAsync: jest.fn(async () => ({
        width: 1000,
        height: 800,
        saveAsync: jest.fn(async () => ({ uri, width: 1000, height: 800 })),
      })),
    };
    return ctx;
  };
  return {
    ImageManipulator: { manipulate: jest.fn(context) },
    SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
  };
});

// React Native Firebase is native (phone login): a stand-in the auth tests can drive.
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signInWithPhoneNumber: jest.fn(),
  getIdToken: jest.fn(),
  signOut: jest.fn(async () => undefined),
}));
