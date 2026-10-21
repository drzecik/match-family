import { describe, expect, it } from 'vitest';
import fullSnapshotJson from '../../../data/generated/snapshot.json' with { type: 'json' };
import type { DataSnapshot } from '@filtermatch/domain';
import { buildDeviceCompatibilityView, isDevicePageIndexable } from './index.js';

const snapshot = (fullSnapshotJson as unknown as { schemaVersion: 2; data: DataSnapshot }).data;
const now = new Date('2026-07-17T12:00:00.000Z');

describe('public compatibility projection', () => {
  it('shows the verified original and replacement but hides the candidate', () => {
    const view = buildDeviceCompatibilityView(snapshot, 'airpure-ap100-pl', now);
    expect(view).not.toBeNull();
    expect(view?.compatible.map(({ consumable }) => consumable.id)).toEqual([
      'airpure-purefilter-100',
      'cleanflow-cf100-replacement'
    ]);
    expect(view?.compatible.some(({ consumable }) => consumable.id.includes('candidate'))).toBe(false);
    expect(view && isDevicePageIndexable(view)).toBe(true);
  });

  it('separates required materials, alternatives and optional accessories', () => {
    const view = buildDeviceCompatibilityView(snapshot, 'homebreeze-hb200-pl', now);
    expect(view?.groups.required.map(({ consumable }) => consumable.id)).toEqual([
      'homebreeze-breeze200-service-kit'
    ]);
    expect(view?.groups.alternative.map(({ consumable }) => consumable.id)).toEqual([
      'cleanflow-cf200-replacement-kit'
    ]);
    expect(view?.groups.optional.map(({ consumable }) => consumable.id)).toEqual([
      'homebreeze-breeze200-seal-frame'
    ]);
    const grouped = [...view!.groups.required, ...view!.groups.alternative, ...view!.groups.optional];
    expect(grouped).toHaveLength(view!.compatible.length);
  });

  it('never presents an optional accessory as a required material', () => {
    const view = buildDeviceCompatibilityView(snapshot, 'homebreeze-hb200-pl', now);
    const accessory = view?.groups.optional.at(0);
    expect(accessory?.consumable.category).toBe('air-purifier-accessory');
    expect(accessory?.edge.relationType).toBe('optional');
    expect(view?.groups.required.some(({ consumable }) => consumable.id === accessory?.consumable.id)).toBe(false);
    expect(view?.groups.alternative.some(({ consumable }) => consumable.id === accessory?.consumable.id)).toBe(false);
  });

  it('keeps the declared composition and quantities of a complete set', () => {
    const view = buildDeviceCompatibilityView(snapshot, 'homebreeze-hb200-pl', now);
    const set = view?.groups.required.at(0);
    expect(set?.consumable.category).toBe('air-purifier-filter-set');
    expect(set?.consumable.includedElements).toEqual([
      { name: 'filtr HEPA Breeze 200 — element demonstracyjny', quantity: 1 },
      { name: 'filtr węglowy Breeze 200 — element demonstracyjny', quantity: 1 }
    ]);
    expect(set?.consumable.includedElements.every(({ quantity }) => quantity >= 1)).toBe(true);
  });

  it('keeps a regional variant on individual elements instead of a set', () => {
    const view = buildDeviceCompatibilityView(snapshot, 'homebreeze-hb200-de', now);
    expect(view?.groups.required.map(({ consumable }) => consumable.id)).toEqual([
      'homebreeze-breeze200-carbon',
      'homebreeze-breeze200-hepa'
    ]);
    expect(view?.groups.optional).toHaveLength(0);
  });

  it('does not make a page indexable without verified compatibility', () => {
    const isolated: DataSnapshot = {
      ...snapshot,
      compatibilityEdges: snapshot.compatibilityEdges.filter(({ verificationStatus }) => verificationStatus === 'candidate')
    };
    const view = buildDeviceCompatibilityView(isolated, 'airpure-ap100-pl', now);
    expect(view?.compatible).toHaveLength(0);
    expect(view && isDevicePageIndexable(view)).toBe(false);
  });
});
