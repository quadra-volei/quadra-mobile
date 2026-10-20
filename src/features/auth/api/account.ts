import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';
import { logout } from '@/lib/auth/logout';

const FAILURE = 'Não foi possível concluir. Tente novamente.';

function toAccountError(error: unknown): Error {
  if (error instanceof ApiError && error.status === 401) {
    return new Error('Sua sessão expirou. Entre novamente.');
  }
  if (error instanceof TypeError) {
    return new Error('Sem conexão. Verifique sua internet e tente de novo.');
  }
  return new Error(FAILURE);
}

/**
 * "Exportar meus dados": fetches everything the API keeps about the user
 * (`GET /api/v1/auth/me/export`, LGPD) and hands it to the system share
 * sheet as a JSON file (app cache), so the user saves or sends it where they want.
 */
export function useExportAccount() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        const data = await authorizedApiClient<unknown>('/api/v1/auth/me/export');
        const uri = `${FileSystem.cacheDirectory}quadra-meus-dados.json`;
        await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 2));
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Meus dados no Quadra' });
      } catch (error) {
        throw toAccountError(error);
      }
    },
  });
}

/**
 * "Excluir conta": deletes the account and its data on the API
 * (`DELETE /api/v1/auth/me`, irreversible), then signs out locally. The screen
 * asks for confirmation before calling it.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        await authorizedApiClient<void>('/api/v1/auth/me', { method: 'DELETE' });
      } catch (error) {
        throw toAccountError(error);
      }
    },
    onSuccess: () => logout(queryClient),
  });
}
