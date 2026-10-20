import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';

type StateMessageProps = {
  /** What happened, in one line ("Não foi possível carregar"). */
  message: string;
  /** The one thing the user can do about it ("Tentar novamente"). */
  actionLabel?: string;
  onAction?: () => void;
  /** `"dark"` when the message sits on a navy surface. */
  tone?: 'light' | 'dark';
};

/**
 * The single empty / error block of the app: a readable line (body size, not a
 * caption) and, when there is a way out, its action right below. Announced
 * politely to screen readers.
 */
export function StateMessage({
  message,
  actionLabel,
  onAction,
  tone = 'light',
}: StateMessageProps) {
  return (
    <View className="px-6 py-6 items-center" accessibilityLiveRegion="polite">
      <Text
        className={`font-body-medium text-body text-center ${
          tone === 'dark' ? 'text-white/70' : 'text-text-muted'
        }`}
      >
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button variant={tone === 'dark' ? 'outlineLime' : 'ghost'} onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
