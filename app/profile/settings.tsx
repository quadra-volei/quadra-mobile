import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Globe,
  MapPin,
  MessageSquare,
  Shield,
  Trash2,
  User,
  UserX,
  Users,
} from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { dialog } from '@/components/ui/Dialog';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { ToggleField } from '@/components/ui/ToggleField';
import { BackHeader } from '@/components/ui/BackHeader';
import { useSetActivitySharing } from '@/features/activity/api/activityApi';
import { useDeleteAccount, useExportAccount } from '@/features/auth/api/account';
import { useMyProfile } from '@/features/profile/api/getMyProfile';
import { positionLabel } from '@/features/profile/schema/onboarding';
import { logout } from '@/lib/auth/logout';
import { LEGAL_URLS } from '@/lib/legal';
import { useThemeStore, type ThemePreference } from '@/stores/theme';
import { colors } from '@/theme/colors';

// App version shown on "Sobre o Quadra". Sourced as a module-local constant
// (expo-constants/expo-application are not in the locked stack); update on bumps.
const APP_VERSION = '1.0.0';

// ── Eyebrow section label (CONTA / PREFERÊNCIAS / SUPORTE) ──
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="font-body-bold text-eyebrow text-text-muted uppercase px-4 mt-6 mb-2">
      {children}
    </Text>
  );
}

// ── Hairline divider between grouped rows ──
function Divider() {
  return <View className="h-px bg-line mx-4" />;
}

