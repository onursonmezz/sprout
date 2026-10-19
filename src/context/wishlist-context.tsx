import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { loadJSON, saveJSON } from '@/utils/storage';

const STORAGE_KEY = 'sprout:wishlist';

/** A plant the user would like to have one day — usually saved from a scan. */
export type WishItem = {
  id: string;
  /** Species id in the species database. */
  speciesId: string;
  addedAt: string;
};

type WishlistContextValue = {
  items: WishItem[];
  has: (speciesId: string) => boolean;
  add: (speciesId: string) => void;
  remove: (speciesId: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJSON<WishItem[]>(STORAGE_KEY, []).then((saved) => {
      setItems(Array.isArray(saved) ? saved : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveJSON(STORAGE_KEY, items);
  }, [items, loaded]);

  const value: WishlistContextValue = {
    items,
    has: (speciesId) => items.some((i) => i.speciesId === speciesId),
    add: (speciesId) =>
      setItems((prev) =>
        prev.some((i) => i.speciesId === speciesId)
          ? prev
          : [{ id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`, speciesId, addedAt: new Date().toISOString() }, ...prev]
      ),
    remove: (speciesId) => setItems((prev) => prev.filter((i) => i.speciesId !== speciesId)),
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
