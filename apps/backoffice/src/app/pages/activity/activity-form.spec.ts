import { emptyActivity, lines, missing, payload } from './activity-form';

describe('activity form', () => {
  it('splits a text area into items', () => {
    expect(lines(' Pirogue \n\n Guide ')).toEqual(['Pirogue', 'Guide']);
    expect(lines(null)).toEqual([]);
  });

  it('lists what is missing before saving', () => {
    expect(missing(emptyActivity())).toEqual(['title', 'city', 'provider', 'summary', 'description', 'meeting-point']);
    const form = { ...emptyActivity(), latitude: 14.7, images: [{ url: 'http://insecure.example/a.jpg', alt: null }] };
    expect(missing(form)).toContain('location');
    expect(missing(form)).toContain('images');
  });

  it('cleans the body sent to the server', () => {
    const form = { ...emptyActivity(), title: ' Gorée ', images: [{ url: ' https://cdn.example/a.jpg ', alt: ' ' }] };
    expect(payload(form).title).toBe('Gorée');
    expect(payload(form).images).toEqual([{ url: 'https://cdn.example/a.jpg', alt: null }]);
  });
});
