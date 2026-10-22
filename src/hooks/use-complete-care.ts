import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { Plant } from '@/data/plants';
import { hapticSuccess } from '@/utils/haptics';

/** The "done" button of a care task. Repotting and fertilizing first ask what
 * was done (the new pot, which fertilizer) in the quick-actions sheet, which
 * then completes the task; the rest are marked done straight away. */
export function useCompleteCare() {
  const { completeCareTask, openQuickActions } = usePlants();
  const { t } = useLanguage();
  return (plant: Plant, taskIndex: number) => {
    const task = plant.care[taskIndex];
    if (!task) return;
    if (task.type === 'repot') return openQuickActions(plant.id, { view: 'pot', taskIndex });
    if (task.type === 'fertilize') return openQuickActions(plant.id, { view: 'fertilize', taskIndex });
    completeCareTask(plant.id, taskIndex, t.plantDetail.care.taskNames[task.type]);
    hapticSuccess();
  };
}
