import * as ImagePicker from 'expo-image-picker';
import { postForm } from './apiClient';

type LocalFile = {
  uri: string;
  name: string;
  type: string;
};

function appendLocalFile(form: FormData, file: LocalFile): void {
  const formData = form as FormData & {
    append(name: string, value: LocalFile | Blob | string, fileName?: string): void;
  };
  formData.append('file', file);
}

export async function pickProfileImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('PHOTO_PERMISSION_DENIED');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0]?.uri ?? null;
}

export async function uploadImage(uri: string): Promise<string> {
  const filename = uri.split('/').pop() ?? 'foto.jpg';
  const extension = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const type = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  const form = new FormData();
  appendLocalFile(form, { uri, name: filename, type });

  const uploaded = await postForm('/uploads', form);
  return uploaded.url;
}
