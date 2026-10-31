import { IPayDunyaMethod, nationalNumber } from './paydunya';

const method = (id: string, country: string, dial_code: string): IPayDunyaMethod => ({ id, country, dial_code, otp: false });
const WAVE_SN = method('wave-senegal', 'SN', '221');
const OM_SN = method('orange-money-senegal', 'SN', '221');
const OM_CI = method('orange-money-ci', 'CI', '225');
const OM_ML = method('orange-money-mali', 'ML', '223');

describe('nationalNumber', () => {
  it('nettoie la saisie et retire l’indicatif du pays', () => {
    expect(nationalNumber(WAVE_SN, '77 123 45 67')).toBe('771234567');
    expect(nationalNumber(WAVE_SN, '+221 76-123-45-67')).toBe('761234567');
    expect(nationalNumber(OM_ML, '00223 90.12.34.56')).toBe('90123456');
  });

  it('refuse un numéro d’un autre pays ou de longueur fausse', () => {
    expect(nationalNumber(WAVE_SN, '0707123456')).toBeNull();
    expect(nationalNumber(WAVE_SN, '77123456')).toBeNull();
    expect(nationalNumber(OM_ML, '+221771234567')).toBeNull();
  });

  it('n’accepte que les puces Orange pour Orange Money au Sénégal et en Côte d’Ivoire', () => {
    expect(nationalNumber(OM_SN, '781234567')).toBe('781234567');
    expect(nationalNumber(OM_SN, '761234567')).toBeNull();
    expect(nationalNumber(OM_CI, '0707123456')).toBe('0707123456');
    expect(nationalNumber(OM_CI, '0501234567')).toBeNull();
  });

  it('n’a pas de numéro pour la carte', () => {
    expect(nationalNumber({ id: 'paydunya-card', country: null, dial_code: null, otp: false }, '771234567')).toBeNull();
  });
});
