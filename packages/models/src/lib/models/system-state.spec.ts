import { appError } from './app-error';
import { empty, failure, idle, loading, success } from './system-state';

describe('SystemState', () => {
  it('construit les états sans donnée', () => {
    expect(idle()).toEqual({ status: 'idle' });
    expect(loading()).toEqual({ status: 'loading' });
    expect(empty()).toEqual({ status: 'empty' });
  });

  it('porte la donnée en cas de succès', () => {
    expect(success([1, 2])).toEqual({ status: 'success', data: [1, 2] });
  });

  it('porte l’erreur en cas d’échec', () => {
    const error = appError('network', 'Connexion perdue.', 'Rien n’a été débité.', { label: 'Réessayer', kind: 'retry' });
    expect(failure(error)).toEqual({ status: 'error', error });
  });
});
