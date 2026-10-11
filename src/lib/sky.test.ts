import { describe, expect, it } from 'vitest';
import { skyFor } from './sky';

describe('skyFor', () => {
  it('changes through the day', () => {
    expect(skyFor(7).from).toBe('#FFF1E4');
    expect(skyFor(12).from).toBe('#F6F8FC');
    expect(skyFor(18).from).toBe('#FFE0D8');
    expect(skyFor(22).light).toBe(true);
    expect(skyFor(3).light).toBe(true);
    expect(skyFor(10).light).toBe(false);
  });
});
