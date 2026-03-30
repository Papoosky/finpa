import React from 'react';
import { FlatList, Modal, TouchableOpacity, View } from 'react-native';
import { Text } from './ui';
import { ServiceBadge } from './ServiceBadge';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { PREDEFINED_SERVICES, PredefinedService } from '../constants/services';
import { useHaptics } from '../hooks/useHaptics';

type Props = {
  visible: boolean;
  selected: string | null;
  onSelect: (service: PredefinedService) => void;
  onClose: () => void;
};

export function ServiceModal({ visible, selected, onSelect, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text variant="titleMedium">Servicio</Text>
          <TouchableOpacity onPress={onClose}>
            <Text variant="bodyMedium" color="textSecondary">
              Cerrar
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={PREDEFINED_SERVICES}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isSelected = item.key === selected;
            return (
              <TouchableOpacity
                style={[styles.option, isSelected && { backgroundColor: colors.accentSoft }]}
                onPress={() => {
                  haptics.selection();
                  onSelect(item);
                  onClose();
                }}
              >
                <View style={styles.optionLeft}>
                  <ServiceBadge serviceKey={item.key} size={32} />
                  <Text
                    variant="bodyLarge"
                    style={isSelected ? { color: colors.accent, fontWeight: '700' } : undefined}
                  >
                    {item.name}
                  </Text>
                </View>
                {isSelected && <Text style={{ color: colors.accent, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const useStyles = createStyles((theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    maxHeight: '65%' as const,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  option: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  optionLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
}));
