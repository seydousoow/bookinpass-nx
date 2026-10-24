import { appError } from './app-error';

describe('appError', () => {
  it('assemble les trois parties obligatoires du message', () => {
    const action = { label: 'Réessayer', kind: 'retry' } as const;
    expect(appError('offers.timeout', 'La recherche a expiré.', 'Vos critères sont conservés.', action)).toEqual({
      code: 'offers.timeout',
      what: 'La recherche a expiré.',
      preserved: 'Vos critères sont conservés.',
      action,
    });
  });
});
