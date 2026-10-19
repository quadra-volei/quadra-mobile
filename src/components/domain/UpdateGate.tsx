import { useEffect } from 'react';
import { Linking, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { dialog } from '@/components/ui/Dialog';
import { useUpdateStatus } from '@/features/app/api/appVersion';

/**
 * "Atualize o app" (API DECISIONS #74): below the minimum version a full screen covers the app
 * with the store button; below the recommended one a dialog suggests it once per launch.
 */
export function UpdateGate() {
  const { status, storeUrl } = useUpdateStatus();
  const openStore = () => {
    if (storeUrl) void Linking.openURL(storeUrl);
  };

  useEffect(() => {
    if (status === 'suggest') {
      dialog.alert('Nova versão do Quadra', 'Atualize o app para ter as novidades e correções.', [
        { text: 'Depois', style: 'cancel' },
        { text: 'Atualizar', onPress: openStore },
      ]);
    }
    // Once per launch: the status settles once.
  }, [status]);

  if (status !== 'block') return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-primary px-6" testID="update-gate">
      <View className="self-stretch rounded-card bg-white p-6 shadow-modal">
        <Text className="font-display text-h1 text-text-primary uppercase text-center">Atualize o app</Text>
        <Text className="mt-3 font-body text-body text-text-muted text-center">
          Esta versão do Quadra não funciona mais. Baixe a nova na loja para continuar jogando.
        </Text>
        <View className="mt-6">
          <Button variant="primary" onPress={openStore} testID="update-gate-store">
            Atualizar agora
          </Button>
        </View>
      </View>
    </View>
  );
}
