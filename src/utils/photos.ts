import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
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

/** Longest side kept for saved photos: sharp on a phone screen, a few hundred KB on disk. */
const MAX_SIDE = 1600;

/** Shrinks a full-size camera photo, keeping its own shape (portrait stays portrait). */
async function shrink(uri: string, width: number, height: number): Promise<string> {
  if (Platform.OS === 'web' || Math.max(width, height) <= MAX_SIDE) return uri;
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    return saved.uri;
  } catch {
    return uri;
  }
}

/** Plant and album photos are saved whole, as taken. `crop` offers a free-shape
 * crop first — used when scanning, where framing just the plant helps. */
async function launch(kind: 'camera' | 'library', crop = false): Promise<string | null> {
  const permission =
    kind === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    allowsEditing: crop,
    quality: 0.8,
    base64: Platform.OS === 'web',
  };

  const result = kind === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return persist(await shrink(asset.uri, asset.width, asset.height), asset.base64);
}

export const pickFromCamera = () => launch('camera');
export const pickFromLibrary = () => launch('library');
export const pickForScanFromCamera = () => launch('camera', true);
export const pickForScanFromLibrary = () => launch('library', true);

/** Best-effort cleanup of a photo previously persisted by `persist()`. Only
 * ever touches files we copied into Paths.document on native — never web
 * data: URIs, which aren't real filesystem entries. */
export function deletePhoto(uri: string | null) {
  if (!uri || Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // best-effort cleanup; a leftover orphaned file isn't worth surfacing an error for
  }
}
