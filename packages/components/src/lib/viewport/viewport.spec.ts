import { TestBed } from '@angular/core/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { Viewport } from './viewport';

function setup(initiallyMatched: boolean) {
  const changes = new Subject<BreakpointState>();
  const observer = {
    observe: jest.fn(() => changes.asObservable()),
    isMatched: jest.fn(() => initiallyMatched),
  };
  TestBed.configureTestingModule({ providers: [{ provide: BreakpointObserver, useValue: observer }] });
  return { viewport: TestBed.inject(Viewport), observer, changes };
}

describe('Viewport', () => {
  it('s’aligne sur le point de rupture md: de Tailwind', () => {
    const { observer } = setup(false);
    expect(observer.observe).toHaveBeenCalledWith('(max-width: 767.98px)');
  });

  it('part de l’état courant, puis suit les changements', () => {
    const { viewport, changes } = setup(true);
    expect(viewport.isMobile()).toBe(true);

    changes.next({ matches: false, breakpoints: {} });
    expect(viewport.isMobile()).toBe(false);
  });

  it('observe une requête arbitraire', () => {
    const { viewport, observer, changes } = setup(false);
    const landscape = TestBed.runInInjectionContext(() => viewport.observe('(orientation: landscape)'));
    expect(observer.observe).toHaveBeenCalledWith('(orientation: landscape)');

    changes.next({ matches: true, breakpoints: {} });
    expect(landscape()).toBe(true);
  });
});
