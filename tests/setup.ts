// Jest global setup — runs before each test file

// Silence console.error from SplashScreen __DEV__ branches during tests
// (they log routing events intentionally, but clutter test output)
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});
