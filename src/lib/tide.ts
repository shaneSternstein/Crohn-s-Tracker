export const TIDE_EVENT = 'ebb:tide';

/** Plays the tide-settle animation after a save. Safe to call from anywhere. */
export const playTide = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(TIDE_EVENT));
};
