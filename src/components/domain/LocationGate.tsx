import * as Location from 'expo-location';
import { type ReactNode, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';

type GateState = 'checking' | 'ask' | 'denied' | 'done';

/**
 * Asks for the location permission once, before the tabs mount, so Home and
 * Explore already open with the device position (`useDeviceCoords` reads it
 * once, on mount). Shown only while the permission was never answered; a user
 * who denies is told what stops working and goes on into the app.
 */
export function LocationGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>('checking');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let active = true;
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => {
        if (!active) return;
        setState(
          status === Location.PermissionStatus.UNDETERMINED ? 'ask' : 'done',
        );
      })
      // No answer from the system: never hold the app behind the gate.
      .catch(() => active && setState('done'));
    return () => {
      active = false;
    };
  }, []);

  async function handleAllow() {
    setAsking(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setState(status === Location.PermissionStatus.GRANTED ? 'done' : 'denied');
    } catch {
      setState('done');
    }
  }

  if (state === 'done') return <>{children}</>;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      className="flex-1 items-center justify-center bg-bg-light px-6"
    >
      {state === 'ask' ? (
        <>
          <Text className="font-display text-h1 text-text-primary uppercase text-center">
            Jogos perto de você
          </Text>
          <Text className="font-body text-body text-text-muted text-center mt-3 mb-6">
            O Quadra usa a sua localização para mostrar as partidas por perto e
            a distância até cada quadra.
          </Text>
          <View className="w-full">
            <Button
              variant="grad"
              onPress={handleAllow}
              loading={asking}
              testID="location-gate-allow"
            >
              Permitir localização
            </Button>
          </View>
        </>
      ) : state === 'denied' ? (
        <>
          <Text className="font-display text-h1 text-text-primary uppercase text-center">
            Sem localização
          </Text>
          <Text className="font-body text-body text-text-muted text-center mt-3 mb-6">
            Você pode usar o app assim mesmo, mas as partidas por perto e as
            distâncias não vão partir de onde você está. Dá para ativar depois
            nas configurações do celular.
          </Text>
          <View className="w-full gap-3">
            <Button
              variant="grad"
              onPress={() => setState('done')}
              testID="location-gate-continue"
            >
              Continuar sem localização
            </Button>
            <Button variant="ghost" onPress={() => Linking.openSettings()}>
              Abrir configurações
            </Button>
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
}
