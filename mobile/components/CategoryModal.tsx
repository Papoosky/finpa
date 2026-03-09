import React from 'react';
import { FlatList, Modal, TouchableOpacity, View } from 'react-native';
import { Text } from './ui';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { Category } from '../constants/categories';
import { useHaptics } from '../hooks/useHaptics';

type Props = {
  visible: boolean;
  categories: Category[];
  selected: string;
  accentColor: string;
  onSelect: (label: string) => void;
  onClose: () => void;
};

export function CategoryModal({
  visible,
  categories,
  selected,
  accentColor,
  onSelect,
  onClose,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text variant="titleMedium">Categoria</Text>
          <TouchableOpacity onPress={onClose}>
            <Text variant="bodyMedium" color="textSecondary">
              Cerrar
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => {
            const isSelected = item.label === selected;
            return (
              <TouchableOpacity
                style={[styles.option, isSelected && { backgroundColor: colors.accentSoft }]}
                onPress={() => {
                  haptics.selection();
                  onSelect(item.label);
                  onClose();
                }}
              >
                <Text
                  variant="bodyLarge"
                  style={isSelected ? { color: accentColor, fontWeight: '700' } : undefined}
                >
                  {item.emoji} {item.label}
                </Text>
                {isSelected && <Text style={{ color: accentColor, fontSize: 18 }}>✓</Text>}
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
    maxHeight: '55%' as const,
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
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
}));
