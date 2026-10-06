import { useQueryClient } from '@tanstack/react-query';
import { BlurTargetView } from 'expo-blur';
import { router } from 'expo-router';
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  MapPin,
  MessageSquare,
  User,
} from 'lucide-react-native';
import { type ReactNode, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { GlassBackHeader } from '@/components/ui/GlassBackHeader';
import { useMyProfile } from '@/features/profile/api/getMyProfile';
import { positionLabel } from '@/features/profile/schema/onboarding';
import { logout } from '@/lib/auth/logout';
import { useThemeStore, type ThemePreference } from '@/stores/theme';
import { colors } from '@/theme/colors';

// App version shown on "Sobre o Quadra". Sourced as a module-local constant
// (expo-constants/expo-application are not in the locked stack); update on bumps.
const APP_VERSION = '1.0.0';

/** Neutral rounded skeleton block (DESIGN_SYSTEM skeleton shapes TBD — flag). */
function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-bg-light-alt rounded-card ${className}`} />;
}

// ── Eyebrow section label (CONTA / PREFERÊNCIAS / SUPORTE) ──
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="font-body text-eyebrow text-text-muted uppercase px-4 mt-6 mb-2">
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
        <Text className="font-body text-h3 text-text-primary">{title}</Text>
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
      accessibilityState={{ selected }}
      onPress={() => onPress(value)}
      className="flex-1 items-center"
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
        <Text className="font-body text-h3 text-text-primary">{fullName}</Text>
        {subtitle ? (
          <Text className="font-body text-caption text-text-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [headerHeight, setHeaderHeight] = useState(0);
  const blurTarget = useRef<View>(null);

  const onLogout = () => {
    void logout(queryClient);
  };

  return (
    <View className="flex-1 bg-bg-light">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <ScrollView
          contentContainerClassName="pb-24"
          contentContainerStyle={{ paddingTop: headerHeight }}
        >
          <SummaryCard />

          {/* CONTA — only "Editar perfil" (Pagamentos = Layer 3, cut) */}
          <SectionLabel>Conta</SectionLabel>
          <View className="mx-4 bg-white rounded-card shadow-card overflow-hidden">
            <SettingsRow
              icon={<User size={24} color={colors.surfaceDark} />}
              title="Editar perfil"
              subtitle="Nome, nascimento, telefone"
              onPress={() => router.push('/profile/edit')}
            />
          </View>

          {/* PREFERÊNCIAS */}
          <SectionLabel>Preferências</SectionLabel>
          <View className="mx-4 bg-white rounded-card shadow-card p-4">
            <Text className="font-body text-h3 text-text-primary">Aparência</Text>
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
              subtitle="Localização, câmera, contatos"
              onPress={() => {
                void Linking.openSettings();
              }}
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
            <Text className="font-body text-body-bold text-danger ml-2">
              Sair da conta
            </Text>
          </Pressable>
        </ScrollView>
      </BlurTargetView>

      <GlassBackHeader
        title="Configurações"
        blurTarget={blurTarget}
        onHeight={setHeaderHeight}
      />
    </View>
  );
}
