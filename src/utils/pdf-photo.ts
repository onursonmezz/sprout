import { Asset } from 'expo-asset';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * A photo as a data: URI small enough to put inside a PDF. The PDF is drawn
 * in a WebView that cannot reliably read the app's own files (file:// photos,
 * bundled images), so the picture travels inside the page instead.
 * `source` is a bundled image (require) or a photo's file URI; null if it
 * could not be read, so the page can fall back to a plain placeholder.
 */
export async function pdfPhoto(source: number | string, width: number): Promise<string | null> {
  try {
    const uri = typeof source === 'number' ? (await Asset.fromModule(source).downloadAsync()).localUri : source;
    if (!uri) return null;
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
  } catch {
    return null;
  }
}
