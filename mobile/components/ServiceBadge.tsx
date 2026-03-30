import React from 'react';
import { View } from 'react-native';
import { Text } from './ui';
import { getServiceByKey } from '../constants/services';

type Props = {
  serviceKey: string | null | undefined;
  size?: number;
};

export function ServiceBadge({ serviceKey, size = 36 }: Props) {
  const service = getServiceByKey(serviceKey);
  const color = service?.color ?? '#6B7280';
  const initials = service?.initials ?? '?';
  const fontSize = Math.round(size * 0.33);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#ffffff', fontSize, fontWeight: '700', lineHeight: fontSize * 1.2 }}>
        {initials}
      </Text>
    </View>
  );
}
