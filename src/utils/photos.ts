import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

async function persist(uri: string, base64?: string | null): Promise<string> {
  if (Platform.OS === 'web') {
    return base64 ? `data:image/jpeg;base64,${base64}` : uri;
  }
  const filename = `plant-photo-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  const dest = new File(Paths.document, filename);
  const source = new File(uri);
  await source.copy(dest);
  return dest.uri;
}

async function launch(kind: 'camera' | 'library'): Promise<string | null> {
  const permission =
    kind === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.6,
    base64: Platform.OS === 'web',
  };

  const result = kind === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return persist(asset.uri, asset.base64);
}

export const pickFromCamera = () => launch('camera');
export const pickFromLibrary = () => launch('library');
