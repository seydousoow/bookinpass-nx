import { formatNational, isValidPhone, normalizePhoneNumber, removeNonDigitsCharacters } from './phone-number.utils';

describe('isValidPhone', () => {
  it('should return true for a valid Senegalese E.164 number', () => {
    expect(isValidPhone('+221771234567')).toBe(true);
  });

  it('should return true for a valid French E.164 number', () => {
    expect(isValidPhone('+33612345678')).toBe(true);
  });

  it.each([null, undefined, ''])('should return false for an empty value: %s', (value) => {
    expect(isValidPhone(value)).toBe(false);
  });

  it.each(['771234567', '+221123', 'not-a-phone', '+999123456789'])('should return false for an invalid number: %s', (value) => {
    expect(isValidPhone(value)).toBe(false);
  });
});

describe('removeNonDigitsCharacters', () => {
  it('should remove spaces and punctuation', () => {
    expect(removeNonDigitsCharacters('+33 (0)6-12.34/56 78')).toBe('330612345678');
  });

  it('should return an empty string when there are no digits', () => {
    expect(removeNonDigitsCharacters('abc +()-')).toBe('');
  });

  it('should preserve all digits', () => {
    expect(removeNonDigitsCharacters('221771234567')).toBe('221771234567');
  });

  it('should handle an empty string', () => {
    expect(removeNonDigitsCharacters('')).toBe('');
  });
});

describe('normalizePhoneNumber', () => {
  it('should convert uppercase characters to lowercase', () => {
    expect(normalizePhoneNumber('ABC DEF')).toBe('abc def');
  });

  it('should remove accents', () => {
    expect(normalizePhoneNumber('ÉLÈVE À NOËL')).toBe('eleve a noel');
  });

  it('should normalize combined Unicode accents', () => {
    expect(normalizePhoneNumber('e\u0301')).toBe('e');
  });

  it('should preserve digits and punctuation', () => {
    expect(normalizePhoneNumber('+33 (0)6-12')).toBe('+33 (0)6-12');
  });

  it('should handle an empty string', () => {
    expect(normalizePhoneNumber('')).toBe('');
  });
});

describe('formatNational', () => {
  it('should format a complete French national number', () => {
    expect(formatNational('0612345678', 'FR')).toBe('06 12 34 56 78');
  });

  it('should format a complete Senegalese national number', () => {
    expect(formatNational('771234567', 'SN')).toBe('77 123 45 67');
  });

  it('should progressively format an incomplete French number', () => {
    expect(formatNational('0612', 'FR')).toBe('06 12');
  });

  it('should return an empty string for empty input', () => {
    expect(formatNational('', 'FR')).toBe('');
  });

  it('should use AsYouType for an impossible but parseable number', () => {
    const result = formatNational('123', 'FR');

    expect(typeof result).toBe('string');
    expect(result).toBe('123');
  });
});
