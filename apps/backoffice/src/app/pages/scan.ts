import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { Spinner } from 'components/spinner/spinner';
import { createAction } from '../core/action';
import { StaffApi } from '../core/api';
import { dakarDateTime, dakarTime } from '../core/dakar';
import { TicketCheck } from '../core/models';

type Camera = 'off' | 'starting' | 'on' | 'denied' | 'unsupported';
type Decoder = (data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: string }) => { data: string } | null;

/** Code de billet : 10 caractères, sans 0/O ni 1/I. */
export const TICKET_CODE = /^[A-HJ-NP-Z2-9]{10}$/;
/** Le même code relu par la caméra n'est renvoyé qu'après ce délai. */
const SAME_CODE_MS = 4000;
/** Une image toutes les 200 ms : assez pour viser, sans chauffer le téléphone. */
const FRAME_MS = 200;

/**
 * Contrôle des billets : la caméra du téléphone lit le QR code (jsQR, chargé à la première ouverture), ou le code se
 * tape à la main. Chaque lecture valide le billet côté serveur (une seule fois) et affiche le verdict en grand.
 */
@Component({
  selector: 'bo-scan',
  imports: [TranslocoDirective, Button, Input, Spinner],
  template: `
    <section *transloco="let t" class="mx-auto max-w-lg space-y-4">
      <h1 class="text-xl font-bold">{{ t('scan.title') }}</h1>

      <div class="bo-card space-y-3">
        <div [class.hidden]="camera() !== 'on'" class="relative overflow-hidden rounded-card bg-black">
          <video #video aria-hidden="true" class="aspect-square w-full object-cover" muted playsinline></video>
          <div class="pointer-events-none absolute inset-[15%] rounded-card border-4 border-white/80"></div>
        </div>
        @switch (camera()) {
          @case ('on') {
            <button (clicked)="stop()" bipButton block variant="outline">{{ t('scan.stop-camera') }}</button>
          }
          @case ('starting') {
            <bip-spinner label="scan.starting" showLabel />
          }
          @default {
            <button (clicked)="start()" bipButton block>{{ t('scan.start-camera') }}</button>
            @if (camera() === 'denied') {
              <p class="text-sm text-state-error" role="alert">{{ t('scan.denied') }}</p>
            } @else if (camera() === 'unsupported') {
              <p class="text-sm text-state-error" role="alert">{{ t('scan.unsupported') }}</p>
            }
          }
        }
        <form (submit)="$event.preventDefault(); submitManual()" class="flex items-end gap-2">
          <bip-input
            [(value)]="manual"
            [maxLength]="10"
            autocapitalize="characters"
            autocomplete="off"
            class="flex-1"
            hideLabel
            label="scan.code"
            name="code"
            placeholder="scan.code" />
          <button [disabled]="!validManual()" [loading]="action.busy()" bipButton type="submit">{{ t('scan.check') }}</button>
        </form>
      </div>

      @if (action.error(); as code) {
        <p class="text-state-error" role="alert">{{ t('errors.' + code) }}</p>
      }
      @if (result(); as r) {
        <div [class]="tone(r)" aria-live="assertive" class="rounded-card p-5" role="status">
          <p class="text-2xl font-bold">{{ t('scan.status.' + r.status) }}</p>
          <p class="font-mono">{{ r.code }}</p>
          @if (r.family_name) {
            <p class="mt-2 text-lg font-semibold">{{ r.given_name }} {{ r.family_name }}</p>
          }
          @if (r.origin) {
            <p>{{ r.origin }} → {{ r.destination }} · {{ dateTime(r.departs_at) }}</p>
          }
          @if (r.status === 'already_scanned') {
            <p class="mt-2 font-semibold">{{ t('scan.scanned-by', { time: time(r.scanned_at), name: r.scanned_by }) }}</p>
          }
        </div>
      }
    </section>
  `,
})
export class ScanPage {
  protected readonly camera = signal<Camera>('off');
  protected readonly action = createAction();
  protected readonly result = signal<TicketCheck | null>(null);
  protected readonly manual = signal<string | null>('');
  protected readonly time = dakarTime;
  protected readonly dateTime = dakarDateTime;
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly api = inject(StaffApi);
  private stream: MediaStream | null = null;
  private decode: Decoder | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly canvas = document.createElement('canvas');
  private last = { code: '', at: 0 };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Code tapé, normalisé comme ceux lus par la caméra. */
  protected manualCode(): string {
    return (this.manual() ?? '').trim().toUpperCase();
  }

  protected validManual(): boolean {
    return TICKET_CODE.test(this.manualCode());
  }

  protected async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.camera.set('unsupported');
      return;
    }
    this.camera.set('starting');
    try {
      this.decode ??= (await import('jsqr')).default as unknown as Decoder;
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      const video = this.video().nativeElement;
      video.srcObject = this.stream;
      await video.play();
      this.camera.set('on');
      this.tick();
    } catch {
      this.stop();
      this.camera.set('denied');
    }
  }

  protected stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.camera() === 'on' || this.camera() === 'starting') {
      this.camera.set('off');
    }
  }

  protected submitManual(): void {
    if (!this.validManual()) {
      return;
    }
    this.submit(this.manualCode());
    this.manual.set('');
  }

  protected tone(r: TicketCheck): string {
    if (r.status === 'scanned') {
      return 'bg-state-success text-onbrand';
    }
    return r.status === 'already_scanned' ? 'bg-state-warning text-ink' : 'bg-state-error text-onbrand';
  }

  private tick(): void {
    this.timer = setTimeout(() => {
      if (this.camera() !== 'on') {
        return;
      }
      const code = this.read();
      if (code && TICKET_CODE.test(code) && !this.action.busy() && (code !== this.last.code || Date.now() - this.last.at > SAME_CODE_MS)) {
        this.last = { code, at: Date.now() };
        this.submit(code);
      }
      this.tick();
    }, FRAME_MS);
  }

  private read(): string | null {
    const video = this.video().nativeElement;
    if (!this.decode || video.readyState < video.HAVE_ENOUGH_DATA || !video.videoWidth) {
      return null;
    }
    const scale = Math.min(1, 640 / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    this.canvas.width = width;
    this.canvas.height = height;
    const context = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return null;
    }
    context.drawImage(video, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    return this.decode(image.data, width, height, { inversionAttempts: 'dontInvert' })?.data.trim().toUpperCase() ?? null;
  }

  private submit(code: string): void {
    this.action.run(this.api.scanTicket(code), (result) => {
      this.result.set(result);
      navigator.vibrate?.(result.status === 'scanned' ? 80 : [80, 60, 80]);
    });
  }
}
