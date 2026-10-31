import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorCode } from './api-error.utils';

describe('apiErrorCode', () => {
  it('rend le code de l’API', () => {
    expect(apiErrorCode(new HttpErrorResponse({ status: 409, error: { code: 'capacity-too-low' } }))).toBe('capacity-too-low');
  });

  it('distingue l’absence de réseau d’une erreur sans code', () => {
    expect(apiErrorCode(new HttpErrorResponse({ status: 0 }))).toBe('network');
    expect(apiErrorCode(new HttpErrorResponse({ status: 500, error: 'Internal Server Error' }))).toBe('unexpected');
    expect(apiErrorCode(new HttpErrorResponse({ status: 502, error: null }))).toBe('unexpected');
  });

  it('rend « unexpected » pour une erreur qui ne vient pas de l’API', () => {
    expect(apiErrorCode(new Error('boom'))).toBe('unexpected');
  });
});
