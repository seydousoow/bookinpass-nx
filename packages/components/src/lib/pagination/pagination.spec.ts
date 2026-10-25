import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';
import { TranslocoTestingModule } from '@jsverse/transloco';

describe('Pagination', () => {
  let fixture: ComponentFixture<Pagination>;
  let component: Pagination;

  // Access protected members for focused unit tests.
  let instance: any;

  const setTotal = (total: number): void => {
    fixture.componentRef.setInput('total', total);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pagination, TranslocoTestingModule.forRoot({ langs: { fr: {} } })],
    }).compileComponents();

    fixture = TestBed.createComponent(Pagination);
    component = fixture.componentInstance;
    instance = component;

    setTotal(100);
  });

  describe('pageCount', () => {
    it('should calculate the number of pages', () => {
      expect(instance.pageCount()).toBe(7);
    });

    it('should return one page when total is zero', () => {
      setTotal(0);

      expect(instance.pageCount()).toBe(1);
    });

    it('should return one page when total is less than pageSize', () => {
      setTotal(10);

      expect(instance.pageCount()).toBe(1);
    });

    it('should handle an exact multiple of pageSize', () => {
      setTotal(30);

      expect(instance.pageCount()).toBe(2);
    });

    it('should round up when the last page is partially filled', () => {
      setTotal(31);

      expect(instance.pageCount()).toBe(3);
    });
  });

  describe('from', () => {
    it('should return the first item on the first page', () => {
      expect(instance.from()).toBe(1);
    });

    it('should calculate the first item on subsequent pages', () => {
      component.page.set(3);

      expect(instance.from()).toBe(31);
    });
  });

  describe('to', () => {
    it('should return the last item on the first page', () => {
      expect(instance.to()).toBe(15);
    });

    it('should return the last item on a full page', () => {
      component.page.set(3);

      expect(instance.to()).toBe(45);
    });

    it('should not exceed the total number of items', () => {
      component.page.set(7);

      expect(instance.to()).toBe(100);
    });

    it('should return zero when there are no items', () => {
      setTotal(0);

      expect(instance.to()).toBe(0);
    });
  });

  describe('pageClass', () => {
    it('should apply active-page classes when current is true', () => {
      const classes = instance.pageClass(true);

      expect(classes).toContain('bg-brand-primary');
      expect(classes).toContain('text-onbrand');
      expect(classes).toContain('font-semibold');
    });

    it('should apply inactive-page classes when current is false', () => {
      const classes = instance.pageClass(false);

      expect(classes).toContain('text-ink');
      expect(classes).toContain('hover:bg-brand-soft');
      expect(classes).not.toContain('bg-brand-primary');
    });

    it('should always include the base classes', () => {
      const classes = instance.pageClass(true);

      expect(classes).toContain('bip-focusable');
      expect(classes).toContain('size-9');
      expect(classes).toContain('rounded-button');
    });
  });

  describe('navigate', () => {
    it('should navigate to a valid page', () => {
      instance.navigate(3);

      expect(component.page()).toBe(3);
    });

    it('should not navigate to the current page', () => {
      component.page.set(3);

      instance.navigate(3);

      expect(component.page()).toBe(3);
    });

    it('should not navigate below the first page', () => {
      instance.navigate(0);

      expect(component.page()).toBe(1);
    });

    it('should not navigate to a negative page', () => {
      instance.navigate(-1);

      expect(component.page()).toBe(1);
    });

    it('should not navigate beyond the last page', () => {
      instance.navigate(8);

      expect(component.page()).toBe(1);
    });

    it('should allow navigation to the last page', () => {
      instance.navigate(7);

      expect(component.page()).toBe(7);
    });

    it('should not change the current page when navigation is invalid', () => {
      component.page.set(4);

      instance.navigate(8);

      expect(component.page()).toBe(4);
    });
  });

  describe('items', () => {
    it('should calculate visible page items', () => {
      expect(instance.items()).toEqual(expect.any(Array));
    });

    it('should recompute when the current page changes', () => {
      const initialItems = instance.items();

      component.page.set(4);

      expect(instance.items()).not.toBe(initialItems);
    });
  });

  describe('arrowClass', () => {
    it('should contain the expected base and disabled styles', () => {
      expect(instance.arrowClass).toContain('bip-focusable');
      expect(instance.arrowClass).toContain('disabled:cursor-not-allowed');
      expect(instance.arrowClass).toContain('disabled:opacity-40');
      expect(instance.arrowClass).toContain('disabled:hover:bg-transparent');
    });
  });
});