// ── One-off settings row (icon + title + subtitle + trailing chevron/text) ──
// Inline per COMPONENTS.md decision log — list chrome used only on this screen.
function SettingsRow({
  icon,
  title,
  subtitle,
  rightText,
  onPress,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  rightText?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const a11yLabel = subtitle ? `${title}. ${subtitle}` : title;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled || !onPress}
      className="flex-row items-center px-4 py-4"
    >
      <View className="mr-4">{icon}</View>
      <View className="flex-1">
        <Text className="font-body-extrabold text-h3 text-text-primary">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 font-body text-caption text-text-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightText ? (
        <Text className="font-num text-caption text-text-muted">{rightText}</Text>
      ) : (
        <ChevronRight size={20} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

// ── Appearance theme tile (preview swatch + label + selected ring + "Em breve") ──
function ThemeTile({
  value,
  label,
  selected,
  onPress,
  badge,
  swatch,
}: {
  value: ThemePreference;
  label: string;
  selected: boolean;
  onPress: (value: ThemePreference) => void;
  badge?: string;
  swatch: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      // A tile with a badge ("Em breve") is not built yet: it shows but cannot be picked.
      accessibilityState={{ selected, disabled: badge != null }}
      disabled={badge != null}
      onPress={() => onPress(value)}
      className={`flex-1 items-center ${badge ? 'opacity-60' : ''}`}
    >
      <View
        className={`w-full h-16 rounded-card overflow-hidden border-2 ${
          selected ? 'border-primary' : 'border-line'
        }`}
      >
        {swatch}
        {selected ? (
          <View className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Check size={12} color={colors.textOnDark} />
          </View>
        ) : null}
      </View>
      <Text className="mt-2 font-body text-caption text-text-primary">
        {label}
      </Text>
      {badge ? (
        <View className="mt-1 rounded-pill bg-bg-light-alt px-2 py-0.5">
          <Text className="font-mono text-mono text-text-muted uppercase">
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── Profile summary card — async (skeleton / error / loaded) ──
function SummaryCard() {
  const { data, isPending, isError, refetch } = useMyProfile();

  if (isPending) {
    return (
      <View className="mx-4 mt-2 bg-white rounded-card shadow-card p-4 flex-row items-center gap-3">
        <SkeletonBlock className="h-12 w-12 rounded-full" />
        <View className="flex-1 gap-2">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3 w-40" />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View
        className="mx-4 mt-2 bg-white rounded-card shadow-card p-4 items-center"
        accessibilityLiveRegion="polite"
      >
        <Text className="font-body text-body text-text-muted text-center">
          Não foi possível carregar
        </Text>
        <Button variant="ghost" onPress={() => refetch()}>
          Tentar novamente
        </Button>
      </View>
    );
  }

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
  const position = positionLabel(data.position);
  const subtitle = [data.handle ? `@${data.handle}` : null, position]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="mx-4 mt-2 bg-white rounded-card shadow-card p-4 flex-row items-center gap-3">
      <Avatar uri={data.avatarUrl} name={data.firstName} size="md" />
      <View className="flex-1">
        <Text className="font-body-extrabold text-h3 text-text-primary">{fullName}</Text>
        {subtitle ? (
          <Text className="font-body text-caption text-text-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// "Mostrar minhas atividades para quem me segue" (on by default). Follows the
// tap while the server answers; the profile in the cache takes the result.
function ActivitySharingToggle() {
  const { data } = useMyProfile();
  const setSharing = useSetActivitySharing();
  const value = setSharing.isPending ? (setSharing.variables ?? true) : (data?.shareActivity ?? true);
  return (
    <ToggleField
      icon={<Users size={24} color={colors.surfaceDark} />}
      title="Mostrar minhas atividades"
      caption="Quem te segue vê quando você joga, é MVP ou sobe de nível"
      value={value}
      onValueChange={(enabled) => setSharing.mutate(enabled)}
      testID="activity-sharing-switch"
    />
  );
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [headerHeight, setHeaderHeight] = useState(0);

  const exportAccount = useExportAccount();
  const deleteAccount = useDeleteAccount();

  const onLogout = () => {
    void logout(queryClient);
  };

  const onExport = () => {
    exportAccount.mutate(undefined, {
      onError: (error) => dialog.alert('Exportar meus dados', error.message),
    });
  };

  // Irreversible: the API deletes the account and its data (LGPD), then we sign out.
  const onDelete = () => {
    dialog.alert(
      'Excluir conta?',
      'Seu perfil, posts, seguidores e pontos serão apagados e as partidas que você organiza e ainda não começaram serão canceladas. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () =>
            deleteAccount.mutate(undefined, {
              onError: (error) => dialog.alert('Excluir conta', error.message),
            }),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-bg-light">
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerClassName="pb-24"
          contentContainerStyle={{ paddingTop: headerHeight }}
        >
          <SummaryCard />

          {/* CONTA — editar perfil, exportar e excluir a conta (LGPD); Pagamentos = Layer 3, cut */}
          <SectionLabel>Conta</SectionLabel>
          <View className="mx-4 bg-white rounded-card shadow-card overflow-hidden">
            <SettingsRow
              icon={<User size={24} color={colors.surfaceDark} />}
              title="Editar perfil"
              subtitle="Nome, nascimento, telefone"
              onPress={() => router.push('/profile/edit')}
            />
            <Divider />
            <SettingsRow
              icon={<Download size={24} color={colors.surfaceDark} />}
              title="Exportar meus dados"
              subtitle="Tudo o que o Quadra guarda sobre você"
              onPress={onExport}
              disabled={exportAccount.isPending}
            />
            <Divider />
            <SettingsRow
              icon={<Trash2 size={24} color={colors.danger} />}
              title="Excluir conta"
              subtitle="Apaga sua conta e seus dados"
              onPress={onDelete}
              disabled={deleteAccount.isPending}
            />
          </View>

          {/* PREFERÊNCIAS */}
          <SectionLabel>Preferências</SectionLabel>
          <View className="mx-4 bg-white rounded-card shadow-card p-4">
            <Text className="font-body-extrabold text-h3 text-text-primary">Aparência</Text>
            <View className="flex-row gap-3 mt-3">
              <ThemeTile
                value="light"
                label="Claro"
                selected={theme === 'light'}
                onPress={setTheme}
                swatch={
                  <View className="flex-1 bg-bg-light items-center justify-center">
                    <View className="h-6 w-10 rounded-chip bg-white" />
                  </View>
                }
              />
              <ThemeTile
                value="dark"
                label="Escuro"
                badge="Em breve"
                selected={theme === 'dark'}
                onPress={setTheme}
                swatch={
                  <View className="flex-1 bg-surface-dark items-center justify-center">
                    <View className="h-6 w-10 rounded-chip bg-surface-dark-alt" />
                  </View>
                }
              />
              <ThemeTile
                value="system"
                label="Automático"
                badge="Em breve"
                selected={theme === 'system'}
                onPress={setTheme}
                swatch={
                  <View className="flex-1 flex-row">
                    <View className="flex-1 bg-bg-light" />
                    <View className="flex-1 bg-surface-dark" />
                  </View>
                }
              />
            </View>
          </View>

          <View className="mx-4 mt-3 bg-white rounded-card shadow-card overflow-hidden">
            <SettingsRow
              icon={<Bell size={24} color={colors.surfaceDark} />}
              title="Notificações"
              subtitle="Convites, lembretes, ranking"
              onPress={() => router.push('/profile/notifications')}
            />
            <Divider />
            <SettingsRow
              icon={<MapPin size={24} color={colors.surfaceDark} />}
              title="Permissões do app"
              subtitle="Localização e notificações"
              onPress={() => {
                void Linking.openSettings();
              }}
            />
          </View>

          {/* PRIVACIDADE */}
          <SectionLabel>Privacidade</SectionLabel>
          <View className="mx-4">
            <ActivitySharingToggle />
          </View>
          <View className="mx-4 mt-3 bg-white rounded-card shadow-card overflow-hidden">
            <SettingsRow
              icon={<UserX size={24} color={colors.surfaceDark} />}
              title="Jogadores bloqueados"
              subtitle="Quem você bloqueou na Rede"
              onPress={() => router.push('/profile/blocked')}
            />
          </View>

          {/* SUPORTE */}
          <SectionLabel>Suporte</SectionLabel>
          <View className="mx-4 bg-white rounded-card shadow-card overflow-hidden">
            <SettingsRow
              icon={<MessageSquare size={24} color={colors.surfaceDark} />}
              title="Enviar feedback"
              subtitle="Sugestões, problemas e elogios"
              onPress={() => router.push('/profile/feedback')}
            />
            <Divider />
            <SettingsRow
              icon={<FileText size={24} color={colors.surfaceDark} />}
              title="Termos de Uso"
              onPress={() => void Linking.openURL(LEGAL_URLS.terms)}
            />
            <Divider />
            <SettingsRow
              icon={<Shield size={24} color={colors.surfaceDark} />}
              title="Política de Privacidade"
              onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}
            />
            <Divider />
            <SettingsRow
              icon={<Globe size={24} color={colors.surfaceDark} />}
              title="Sobre o Quadra"
              rightText={`v${APP_VERSION}`}
              disabled
            />
          </View>

          {/* Logout */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sair da conta. Ação destrutiva."
            onPress={onLogout}
            className="mx-4 mt-6 bg-white rounded-card shadow-card px-4 py-4 flex-row items-center"
          >
            <ChevronLeft size={24} color={colors.danger} />
            <Text className="font-body-semibold text-body-bold text-danger ml-2">
              Sair da conta
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <BackHeader
        title="Configurações"
        onHeight={setHeaderHeight}
      />
    </View>
  );
}
