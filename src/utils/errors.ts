import { FirebaseError } from 'firebase/app';
import { GroupLimitError } from './groupValidation';

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Informe um endereço de e-mail válido.',
  'auth/missing-password': 'Informe sua senha.',
  'auth/weak-password': 'A senha deve possuir pelo menos 6 caracteres.',
  'auth/email-already-in-use': 'Já existe uma conta utilizando este e-mail.',
  'auth/user-not-found': 'E-mail ou senha inválidos.',
  'auth/wrong-password': 'E-mail ou senha inválidos.',
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/operation-not-allowed': 'O login por e-mail e senha não está habilitado no Firebase.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/user-disabled': 'Esta conta está desativada.',
  'permission-denied': 'Você não tem permissão para esta ação.',
  unavailable: 'Sem conexão com a internet.',
  'storage/unauthorized': 'Não foi possível enviar a imagem.',
};

export function toUserMessage(error: unknown): string {
  if (error instanceof GroupLimitError || error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message === 'FIREBASE_NOT_CONFIGURED') {
      return 'Preencha o firebaseConfig.json com o app Web do projeto cp5-chat.';
    }

    if (error.message === 'SELF_CHAT') {
      return 'Você não pode conversar consigo mesmo.';
    }

    if (error.message === 'NOT_OWNER') {
      return 'Somente o proprietário pode alterar o grupo.';
    }

    if (error.message === 'SESSION_EXPIRED') {
      return 'Sua sessão expirou. Entre novamente.';
    }

    if (error.message === 'API_UNAVAILABLE') {
      return 'A API de notificações está indisponível.';
    }

    if (error.message === 'PHOTO_PERMISSION_DENIED') {
      return 'Permissão de fotos negada. Autorize o acesso para escolher uma imagem.';
    }

    if (error.message === 'EMPTY_MESSAGE') {
      return 'Digite uma mensagem antes de enviar.';
    }

    if (error.message === 'MESSAGE_TOO_LONG') {
      return 'A mensagem pode ter no máximo 2000 caracteres.';
    }

    if (error.message === 'GROUP_NOT_FOUND') {
      return 'Grupo não encontrado.';
    }

    if (error.message === 'GROUP_FULL' || error.message === 'ACCESS_NOT_CREATED') {
      return 'Não foi possível atualizar o grupo. Tente novamente.';
    }

    if (/network request failed|failed to fetch|network error/i.test(error.message)) {
      return 'Sem conexão com a internet.';
    }
  }

  if (error instanceof FirebaseError) {
    return AUTH_MESSAGES[error.code] ?? 'Não foi possível concluir a operação. Tente novamente.';
  }

  return 'Não foi possível concluir a operação. Tente novamente.';
}
