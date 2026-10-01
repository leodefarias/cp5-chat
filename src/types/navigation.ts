import type { ConversationType } from './chat';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Conversations: undefined;
  Users: { purpose: 'direct' } | { purpose: 'pick' };
  GroupForm: { groupId?: string };
  Chat: { conversationId: string; conversationType: ConversationType };
  Profile: { uid: string };
  GroupMembers: { groupId: string };
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;
