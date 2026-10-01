export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value || !value.includes('@') || value.startsWith('@') || value.endsWith('@')) {
    return 'Informe um e-mail válido.';
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'A senha deve possuir pelo menos 6 caracteres.';
  }

  return null;
}

export function validateBirthDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return 'Informe a data de nascimento no formato DD/MM/AAAA.';
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    year >= 1900 &&
    date < today;

  if (!valid) {
    return 'Informe uma data de nascimento válida.';
  }

  return null;
}

export function validatePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) {
    return 'Informe um celular com DDD.';
  }

  return null;
}

export function validateName(value: string): string | null {
  if (value.trim().length < 2) {
    return 'Informe seu nome.';
  }

  return null;
}

export function parseMemberLimit(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}
