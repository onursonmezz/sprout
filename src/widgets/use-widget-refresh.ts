import { useEffect } from 'react';

import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { refreshAllWidgets } from '@/widgets/render';

/** Keeps the home-screen widgets in step with the app: whenever a plant is
 * watered, added, changed or removed, or the language changes, they redraw a
 * moment later. use-widget-refresh.web.ts is the web stand-in. */
export function useWidgetRefresh() {
  const { plants, loaded } = usePlants();
  const { lang } = useLanguage();

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => refreshAllWidgets({ plants, lang }), 800);
    return () => clearTimeout(timer);
  }, [plants, lang, loaded]);
}
