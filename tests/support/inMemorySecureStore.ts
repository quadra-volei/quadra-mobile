// In-memory stand-in for expo-secure-store, for tests that exercise the real
// token storage code paths. Use it as a jest.mock factory:
//
//   jest.mock('expo-secure-store', () =>
//     require('../../../support/inMemorySecureStore'),
//   );
//
// (It lives outside tests/__mocks__ on purpose: requiring a file from a
// `__mocks__` folder named after the module it replaces makes Jest recurse.)
const store = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return store.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
}

/** Test helper: empties the store between tests. */
export function __reset(): void {
  store.clear();
}
