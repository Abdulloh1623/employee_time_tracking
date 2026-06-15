import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme";
import LogoutButton from "../components/LogoutButton";
import HeaderControls from "../components/HeaderControls";
import NotificationBell from "../components/NotificationBell";
import LoginScreen from "../screens/LoginScreen";
import ScanScreen from "../screens/ScanScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MenuScreen from "../screens/MenuScreen";
import DashboardScreen from "../screens/DashboardScreen";
import EmployeesScreen from "../screens/EmployeesScreen";
import PayrollScreen from "../screens/PayrollScreen";
import LeaveScreen from "../screens/LeaveScreen";
import SettingsScreen from "../screens/SettingsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import MyQRScreen from "../screens/MyQRScreen";
import MyAttendanceScreen from "../screens/MyAttendanceScreen";
import MyPayslipsScreen from "../screens/MyPayslipsScreen";
import MyLeaveScreen from "../screens/MyLeaveScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HeaderRightBasic() {
  return <View style={styles.headerRight}><HeaderControls /><LogoutButton /></View>;
}
function HeaderRightAdmin() {
  return <View style={styles.headerRight}><NotificationBell /><HeaderControls /><LogoutButton /></View>;
}

function useHeaderOptions(admin: boolean) {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.brand },
    headerTintColor: "#fff",
    headerTitleStyle: { fontWeight: "700" as const },
    headerRight: () => (admin ? <HeaderRightAdmin /> : <HeaderRightBasic />),
  };
}

function CheckerStack() {
  const { t } = useTranslation();
  const opts = useHeaderOptions(false);
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="QRSkaner" component={ScanScreen} options={{ title: t("nav.scanner") }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  const { t } = useTranslation();
  const opts = useHeaderOptions(true);
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="Menyu" component={MenuScreen} options={{ title: t("nav.menu") }} />
      <Stack.Screen name="Sozlamalar" component={SettingsScreen} options={{ title: t("nav.settings") }} />
      <Stack.Screen name="Davomat" component={AttendanceScreen} options={{ title: t("nav.attendance") }} />
      <Stack.Screen name="Profil" component={ProfileScreen} options={{ title: t("nav.profile") }} />
    </Stack.Navigator>
  );
}

function AdminTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const opts = useHeaderOptions(true);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...opts,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.dim,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            dashboard: "grid-outline",
            employees: "people-outline",
            payroll: "cash-outline",
            leave: "airplane-outline",
            more: "ellipsis-horizontal",
          };
          return <Ionicons name={map[route.name] ?? "ellipse-outline"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="dashboard" component={DashboardScreen} options={{ title: t("nav.dashboard") }} />
      <Tab.Screen name="employees" component={EmployeesScreen} options={{ title: t("nav.employees") }} />
      <Tab.Screen name="payroll" component={PayrollScreen} options={{ title: t("nav.payroll") }} />
      <Tab.Screen name="leave" component={LeaveScreen} options={{ title: t("nav.leave") }} />
      <Tab.Screen name="more" component={MoreStack} options={{ title: t("nav.more"), headerShown: false }} />
    </Tab.Navigator>
  );
}

function AdminRoot() {
  const { t } = useTranslation();
  const opts = useHeaderOptions(true);
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Bildirishnomalar" component={NotificationsScreen} options={{ ...opts, title: t("nav.notifications") }} />
    </Stack.Navigator>
  );
}

function EmployeeTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const opts = useHeaderOptions(true);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...opts,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.dim,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            myQr: "qr-code-outline",
            myAttendance: "list-outline",
            myPayslips: "cash-outline",
            myLeave: "airplane-outline",
            myProfile: "person-outline",
          };
          return <Ionicons name={map[route.name] ?? "ellipse-outline"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="myQr" component={MyQRScreen} options={{ title: t("me.qr") }} />
      <Tab.Screen name="myAttendance" component={MyAttendanceScreen} options={{ title: t("me.attendance") }} />
      <Tab.Screen name="myPayslips" component={MyPayslipsScreen} options={{ title: t("me.payslips") }} />
      <Tab.Screen name="myLeave" component={MyLeaveScreen} options={{ title: t("me.leave") }} />
      <Tab.Screen name="myProfile" component={ProfileScreen} options={{ title: t("nav.profile") }} />
    </Tab.Navigator>
  );
}

function EmployeeRoot() {
  const { t } = useTranslation();
  const opts = useHeaderOptions(true);
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={EmployeeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Bildirishnomalar" component={NotificationsScreen} options={{ ...opts, title: t("nav.notifications") }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  if (user.role === "checker") return <CheckerStack />;
  if (user.role === "employee") return <EmployeeRoot />;
  return <AdminRoot />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRight: { flexDirection: "row", alignItems: "center" },
});
