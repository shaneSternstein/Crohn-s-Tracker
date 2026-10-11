/** Home background by hour (local time): soft morning, clear day, coral-tinted dusk, deep indigo night. */
export interface Sky { from: string; to: string; light: boolean } // light = text on it should be light

export function skyFor(hour: number): Sky {
  if (hour >= 5 && hour < 10) return { from: '#FFF1E4', to: '#F6F8FC', light: false };
  if (hour >= 10 && hour < 17) return { from: '#F6F8FC', to: '#ECF0F8', light: false };
  if (hour >= 17 && hour < 20) return { from: '#FFE0D8', to: '#E4E4F7', light: false };
  return { from: '#3B45B8', to: '#222A78', light: true };
}
