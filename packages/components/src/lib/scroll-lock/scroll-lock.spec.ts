import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { lockScrollWhile, ScrollLock } from './scroll-lock';

@Component({ template: '' })
class Panel {
  readonly open = signal(false);

  constructor() {
    lockScrollWhile(this.open);
  }
}

describe('ScrollLock', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('bloque le body tant qu’un panneau le demande', () => {
    const lock = TestBed.inject(ScrollLock);
    lock.acquire();
    lock.acquire();
    expect(document.body.style.overflow).toBe('hidden');

    lock.release();
    expect(document.body.style.overflow).toBe('hidden');

    lock.release();
    expect(document.body.style.overflow).toBe('');
  });

  it('ignore une libération sans verrou', () => {
    const lock = TestBed.inject(ScrollLock);
    lock.release();
    lock.acquire();
    expect(document.body.style.overflow).toBe('hidden');
  });
});

describe('lockScrollWhile', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('suit l’état du panneau', async () => {
    const fixture = TestBed.createComponent(Panel);
    await fixture.whenStable();
    expect(document.body.style.overflow).toBe('');

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    expect(document.body.style.overflow).toBe('hidden');

    fixture.componentInstance.open.set(false);
    await fixture.whenStable();
    expect(document.body.style.overflow).toBe('');
  });

  it('rend le verrou à la destruction du composant', async () => {
    const fixture = TestBed.createComponent(Panel);
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();

    fixture.destroy();
    expect(document.body.style.overflow).toBe('');
  });
});
