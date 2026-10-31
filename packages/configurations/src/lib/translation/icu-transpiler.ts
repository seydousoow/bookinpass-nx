import { Injectable } from '@angular/core';
import { DefaultTranspiler, getValue, setValue, TranspileParams } from '@jsverse/transloco';
import { IntlMessageFormat } from 'intl-messageformat';

type Params = Record<string, unknown>;

/**
 * Syntaxe ICU (pluriels) sans `eval` : `@messageformat/core` compile chaque message avec `new Function`, que la
 * Content-Security-Policy du site refuse (pas de 'unsafe-eval'). `intl-messageformat` interprète le message.
 * Même comportement que le transpileur de `@jsverse/transloco-messageformat` : `{{ param }}` d'abord, puis ICU.
 */
@Injectable()
export class IcuTranspiler extends DefaultTranspiler {
  /** Langue active, fixée par Transloco à chaque `setActiveLang` (démarrage compris). */
  private locale = 'fr';
  private readonly cache = new Map<string, IntlMessageFormat>();

  override transpile({ value, params = {}, translation, key }: TranspileParams): unknown {
    if (!value) {
      return value;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      let result = value as Params;
      for (const p of Object.keys(params)) {
        const transpiled = super.transpile({ value: getValue(result, p), params: getValue(params, p), translation, key });
        result = setValue(result, p, this.format(transpiled, params[p] as Params));
      }
      return result;
    }
    if (Array.isArray(value)) {
      return value;
    }
    return this.format(super.transpile({ value, params, translation, key }), params);
  }

  onLangChanged(lang: string): void {
    this.locale = lang;
  }

  private format(message: unknown, params: Params | undefined): unknown {
    if (typeof message !== 'string' || !message.includes('{')) {
      return message;
    }
    const cacheKey = `${this.locale}\u0000${message}`;
    let compiled = this.cache.get(cacheKey);
    if (!compiled) {
      // ignoreTag : un `<` du texte reste du texte, pas une balise de texte enrichi.
      compiled = new IntlMessageFormat(message, this.locale, undefined, { ignoreTag: true });
      this.cache.set(cacheKey, compiled);
    }
    try {
      return compiled.format(params ?? {});
    } catch {
      // Paramètre absent : le message brut plutôt qu'une exception qui casserait le gabarit.
      return message;
    }
  }
}
