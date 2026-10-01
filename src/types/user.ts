export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

export type PublicProfile = {
  uid: string;
  name: string;
  photoUrl: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string;
};
