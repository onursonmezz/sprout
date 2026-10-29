import { Asset } from 'expo-asset';

/** On the web preview the browser prints the page itself and can load the
 * images by address, so nothing needs embedding. */
export async function pdfPhoto(source: number | string, _width: number): Promise<string | null> {
  return typeof source === 'number' ? Asset.fromModule(source).uri : source;
}
