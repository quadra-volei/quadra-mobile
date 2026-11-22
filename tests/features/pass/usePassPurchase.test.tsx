import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import type { SeasonPass } from '@/features/pass/api/seasonPass';

import { seasonPassFixture } from '../../support/seasonPass';

const mockIap = {
  connected: true,
  products: [{ id: 'passe_t1', displayPrice: 'R$ 9,90' }],
  availablePurchases: [] as unknown[],
  fetchProducts: jest.fn(async () => undefined),
  getAvailablePurchases: jest.fn(async () => undefined),
  requestPurchase: jest.fn(async () => null),
  finishTransaction: jest.fn(async () => undefined),
};
let mockOptions: { onPurchaseSuccess?: (p: unknown) => void; onPurchaseError?: (e: unknown) => void } = {};
jest.mock('expo-iap', () => ({
  ErrorCode: { UserCancelled: 'user-cancelled', AlreadyOwned: 'already-owned' },
  useIAP: (options: typeof mockOptions) => {
    mockOptions = options;
    return mockIap;
  },
}));
const mockApi = jest.fn();
jest.mock('@/lib/api/authorizedClient', () => ({ authorizedApiClient: (...args: unknown[]) => mockApi(...args) }));

import { usePassPurchase } from '@/features/pass/billing/usePassPurchase';
import { ApiError } from '@/lib/api/client';

const onSale = (): SeasonPass => ({ ...seasonPassFixture(5), premium: false, productId: 'passe_t1', purchaseAccountTag: 'tag-da-conta' });
const purchase = (state = 'purchased') => ({ id: 'GPA.1', productId: 'passe_t1', purchaseToken: 'tok-1', purchaseState: state });

async function setup(pass: SeasonPass) {
  const onMessage = jest.fn();
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = await renderHook(() => usePassPurchase(pass, onMessage), { wrapper });
  return { ...hook, onMessage };
}

beforeEach(() => {
  Platform.OS = 'android'; // Play Billing is Android only
  jest.clearAllMocks();
  mockIap.availablePurchases = [];
});

describe('usePassPurchase (DECISIONS #204)', () => {
  it('offers Google\'s price and opens the purchase tied to the account', async () => {
    const { result } = await setup(onSale());

    expect(result.current.state).toEqual({ kind: 'ready', price: 'R$ 9,90' });
    await act(async () => result.current.buy());
    expect(mockIap.requestPurchase).toHaveBeenCalledWith({
      request: { google: { skus: ['passe_t1'], obfuscatedAccountId: 'tag-da-conta' } },
      type: 'in-app',
    });
  });

  it('opens the pass only after the API confirms the purchase, then finishes it', async () => {
    mockApi.mockResolvedValue({ status: 'Active', season: 'T1' });
    const { onMessage } = await setup(onSale());

    await act(async () => mockOptions.onPurchaseSuccess?.(purchase()));

    expect(mockApi).toHaveBeenCalledWith('/api/v1/season-pass/purchases', {
      method: 'POST',
      body: JSON.stringify({ productId: 'passe_t1', purchaseToken: 'tok-1' }),
    });
    await waitFor(() => expect(mockIap.finishTransaction).toHaveBeenCalledWith({ purchase: purchase(), isConsumable: false }));
    expect(onMessage).toHaveBeenCalledWith('Passe liberado', expect.any(String));
  });

  it('does not finish a purchase the API refused', async () => {
    mockApi.mockRejectedValue(new ApiError(409, 'Conflict', null));
    const { onMessage } = await setup(onSale());

    await act(async () => mockOptions.onPurchaseSuccess?.(purchase()));

    await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Compra de outra conta', expect.any(String)));
    expect(mockIap.finishTransaction).not.toHaveBeenCalled();
  });

  it('waits for a slow payment without asking the API', async () => {
    const { result } = await setup(onSale());

    await act(async () => mockOptions.onPurchaseSuccess?.(purchase('pending')));

    expect(result.current.state).toEqual({ kind: 'pending' });
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('stays quiet when the player cancels Google\'s sheet', async () => {
    const { onMessage } = await setup(onSale());

    await act(async () => mockOptions.onPurchaseError?.({ code: 'user-cancelled', message: '' }));

    expect(onMessage).not.toHaveBeenCalled();
  });

  it('has nothing to sell when the API offers no product', async () => {
    const { result } = await setup({ ...onSale(), productId: null, purchaseAccountTag: null });

    expect(result.current.state).toEqual({ kind: 'unavailable' });
    expect(mockIap.fetchProducts).not.toHaveBeenCalled();
  });
});
