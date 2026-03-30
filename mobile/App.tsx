import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import ToastMessage from 'react-native-toast-message';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { Text, toastConfig } from './components/ui';
import { api } from './services/api';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import TransactionScreen from './screens/TransactionScreen';
import HistoryScreen from './screens/HistoryScreen';
import SubscriptionsScreen from './screens/SubscriptionsScreen';
import AddSubscriptionScreen from './screens/AddSubscriptionScreen';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { colors } = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DrawerContentScrollView {...props} style={{ backgroundColor: colors.background }}>
        <Text
          variant="displayMedium"
          style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 }}
        >
          Finpa
        </Text>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity
          style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={toggleTheme}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={20}
            color={colors.textSecondary}
          />
          <Text variant="bodyMedium" color="textSecondary">
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 20, paddingTop: 0 }} onPress={logout}>
          <Text variant="bodyMedium" style={{ color: colors.danger, fontWeight: '600' }}>
            Cerrar sesion
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AppNavigator() {
  const { colors, isDark } = useTheme();
  const token = useAuthStore((s) => s.token);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Process due subscriptions when app comes to foreground
  useEffect(() => {
    if (!token) return;
    // Run once on mount
    api.subscriptions.processDue().catch(() => {});

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        api.subscriptions.processDue().catch(() => {});
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [token]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer>
        <Drawer.Navigator
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0 },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: '700' },
            drawerActiveTintColor: colors.accent,
            drawerInactiveTintColor: colors.textSecondary,
            drawerLabelStyle: { fontSize: 15, fontWeight: '600' },
            drawerStyle: { backgroundColor: colors.background },
            sceneStyle: { backgroundColor: colors.background },
          }}
        >
          <Drawer.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              drawerLabel: 'Dashboard',
              title: 'Dashboard',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="stats-chart-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="Transaction"
            component={TransactionScreen}
            options={{
              unmountOnBlur: true,
              drawerLabel: 'Nueva transaccion',
              title: 'Nueva transaccion',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="add-circle-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="History"
            component={HistoryScreen}
            options={{
              drawerLabel: 'Historial',
              title: 'Historial',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="list-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="Subscriptions"
            component={SubscriptionsScreen}
            options={{
              drawerLabel: 'Suscripciones',
              title: 'Suscripciones',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="repeat-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="AddSubscription"
            component={AddSubscriptionScreen}
            options={({ route }) => ({
              unmountOnBlur: true,
              drawerItemStyle: { display: 'none' },
              title: (route.params as { subscription?: unknown })?.subscription
                ? 'Editar suscripcion'
                : 'Nueva suscripcion',
            })}
          />
        </Drawer.Navigator>
      </NavigationContainer>
      <ToastMessage config={toastConfig} />
    </>
  );
}

function AuthGate() {
  const { token, isInitialized, initialize } = useAuthStore();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!token) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthScreen />
        <ToastMessage config={toastConfig} />
      </>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthGate />
    </ThemeProvider>
  );
}
