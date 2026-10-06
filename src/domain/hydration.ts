/** Hydration is stored in ml and displayed in US cups. */
export const ML_PER_CUP = 237;
export const toCups = (ml: number) => Math.round((ml / ML_PER_CUP) * 10) / 10;
