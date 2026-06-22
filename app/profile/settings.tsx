import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Globe,
  LogOut,
  Pencil,
  Shield,
  Sun,
  User,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { FilterChip } from '@/components/ui/FilterChip';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { TextField } from '@/components/ui/TextField';
import {
  POSITION_CHIP_OPTIONS,
  POSITION_LABELS,
} from '@/features/profile/constants/positions';
import { useMyProfile } from '@/features/profile/api/getMyProfile';
import { useUpdateProfile } from '@/features/profile/api/updateProfile';
import {
  editProfileSchema,
  type EditProfileInput,
} from '@/features/profile/schema/editProfile';
import { logout } from '@/lib/auth/logout';
import {
  useNotificationStore,
  type NotificationPrefKey,
} from '@/stores/notifications';
import { useThemeStore, type ThemeMode } from '@/stores/theme';
import { colors } from '@/theme/colors';

const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

type SettingsView = 'list' | 'edit' | 'notifications';

const FEEDBACK_EMAIL = 'feedback@quadra.app';

function noop() {}

function openOsSettings() {
  void Linking.openSettings();
}

function openFeedback() {
  const subject = encodeURIComponent('Feedback — Quadra App');
  void Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}`);
}

function showAbout() {
  Alert.alert(
    'Sobre o Quadra',
    `Quadra v${APP_VERSION}\n\nO app para encontrar partidas de vôlei perto de você.`,
  );
}

function showPhotoPickerPlaceholder() {
  Alert.alert(
    'Trocar foto',
    'A seleção de foto estará disponível em breve.',
  );
}

// ── Shared chrome ───────────────────────────────────────────────────────────

function BackButton({
  onPress,
  testID,
}: {
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      className="h-10 w-10 items-center justify-center rounded-chip bg-bg-light-alt"
    >
      <ChevronLeft size={24} color={colors.surfaceDark} />
    </Pressable>
  );
}

function SettingsHeader({
  title,
  onBack,
  testID,
}: {
  title: string;
  onBack: () => void;
  testID?: string;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 pt-2 pb-4">
      <BackButton onPress={onBack} testID={testID} />
      <Text className="font-display text-h1 text-text-primary uppercase flex-1">
        {title}
      </Text>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-mono text-mono text-text-muted uppercase px-4 mb-2 mt-6">
      {children}
    </Text>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <View className="mx-4 bg-white rounded-card shadow-card overflow-hidden">
      {children}
    </View>
  );
}

function SettingsDivider() {
  return <View className="h-px bg-line mx-4" />;
}

type SettingsRowProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  testID?: string;
};

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  showChevron = true,
  destructive,
  testID,
}: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress ?? noop}
      disabled={!onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="flex-row items-center px-4 py-4"
    >
      <View className="h-10 w-10 rounded-chip bg-bg-light-alt items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text
          className={`font-body text-body-bold ${
            destructive ? 'text-danger' : 'text-text-primary'
          }`}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="font-body text-caption text-text-muted mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron && onPress ? (
        <ChevronRight size={20} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

// ── Theme selector (Aparência) ──────────────────────────────────────────────

const THEME_OPTIONS: { mode: ThemeMode; label: string; previewClass: string }[] =
  [
    { mode: 'light', label: 'Claro', previewClass: 'bg-white' },
    { mode: 'dark', label: 'Escuro', previewClass: 'bg-surface-dark' },
    { mode: 'system', label: 'Automático', previewClass: 'bg-bg-light-alt' },
  ];

function ThemeSelector() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <View className="px-4 py-4">
      <Text className="font-body text-body-bold text-text-primary mb-3">
        Aparência
      </Text>
      <View className="flex-row gap-2">
        {THEME_OPTIONS.map((option) => {
          const selected = mode === option.mode;
          return (
            <Pressable
              key={option.mode}
              onPress={() => setMode(option.mode)}
              accessibilityRole="button"
              accessibilityLabel={`Tema ${option.label}`}
              accessibilityState={{ selected }}
              testID={`theme-${option.mode}`}
              className="flex-1 items-center"
            >
              <View
                className={`w-full h-16 rounded-chip border-2 overflow-hidden ${
                  selected ? 'border-primary' : 'border-line'
                }`}
              >
                {option.mode === 'system' ? (
                  <View className="flex-1 flex-row">
                    <View className="flex-1 bg-white" />
                    <View className="flex-1 bg-surface-dark" />
                  </View>
                ) : (
                  <View className={`flex-1 ${option.previewClass}`} />
                )}
                {selected ? (
                  <View className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary items-center justify-center">
                    <Check size={12} color={colors.textOnDark} />
                  </View>
                ) : null}
              </View>
              <Text className="font-body text-caption text-text-muted mt-2">
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Profile summary card ────────────────────────────────────────────────────

function ProfileSummaryCard() {
  const { data, isPending } = useMyProfile({ latencyMs: 0 });

  if (isPending || !data) {
    return (
      <SettingsCard>
        <View className="flex-row items-center p-4">
          <View className="h-14 w-14 rounded-full bg-bg-light-alt" />
          <View className="ml-4 flex-1 gap-2">
            <View className="h-4 w-32 rounded-pill bg-bg-light-alt" />
            <View className="h-3 w-24 rounded-pill bg-bg-light-alt" />
          </View>
        </View>
      </SettingsCard>
    );
  }

  const fullName = `${data.firstName} ${data.lastName}`;
  const positionLabel = POSITION_LABELS[data.position];

  return (
    <SettingsCard>
      <View className="flex-row items-center p-4">
        <View>
          <Avatar uri={data.avatarUrl} name={data.firstName} size="md" />
          <View className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-tertiary items-center justify-center border-2 border-white">
            <Text className="font-num text-caption text-text-on-dark">
              {data.level}
            </Text>
          </View>
        </View>
        <View className="ml-4 flex-1">
          <Text className="font-body text-h3 text-text-primary">{fullName}</Text>
          <Text className="font-body text-caption text-text-muted mt-0.5">
            @{data.handle} · {positionLabel}
          </Text>
        </View>
      </View>
    </SettingsCard>
  );
}

// ── Settings list ───────────────────────────────────────────────────────────

function SettingsListView({
  onEdit,
  onNotifications,
  onLogout,
}: {
  onEdit: () => void;
  onNotifications: () => void;
  onLogout: () => void;
}) {
  return (
    <ScrollView contentContainerClassName="pb-10">
      <View className="mt-2">
        <ProfileSummaryCard />
      </View>

      <SectionLabel>Conta</SectionLabel>
      <SettingsCard>
        <SettingsRow
          icon={<User size={20} color={colors.primary} />}
          title="Editar perfil"
          subtitle="Nome, nascimento, telefone"
          onPress={onEdit}
          testID="settings-edit-profile"
        />
      </SettingsCard>

      <SectionLabel>Preferências</SectionLabel>
      <SettingsCard>
        <ThemeSelector />
        <SettingsDivider />
        <SettingsRow
          icon={<Bell size={20} color={colors.primary} />}
          title="Notificações"
          subtitle="Convites, lembretes, ranking"
          onPress={onNotifications}
          testID="settings-notifications"
        />
        <SettingsDivider />
        <SettingsRow
          icon={<Shield size={20} color={colors.primary} />}
          title="Permissões do app"
          subtitle="Localização, câmera, contatos"
          onPress={openOsSettings}
          testID="settings-permissions"
        />
      </SettingsCard>

      <SectionLabel>Suporte</SectionLabel>
      <SettingsCard>
        <SettingsRow
          icon={<Flag size={20} color={colors.primary} />}
          title="Enviar feedback"
          subtitle="Sugestões, problemas e elogios"
          onPress={openFeedback}
          testID="settings-feedback"
        />
        <SettingsDivider />
        <SettingsRow
          icon={<Globe size={20} color={colors.primary} />}
          title="Sobre o Quadra"
          subtitle={`v${APP_VERSION}`}
          onPress={showAbout}
          testID="settings-about"
        />
      </SettingsCard>

      <View className="mt-6">
        <SettingsCard>
          <SettingsRow
            icon={<LogOut size={20} color={colors.danger} />}
            title="Sair da conta"
            onPress={onLogout}
            showChevron={false}
            destructive
            testID="settings-logout"
          />
        </SettingsCard>
      </View>
    </ScrollView>
  );
}

// ── Edit profile ────────────────────────────────────────────────────────────

function EditProfileView({ onBack }: { onBack: () => void }) {
  const { data } = useMyProfile({ latencyMs: 0 });
  const updateProfile = useUpdateProfile();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      birthDate: '',
      handle: '',
      phone: '',
      position: 'LEV',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        handle: data.handle,
        phone: data.phone,
        position: data.position,
      });
    }
  }, [data, reset]);

  const onValid = (input: EditProfileInput) => {
    updateProfile.mutate(input, {
      onSuccess: () => onBack(),
    });
  };

  return (
    <View className="flex-1">
      <SettingsHeader title="Editar perfil" onBack={onBack} testID="edit-back" />

      <ScrollView
        contentContainerClassName="px-4 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mt-2">
          <View>
            <Avatar uri={data?.avatarUrl} name={data?.firstName} size="lg" />
            <Pressable
              onPress={showPhotoPickerPlaceholder}
              accessibilityRole="button"
              accessibilityLabel="Trocar foto"
              testID="edit-change-photo"
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary items-center justify-center border-2 border-white"
            >
              <Pencil size={14} color={colors.textOnDark} />
            </Pressable>
          </View>
          <Pressable
            onPress={showPhotoPickerPlaceholder}
            accessibilityRole="button"
            accessibilityLabel="Trocar foto"
            className="mt-3"
          >
            <Text className="font-body text-body-bold text-primary">
              Trocar foto
            </Text>
          </Pressable>
        </View>

        <View className="flex-row gap-4 mt-6">
          <Controller
            control={control}
            name="firstName"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="NOME"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
                error={errors.firstName?.message}
                testID="edit-first-name"
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="SOBRENOME"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
                error={errors.lastName?.message}
                testID="edit-last-name"
              />
            )}
          />
        </View>

        <View className="mt-4">
          <Controller
            control={control}
            name="handle"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="APELIDO"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                maxLength={20}
                error={errors.handle?.message}
                testID="edit-handle"
                leftAdornment={
                  <Text className="font-num text-body text-primary">@</Text>
                }
              />
            )}
          />
        </View>

        <View className="mt-4">
          <Controller
            control={control}
            name="birthDate"
            render={({ field: { value, onChange } }) => (
              <DateField
                label="DATA DE NASCIMENTO"
                value={value}
                onChangeText={onChange}
                error={errors.birthDate?.message}
                testID="edit-birth-date"
              />
            )}
          />
        </View>

        <View className="mt-4">
          <Text className="font-body text-eyebrow text-text-primary uppercase mb-2">
            Número de telefone
          </Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { value, onChange } }) => (
              <PhoneInput
                value={value}
                onChangeText={onChange}
                error={errors.phone?.message}
                testID="edit-phone"
              />
            )}
          />
        </View>

        <View className="mt-6">
          <Text className="font-body text-eyebrow text-text-primary uppercase mb-3">
            Posição em quadra
          </Text>
          <Controller
            control={control}
            name="position"
            render={({ field: { value, onChange } }) => (
              <View className="flex-row flex-wrap gap-2">
                {POSITION_CHIP_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.code}
                    label={option.label}
                    selected={value === option.code}
                    onPress={() => onChange(option.code)}
                    testID={`edit-position-${option.code}`}
                  />
                ))}
              </View>
            )}
          />
        </View>

        {updateProfile.isError ? (
          <Text
            className="mt-4 text-center font-body text-caption text-danger"
            accessibilityLiveRegion="polite"
          >
            Não foi possível salvar. Tente novamente.
          </Text>
        ) : null}

        <View className="mt-8">
          <Button
            variant="grad"
            onPress={handleSubmit(onValid)}
            loading={updateProfile.isPending}
            disabled={!isDirty}
            leftIcon={<Check size={20} color={colors.textOnDark} />}
            testID="edit-save"
          >
            Salvar alterações
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Notifications preferences ───────────────────────────────────────────────

const NOTIFICATION_ROWS: {
  key: NotificationPrefKey;
  title: string;
  subtitle: string;
}[] = [
  {
    key: 'convites',
    title: 'Convites',
    subtitle: 'Quando alguém te convida para uma partida',
  },
  {
    key: 'lembretes',
    title: 'Lembretes',
    subtitle: 'Antes das partidas confirmadas',
  },
  {
    key: 'ranking',
    title: 'Ranking',
    subtitle: 'Atualizações do ranking semanal',
  },
];

function NotificationsView({ onBack }: { onBack: () => void }) {
  const prefs = useNotificationStore();
  const setPref = useNotificationStore((s) => s.setPref);

  return (
    <View className="flex-1">
      <SettingsHeader
        title="Notificações"
        onBack={onBack}
        testID="notifications-back"
      />
      <ScrollView contentContainerClassName="pb-10">
        <SettingsCard>
          {NOTIFICATION_ROWS.map((row, index) => (
            <View key={row.key}>
              {index > 0 ? <SettingsDivider /> : null}
              <View className="flex-row items-center px-4 py-4">
                <View className="flex-1 mr-4">
                  <Text className="font-body text-body-bold text-text-primary">
                    {row.title}
                  </Text>
                  <Text className="font-body text-caption text-text-muted mt-0.5">
                    {row.subtitle}
                  </Text>
                </View>
                <Switch
                  value={prefs[row.key]}
                  onValueChange={(value) => setPref(row.key, value)}
                  trackColor={{ false: colors.textMuted, true: colors.primary }}
                  thumbColor={colors.textOnDark}
                  accessibilityLabel={row.title}
                  testID={`notification-${row.key}`}
                />
              </View>
            </View>
          ))}
        </SettingsCard>
      </ScrollView>
    </View>
  );
}

// ── Screen root ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const [view, setView] = useState<SettingsView>('list');
  const queryClient = useQueryClient();

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          void logout(queryClient).then(() => {
            router.replace('/(auth)/login');
          });
        },
      },
    ]);
  };

  const handleBack = () => {
    if (view === 'list') {
      router.back();
      return;
    }
    setView('list');
  };

  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top']} className="flex-1">
        {view === 'list' ? (
          <>
            <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
              <View className="flex-row items-center gap-3">
                <BackButton onPress={handleBack} testID="settings-back" />
                <Text className="font-display text-h1 text-text-primary uppercase">
                  Configurações
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Alternar tema"
                onPress={noop}
              >
                <Sun size={24} color={colors.surfaceDark} />
              </Pressable>
            </View>
            <SettingsListView
              onEdit={() => setView('edit')}
              onNotifications={() => setView('notifications')}
              onLogout={handleLogout}
            />
          </>
        ) : null}

        {view === 'edit' ? (
          <EditProfileView onBack={() => setView('list')} />
        ) : null}

        {view === 'notifications' ? (
          <NotificationsView onBack={() => setView('list')} />
        ) : null}
      </SafeAreaView>
    </View>
  );
}
