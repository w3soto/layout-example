import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LayoutService } from './layout.service';

describe('LayoutService', () => {
  let service: LayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(LayoutService);
  });

  it('toggles mini mode on desktop', () => {
    service.isMobile.set(false);
    service.toggle();
    expect(service.mini()).toBe(true);
    expect(service.mobileOpen()).toBe(false);
  });

  it('toggles the overlay on mobile', () => {
    service.isMobile.set(true);
    service.toggle();
    expect(service.mobileOpen()).toBe(true);
    expect(service.mini()).toBe(false);
    service.closeMobile();
    expect(service.mobileOpen()).toBe(false);
  });
});
