import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

export function RootNavigator() {
  const { firebaseUser, loading, authenticating } = useAuth();

  if (loading) {
    return <Loading label="Restaurando sessão..." />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {firebaseUser && !authenticating ? (
          <>
            <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
            <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Usuários' }} />
            <Stack.Screen name="GroupForm" component={GroupFormScreen} options={{ title: 'Grupo' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
            <Stack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Cadastro' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
