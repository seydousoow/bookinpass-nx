import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render } from '../../testing';
import { Footer, FooterColumn } from './footer';

@Component({
  imports: [Footer],
  template: `<bip-footer [columns]="columns" />`,
})
class Host {
  readonly columns: readonly FooterColumn[] = [
    {
      titleKey: 'footer.help',
      links: [
        { labelKey: 'footer.faq', route: '/faq' },
        { labelKey: 'footer.contact', route: '/contact' },
      ],
    },
  ];
}

describe('Footer', () => {
  it('rend les colonnes fournies par l’appelant', async () => {
    const { element } = await render(Host, [provideRouter([])]);
    const nav = element.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('footer.help');
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((a) => a.textContent?.trim())).toEqual(['footer.faq', 'footer.contact']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/faq', '/contact']);
  });

  it('affiche l’année courante', async () => {
    const { element } = await render(Host, [provideRouter([])]);
    expect(element.textContent).toContain(`© ${new Date().getFullYear()} Book In Pass`);
  });
});
