import { of } from 'rxjs';
import { ActivityDetail, ActivitySlot } from '../../core/models';
import { addDays, addYears, zonedDay } from '../../core/zone';
import { button, get, renderPage, staffApiMock, type } from '../../../testing';
import { ActivitySlots } from './activity-slots';

const ACTIVITY = {
  id: 1,
  city: { id: 2253354, name: 'Dakar', country_code: 'SN', timezone: 'Africa/Dakar' },
  options: [{ id: 11, title: 'Standard', capacity: 20 }],
} as unknown as ActivityDetail;

describe('ActivitySlots', () => {
  const today = zonedDay(new Date().toISOString(), 'Africa/Dakar');
  const slot = (over: Partial<ActivitySlot>): ActivitySlot => ({
    id: 1,
    option_id: 11,
    starts_at: `${today}T23:00:00Z`,
    capacity: 20,
    sold: 3,
    held: 0,
    cancelled_at: null,
    cancel_reason: null,
    ...over,
  });

  it('montre les créneaux du mois sur le calendrier, et ceux du jour choisi', async () => {
    const api = staffApiMock({ slots: () => of([slot({ id: 1 }), slot({ id: 2, starts_at: `${today}T23:30:00Z`, sold: 20 })]) });
    const { element } = await renderPage(ActivitySlots, { api, inputs: { activity: ACTIVITY } });

    // Six semaines demandées d'un coup, pour l'option choisie.
    const [option, from, to] = api.slots.mock.calls.at(-1) ?? [];
    expect(option).toBe(11);
    expect((Date.parse(to) - Date.parse(from)) / 86_400_000).toBe(41);
    const cell = get(element, '[aria-pressed="true"]');
    expect(cell.textContent).toContain('23:00 · 3/20');
    expect(cell.textContent).toContain('23:30 · 20/20');
    // Le jour d'aujourd'hui est ouvert : ses créneaux, avec leurs actions.
    expect(element.textContent).toContain('slots.day-title');
    expect(element.querySelectorAll('input[name^="capacity-"]')).toHaveLength(2);
  });

  it('ouvre des créneaux jusqu’à deux ans à l’avance, pas au-delà', async () => {
    const api = staffApiMock({ openSlots: () => of({ created: 730 }) });
    const { element, stable } = await renderPage(ActivitySlots, { api, inputs: { activity: ACTIVITY } });

    // « 2 ans » : deux années pleines à partir d'aujourd'hui.
    button(element, 'slots.spans.24').click();
    type(get<HTMLInputElement>(element, 'input[name="slot-times"]'), '09:00');
    await stable();
    button(element, 'slots.open-button').click();
    await stable();
    expect(api.openSlots).toHaveBeenCalledWith(11, expect.objectContaining({ from: today, to: addDays(addYears(today, 2), -1), times: ['09:00'] }));
    expect(element.textContent).toContain('slots.opened');

    type(get<HTMLInputElement>(element, 'input[name="slots-to"]'), addYears(today, 3));
    await stable();
    expect(button(element, 'slots.open-button').disabled).toBe(true);
  });
});
