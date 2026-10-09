import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { Plant } from '@/data/plants';
import { hapticSuccess } from '@/utils/haptics';

/** The one way to water a plant from any screen: resets its countdown, logs
 * the watering in its journal and confirms with a haptic. The undo / soil
 * question that follows is shown by WateringFeedbackPrompt. */
export function useWaterPlant() {
  const { waterPlant, addJournalEntry } = usePlants();
  const { t } = useLanguage();

  return (plant: Plant) => {
    // waterPlant first: it snapshots the plant for "undo" before the journal entry is added.
    waterPlant(plant.id);
    addJournalEntry(plant.id, {
      id: `watered-${Date.now()}`,
      type: 'watered',
      title: t.plantDetail.journal.wateredTitle,
      description: t.plantDetail.journal.wateredDesc(plant.wateringAmountMl),
      daysAgo: 0,
    });
    hapticSuccess();
  };
}
