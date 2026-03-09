import React from 'react';
import ToastMessage, { BaseToast, ErrorToast, BaseToastProps } from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeProvider';

function SuccessToast(props: BaseToastProps) {
  const { colors } = useTheme();
  return (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: colors.income,
        backgroundColor: colors.surface,
        borderLeftWidth: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
      }}
      text2Style={{
        fontSize: 13,
        color: colors.textSecondary,
      }}
    />
  );
}

function ErrorToastComponent(props: BaseToastProps) {
  const { colors } = useTheme();
  return (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: colors.danger,
        backgroundColor: colors.surface,
        borderLeftWidth: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
      }}
      text2Style={{
        fontSize: 13,
        color: colors.textSecondary,
      }}
    />
  );
}

function InfoToast(props: BaseToastProps) {
  const { colors } = useTheme();
  return (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: colors.accent,
        backgroundColor: colors.surface,
        borderLeftWidth: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
      }}
      text2Style={{
        fontSize: 13,
        color: colors.textSecondary,
      }}
    />
  );
}

export const toastConfig = {
  success: SuccessToast,
  error: ErrorToastComponent,
  info: InfoToast,
};

export { ToastMessage };

export function showToast(type: 'success' | 'error' | 'info', title: string, message?: string) {
  ToastMessage.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    topOffset: 60,
  });
}
