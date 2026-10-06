export type ItemKind = 'food' | 'drink' | 'recipe' | 'medication';
export type EntryType = 'food' | 'drink' | 'medication' | 'symptom' | 'stool' | 'activity';
export type Severity = 1 | 2 | 3 | 4 | 5;
export type Bristol = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Canonical unit codes. Original text goes to Component.note when ambiguous. */
export type Unit = 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup' | 'fl_oz';

/** Shared, normalized ingredient. Optional density is reserved for later volume/weight conversion. */
export interface Ingredient {
  id?: number;
  name: string;
  nameKey: string;
  density?: number; // g per ml (future)
}

/** A line in an item's composition: a raw ingredient or another item (recipes). */
export interface Component {
  ingredientId?: number;
  itemId?: number;
  qty?: number;
  unit?: Unit;
  note?: string;
}

export interface Item {
  id?: number;
  kind: ItemKind;
  name: string;
  barcode?: string;
  dose?: string; // default dose, medications only
  components: Component[];
  ingredientIds: number[]; // direct ingredient ids, indexed for lookups
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
}

/** Food/drink entries reference an item; symptoms/activities use a label value. */
export interface Entry {
  id?: number;
  type: EntryType;
  start: number; // epoch ms
  end?: number; // epoch ms; undefined with ongoing=false means instant
  ongoing: boolean;
  itemId?: number;
  label?: string;
  severity?: Severity;
  bristol?: Bristol; // stool entries
  tags?: string[]; // stool tags
  dose?: string; // medication entries; defaults to the item's dose
  note?: string;
}

export interface SleepLog {
  id?: number;
  start: number;
  end: number;
}

export interface HydrationLog {
  id?: number;
  at: number;
  ml: number;
}

export interface Preset {
  id?: number;
  type: 'symptom' | 'activity' | 'stool';
  label: string;
}

/** Editable row used by the ingredient list UI and the paste parser. */
export interface IngredientLine {
  name?: string;
  itemId?: number;
  qty?: number;
  unit?: Unit;
  note?: string;
}
