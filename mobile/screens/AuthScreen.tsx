import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { Text, Button, Input, showToast } from '../components/ui';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AuthScreen() {
  const { login, register, isLoading } = useAuthStore();
  const { colors } = useTheme();
  const styles = useStyles();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      showToast('error', 'Error', 'Ingresa email y contrasena.');
      return;
    }
    if (!validateEmail(email.trim())) {
      showToast('error', 'Error', 'Ingresa un email valido.');
      return;
    }
    if (!isLogin && password.length < 8) {
      showToast('error', 'Error', 'La contrasena debe tener al menos 8 caracteres.');
      return;
    }
    if (!isLogin && !name.trim()) {
      showToast('error', 'Error', 'Ingresa tu nombre.');
      return;
    }

    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim());
      }
    } catch (e) {
      showToast('error', 'Error', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="displayLarge" style={styles.title}>
          Finpa
        </Text>
        <Text variant="titleLarge" color="textSecondary" style={styles.subtitle}>
          {isLogin ? 'Inicia sesion' : 'Crea tu cuenta'}
        </Text>

        {!isLogin && (
          <Input
            label="Nombre"
            placeholder="Tu nombre"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}

        <Input
          label="Email"
          placeholder="tu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Input
          label="Contrasena"
          placeholder="Tu contrasena"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          label={isLogin ? 'Iniciar sesion' : 'Registrarse'}
          onPress={handleSubmit}
          loading={isLoading}
          size="lg"
        />

        <View style={styles.switchRow}>
          <Button
            label={isLogin ? 'No tienes cuenta? Registrate' : 'Ya tienes cuenta? Inicia sesion'}
            onPress={() => setIsLogin(!isLogin)}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = createStyles((theme) => ({
  container: {
    flex: 1,
  },
  scroll: {
    padding: theme.spacing.xxl,
    paddingTop: 120,
    paddingBottom: 40,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    marginBottom: theme.spacing.xxxl,
  },
  switchRow: {
    marginTop: theme.spacing.xl,
    alignItems: 'center' as const,
  },
}));
