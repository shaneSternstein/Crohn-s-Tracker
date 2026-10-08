import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';

const NONE = new Map<number, string>();

/** Ingredient id to name, for searching items by what they contain. */
export const useIngredientNames = () =>
  useLiveQuery(async () => new Map((await db.ingredients.toArray()).map((g) => [g.id!, g.name] as const)), [], NONE);
