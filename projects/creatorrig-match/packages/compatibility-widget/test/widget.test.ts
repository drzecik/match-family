import { describe, expect, it } from 'vitest';
import { createWidgetViewModel } from '../src/index.js';

describe('compatibility widget view model', () => {
  it('shows a verified relationship with evidence', () => {
    const view = createWidgetViewModel({
      sourceName: 'NovaCam N7',
      targetName: 'ClearLens N23',
      status: 'directly_compatible',
      verificationStatus: 'verified',
      evidenceIds: ['manual'],
      requiredProductNames: [],
      limitations: [],
      sponsored: false,
    });
    expect(view.recommendable).toBe(true);
    expect(view.label).toBe('Zgodne bezpośrednio');
    expect(view.noindex).toBe(false);
  });

  it('never presents a candidate as verified or returns its adapter', () => {
    const view = createWidgetViewModel({
      sourceName: 'A',
      targetName: 'B',
      status: 'candidate',
      verificationStatus: 'candidate',
      evidenceIds: [],
      requiredProductNames: ['Unsafe adapter'],
      limitations: [],
      sponsored: true,
    });
    expect(view.recommendable).toBe(false);
    expect(view.requiredItems).toEqual([]);
    expect(view.label).toBe('Niepotwierdzone');
    expect(view.noindex).toBe(true);
    expect(view.disclosure).toBe('Pozycja sponsorowana');
  });

  it('does not let sponsorship alter compatibility', () => {
    const base = {
      sourceName: 'A',
      targetName: 'B',
      status: 'incompatible' as const,
      verificationStatus: 'verified' as const,
      evidenceIds: ['manual'],
      requiredProductNames: [],
      limitations: ['Conflict'],
    };
    expect(createWidgetViewModel({ ...base, sponsored: true }).tone).toBe('negative');
    expect(createWidgetViewModel({ ...base, sponsored: false }).tone).toBe('negative');
  });
});
