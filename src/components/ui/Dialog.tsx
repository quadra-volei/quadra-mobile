import { Modal, Pressable, Text, View } from 'react-native';
import { create } from 'zustand';

import { Button } from '@/components/ui/Button';

export type DialogButton = {
  text: string;
  onPress?: () => void | Promise<void>;
  /** `cancel` is the quiet way out (also what back / a tap outside do); `destructive` is red. */
  style?: 'default' | 'cancel' | 'destructive';
};

type DialogSpec = { title: string; message?: string; buttons: DialogButton[] };

const useDialogStore = create<{ current: DialogSpec | null }>(() => ({ current: null }));

/**
 * The app's confirmation / message dialog, in place of the native `Alert`
 * (same call shape, so a screen asks from anywhere, handlers included). Needs
 * `<DialogHost />` mounted once at the root. One dialog at a time: a new call
 * replaces the open one.
 */
export const dialog = {
  alert(title: string, message?: string, buttons?: DialogButton[]) {
    useDialogStore.setState({
      current: { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] },
    });
  },
};

/** Renders the dialog opened by `dialog.alert`. Mounted once in `app/_layout.tsx`. */
export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  if (!current) return null;

  // Close first: the handler may open the next dialog (an error, for instance).
  const press = (button?: DialogButton) => {
    useDialogStore.setState({ current: null });
    void button?.onPress?.();
  };
  const cancel = current.buttons.find((b) => b.style === 'cancel');
  // Back / tap outside only leave by the quiet way; a choice with no "cancel" has to be made.
  const dismiss = () => {
    if (cancel || current.buttons.length === 1) press(cancel);
  };
  const actions = current.buttons.filter((b) => b !== cancel);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable
        onPress={dismiss}
        accessible={false}
        className="flex-1 items-center justify-center bg-surface-dark/70 px-6"
      >
        {/* Taps on the card must not reach the backdrop. */}
        <Pressable
          onPress={() => {}}
          accessible={false}
          accessibilityViewIsModal
          testID="dialog"
          className="self-stretch rounded-card bg-white p-6 shadow-modal"
        >
          <Text
            accessibilityRole="header"
            className="font-body-extrabold text-h3 text-text-primary text-center"
          >
            {current.title}
          </Text>
          {current.message ? (
            <Text className="mt-2 font-body text-body text-text-muted text-center">
              {current.message}
            </Text>
          ) : null}

          <View className="mt-6 gap-2">
            {actions.map((button) =>
              button.style === 'destructive' ? (
                <Pressable
                  key={button.text}
                  accessibilityRole="button"
                  onPress={() => press(button)}
                  className="h-12 items-center justify-center rounded-btn bg-danger px-6"
                >
                  <Text className="font-body-semibold text-body-bold text-text-on-dark">
                    {button.text}
                  </Text>
                </Pressable>
              ) : (
                <Button key={button.text} variant="grad" onPress={() => press(button)}>
                  {button.text}
                </Button>
              ),
            )}
            {cancel ? (
              <Button variant="ghost" onPress={() => press(cancel)}>
                {cancel.text}
              </Button>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
