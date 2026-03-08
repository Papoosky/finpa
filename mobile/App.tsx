import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import AuthScreen from "./AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";
import TransactionScreen from "./screens/TransactionScreen";
import HistoryScreen from "./screens/HistoryScreen";

const TOKEN_KEY = "finpa_token";
const Drawer = createDrawerNavigator();

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((stored) => {
      if (stored) setToken(stored);
      setCheckingToken(false);
    });
  }, []);

  async function handleAuth(newToken: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setToken(newToken);
  }

  async function handleLogout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
  }

  if (checkingToken) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!token) {
    return (
      <>
        <StatusBar style="dark" />
        <AuthScreen onAuth={handleAuth} />
      </>
    );
  }

  function CustomDrawerContent(props: DrawerContentComponentProps) {
    return (
      <View style={{ flex: 1 }}>
        <DrawerContentScrollView {...props}>
          <Text style={styles.drawerTitle}>Finpa</Text>
          <DrawerItemList {...props} />
        </DrawerContentScrollView>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Drawer.Navigator
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            headerStyle: { backgroundColor: "#f9fafb", elevation: 0, shadowOpacity: 0 },
            headerTintColor: "#111827",
            headerTitleStyle: { fontWeight: "700" },
            drawerActiveTintColor: "#3b82f6",
            drawerLabelStyle: { fontSize: 15, fontWeight: "600" },
          }}
        >
          <Drawer.Screen
            name="Dashboard"
            options={{ drawerLabel: "📊 Dashboard", title: "Dashboard" }}
          >
            {() => <DashboardScreen token={token!} onUnauthorized={handleLogout} />}
          </Drawer.Screen>
          <Drawer.Screen
            name="Transaction"
            options={{ drawerLabel: "💸 Nueva transaccion", title: "Nueva transaccion" }}
          >
            {() => <TransactionScreen token={token!} onUnauthorized={handleLogout} />}
          </Drawer.Screen>
          <Drawer.Screen
            name="History"
            options={{ drawerLabel: "📋 Historial", title: "Historial" }}
          >
            {() => <HistoryScreen token={token!} onUnauthorized={handleLogout} />}
          </Drawer.Screen>
        </Drawer.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  logoutBtn: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },
});
