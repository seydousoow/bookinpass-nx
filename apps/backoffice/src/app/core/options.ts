import { computed, Signal } from '@angular/core';
import { translateSignal } from '@jsverse/transloco';
import { ISelectOption } from 'models';

/**
 * Options de `bip-select` pour des valeurs fixes, libellées par `<prefix><valeur>` et retraduites au changement de
 * langue. `shown` restreint les valeurs proposées (rôles qu'un manager peut donner…). À appeler dans un contexte
 * d'injection (initialisation d'un champ).
 */
export function translatedOptions<T extends string | number>(values: readonly T[], prefix: string, shown?: Signal<readonly T[]>): Signal<readonly ISelectOption<T>[]> {
  const labels = new Map(values.map((value) => [value, translateSignal(`${prefix}${value}`)]));
  return computed(() =>
    (shown ? shown() : values).flatMap((value) => {
      const label = labels.get(value);
      return label ? [{ value, label: label() }] : [];
    }),
  );
}
