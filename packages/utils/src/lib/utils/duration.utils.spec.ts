import { formatDuration } from './duration.utils';

describe('formatDuration', () => {
  it('formate une durée ISO 8601 en heures et minutes', () => {
    expect(formatDuration('PT2H5M')).toBe('2 h 05 min');
    expect(formatDuration('PT11H45M')).toBe('11 h 45 min');
  });

  it('omet la partie nulle', () => {
    expect(formatDuration('PT3H')).toBe('3 h');
    expect(formatDuration('PT45M')).toBe('45 min');
  });

  it('rend la valeur telle quelle si elle n’est pas une durée', () => {
    expect(formatDuration('2 heures')).toBe('2 heures');
  });
});
