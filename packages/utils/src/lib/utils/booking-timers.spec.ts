import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { deadline, IDLE_MS, inactivity } from './booking-timers';

describe('deadline', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-24T10:00:00Z') }));
  afterEach(() => jest.useRealTimers());

  const watch = (expiresAt: ReturnType<typeof signal<string | null>>) => {
    const fired = jest.fn();
    TestBed.runInInjectionContext(() => deadline(expiresAt)).subscribe(fired);
    TestBed.tick();
    return fired;
  };

  it('émet à l’échéance', () => {
    const fired = watch(signal<string | null>('2026-10-24T10:05:00Z'));
    jest.advanceTimersByTime(4 * 60_000);
    expect(fired).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60_000);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('émet aussitôt si l’échéance est passée', () => {
    const fired = watch(signal<string | null>('2026-10-24T09:00:00Z'));
    jest.advanceTimersByTime(0);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('repart si l’échéance change, et se tait sans échéance', () => {
    const expiresAt = signal<string | null>('2026-10-24T10:01:00Z');
    const fired = watch(expiresAt);

    expiresAt.set('2026-10-24T10:10:00Z');
    TestBed.tick();
    jest.advanceTimersByTime(60_000);
    expect(fired).not.toHaveBeenCalled();

    expiresAt.set(null);
    TestBed.tick();
    jest.advanceTimersByTime(60 * 60_000);
    expect(fired).not.toHaveBeenCalled();
  });
});

describe('inactivity', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('émet après le délai sans interaction', () => {
    const fired = jest.fn();
    const subscription = inactivity(document, 1000).subscribe(fired);
    jest.advanceTimersByTime(999);
    expect(fired).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(fired).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('relance le compte à rebours à chaque interaction', () => {
    const fired = jest.fn();
    const subscription = inactivity(document, 1000).subscribe(fired);
    jest.advanceTimersByTime(800);
    document.dispatchEvent(new Event('keydown'));
    jest.advanceTimersByTime(800);
    expect(fired).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(fired).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('abandonne par défaut après quinze minutes', () => {
    expect(IDLE_MS).toBe(15 * 60_000);
  });
});
