import { loadContact, saveContact } from './contact';

describe('contact', () => {
  afterEach(() => sessionStorage.clear());

  it('ne prérempli rien sans contact enregistré', () => {
    expect(loadContact()).toBeNull();
  });

  it('reprend le contact enregistré dans l’onglet', () => {
    saveContact({ email: 'awa@example.sn', phone: '+221771234567' });
    expect(loadContact()).toEqual({ email: 'awa@example.sn', phone: '+221771234567' });
  });

  it('n’enregistre que l’e-mail et le téléphone', () => {
    saveContact({ email: 'awa@example.sn', phone: '+221771234567', card: '4242' } as never);
    expect(JSON.parse(sessionStorage.getItem('bip.contact') ?? '{}')).toEqual({ email: 'awa@example.sn', phone: '+221771234567' });
  });

  it('ignore un enregistrement incomplet ou corrompu', () => {
    sessionStorage.setItem('bip.contact', JSON.stringify({ email: 'awa@example.sn' }));
    expect(loadContact()).toBeNull();
    sessionStorage.setItem('bip.contact', '{pas du json');
    expect(loadContact()).toBeNull();
  });
});
