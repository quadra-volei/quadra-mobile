import { useQueryClient } from '@tanstack/react-query';
import { ErrorCode, useIAP, type Purchase } from 'expo-iap';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

import { seasonPassQueryKey, type SeasonPass } from '../api/seasonPass';

// Season pass bought on Google Play (quadra-api DECISIONS #109, app DECISIONS
// #204). The API names the product and the account tag in `GET season-pass`;
// the app opens Google's purchase sheet, then sends the purchase token to
// `POST season-pass/purchases`, where the API asks Google whether it is real,
// paid and made for this account, and acknowledges it. Only then does the app
// finish the transaction and reload the pass: the app never decides on its own
// that the pass is paid. The price shown is Google's, in the player's currency.

export type PassPurchaseState =
  /** No product on sale (billing off, iOS, or already bought): nothing to buy. */
  | { kind: 'unavailable' }
  /** Talking to Google Play or the API. */
  | { kind: 'loading' }
  /** Ready to buy; `price` is Google's formatted price ("R$ 9,90"). */
  | { kind: 'ready'; price: string }
  /** Paid with a slow method (boleto): the pass opens once Google confirms. */
  | { kind: 'pending' };

type VerifyResponse = { status: 'Active' | 'Pending'; season: string };

const FAILURE = 'Não deu para confirmar a compra agora. Se você foi cobrado, abra o passe de novo mais tarde que ele é liberado.';

/** Sends a Play purchase to the API; true once the API recorded it as paid. */
async function verifyOnServer(productId: string, purchase: Purchase): Promise<boolean> {
  if (!purchase.purchaseToken) return false;
  const result = await authorizedApiClient<VerifyResponse>('/api/v1/season-pass/purchases', {
    method: 'POST',
    body: JSON.stringify({ productId, purchaseToken: purchase.purchaseToken }),
  });
  return result?.status === 'Active';
}

export function usePassPurchase(
  pass: SeasonPass,
  onMessage: (title: string, message: string) => void,
): { state: PassPurchaseState; buy: () => void } {
  const queryClient = useQueryClient();
  const productId = Platform.OS === 'android' && !pass.premium ? pass.productId : null;
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const handled = useRef(new Set<string>());

  const settle = useCallback(
    async (purchase: Purchase, finish: (p: { purchase: Purchase; isConsumable?: boolean }) => Promise<void>) => {
      if (!productId || purchase.productId !== productId) return;
      const key = purchase.purchaseToken ?? purchase.id;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      if (purchase.purchaseState === 'pending') {
        setPending(true);
        handled.current.delete(key); // sent again once Google says it is paid
        return;
      }
      setBusy(true);
      try {
        if (await verifyOnServer(productId, purchase)) {
          // The API already acknowledged it; finishing again only clears the local queue.
          await finish({ purchase, isConsumable: false }).catch(() => undefined);
          setPending(false);
          await queryClient.invalidateQueries({ queryKey: seasonPassQueryKey });
          onMessage('Passe liberado', 'Os pedaços que você já alcançou entraram na sua carta.');
        } else {
          setPending(true);
          handled.current.delete(key);
        }
      } catch (error) {
        handled.current.delete(key);
        if (error instanceof ApiError && error.status === 409) {
          onMessage('Compra de outra conta', 'Esta compra já foi usada em outra conta do Quadra.');
        } else {
          onMessage('Compra não confirmada', FAILURE);
        }
      } finally {
        setBusy(false);
      }
    },
    [productId, queryClient, onMessage],
  );

  const settleRef = useRef<(purchase: Purchase) => void>(() => undefined);
  const iap = useIAP({
    onPurchaseSuccess: (purchase) => settleRef.current(purchase),
    onPurchaseError: (error) => {
      setBusy(false);
      if (error.code === ErrorCode.UserCancelled) return;
      if (error.code === ErrorCode.AlreadyOwned) {
        // Bought before (another phone, or the app closed before confirming): recover it.
        void iap.getAvailablePurchases();
        return;
      }
      onMessage('Compra não concluída', 'O Google Play não concluiu a compra. Nada foi cobrado.');
    },
  });
  settleRef.current = (purchase) => void settle(purchase, iap.finishTransaction);

  const { connected, fetchProducts, getAvailablePurchases } = iap;
  useEffect(() => {
    if (!connected || !productId) return;
    void fetchProducts({ skus: [productId], type: 'in-app' }).catch(() => undefined);
    // A purchase paid but never confirmed (app closed, no signal, boleto paid later) comes back here.
    void getAvailablePurchases().catch(() => undefined);
  }, [connected, productId, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    for (const purchase of iap.availablePurchases) settleRef.current(purchase);
  }, [iap.availablePurchases]);

  const product = iap.products.find((p) => p.id === productId);
  const buy = useCallback(() => {
    if (!productId || !pass.purchaseAccountTag) return;
    setBusy(true);
    iap
      .requestPurchase({
        request: { google: { skus: [productId], obfuscatedAccountId: pass.purchaseAccountTag } },
        type: 'in-app',
      })
      .catch(() => {
        setBusy(false);
        onMessage('Compra não concluída', 'O Google Play não abriu a compra. Tente de novo.');
      });
  }, [iap, productId, pass.purchaseAccountTag, onMessage]);

  let state: PassPurchaseState;
  if (!productId) state = { kind: 'unavailable' };
  else if (pending) state = { kind: 'pending' };
  else if (busy || !connected || !product) state = { kind: 'loading' };
  else state = { kind: 'ready', price: product.displayPrice };
  return { state, buy };
}
