import { Asset } from 'expo-asset';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';

import { PLANT_ID_LABELS } from '@/data/plant-id-labels';
import { speciesGuide, type SpeciesRecord } from '@/data/species-guide';

/** On-device plant identification (see bitki-tanima/ in the parent folder for
 * how the model was trained). The model takes a 224×224 RGB photo as 0–255
 * floats and returns one probability per label in PLANT_ID_LABELS. */

const SIZE = 224;
/** Below this, the screen says "not sure" and leaves the choice to the user. On
 * the home-photo test set, guesses at or above 70% were right 94% of the time. */
export const PLANT_ID_CONFIDENT = 0.7;

export type PlantIdGuess = { species: SpeciesRecord; probability: number };

export const plantIdAvailable = true;

/** fast-tflite reads the model with java.net.URL, which only understands real
 * file:// or http:// addresses — not the resource name an installed APK
 * gives for a bundled asset. expo-asset first copies the model out of the
 * APK into the app's cache folder and returns that file's address. */
async function loadModel(): Promise<TfliteModel> {
  const asset = await Asset.fromModule(require('../../assets/models/plant-id.tflite')).downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return loadTensorflowModel({ url: uri }, []);
}

let modelPromise: Promise<TfliteModel> | null = null;
function getModel() {
  if (!modelPromise) {
    modelPromise = loadModel();
    // A failed load shouldn't stick forever — let the next photo try again.
    modelPromise.catch(() => {
      modelPromise = null;
    });
  }
  return modelPromise;
}

/** Crops the middle of the photo and shrinks it to the model's input — the same
 * preparation the model was tested with (a centred square of 224/255 of the
 * short side). */
async function photoToPixels(uri: string): Promise<Float32Array> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const side = Math.floor((Math.min(original.width, original.height) * SIZE) / 255);
  const context = ImageManipulator.manipulate(uri);
  context.crop({
    originX: Math.floor((original.width - side) / 2),
    originY: Math.floor((original.height - side) / 2),
    width: side,
    height: side,
  });
  context.resize({ width: SIZE, height: SIZE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 1, base64: true });
  if (!saved.base64) throw new Error('photo could not be read');

  const binary = atob(saved.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: false });
  if (decoded.width !== SIZE || decoded.height !== SIZE) throw new Error('unexpected photo size');
  return Float32Array.from(decoded.data);
}

/** The three most likely species for a photo, most likely first. */
export async function identifyPlant(uri: string): Promise<PlantIdGuess[]> {
  // Each stage labels its own failure, so a screenshot of the error line on
  // the screen is enough to tell where it went wrong.
  const stage = <T,>(name: string, work: Promise<T>) =>
    work.catch((e: unknown) => {
      throw new Error(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    });
  const [model, pixels] = await Promise.all([stage('model', getModel()), stage('photo', photoToPixels(uri))]);
  const [output] = await stage('run', model.run([pixels.buffer as ArrayBuffer]));
  const probabilities = new Float32Array(output);
  if (probabilities.length !== PLANT_ID_LABELS.length) {
    throw new Error(`run: ${probabilities.length} outputs for ${PLANT_ID_LABELS.length} labels`);
  }
  const byId = new Map(speciesGuide.map((s) => [s.id, s]));
  return Array.from(probabilities, (probability, index) => ({ probability, id: PLANT_ID_LABELS[index] }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3)
    .flatMap(({ probability, id }) => {
      const species = byId.get(id);
      return species ? [{ species, probability }] : [];
    });
}
