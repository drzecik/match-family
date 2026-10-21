import {
  evaluateCompatibilityForPublication,
  type CompatibilityEdge,
  type Consumable,
  type DataSnapshot,
  type Device,
  type SourceEvidence
} from '@filtermatch/domain';

export interface PublicCompatibilityItem {
  edge: CompatibilityEdge;
  consumable: Consumable;
  evidence: SourceEvidence[];
}

/**
 * Public compatibility items split by the role the material plays for the device.
 * The split is part of the published contract, not a presentation detail: an
 * optional accessory must never be read as a material required for compatibility.
 */
export interface DeviceCompatibilityGroups {
  required: PublicCompatibilityItem[];
  alternative: PublicCompatibilityItem[];
  optional: PublicCompatibilityItem[];
}

export interface DeviceCompatibilityView {
  device: Device;
  compatible: PublicCompatibilityItem[];
  groups: DeviceCompatibilityGroups;
  lastVerifiedAt: string | null;
}

function groupByRelationType(items: PublicCompatibilityItem[]): DeviceCompatibilityGroups {
  const byConsumableId = (left: PublicCompatibilityItem, right: PublicCompatibilityItem): number =>
    left.consumable.id.localeCompare(right.consumable.id, 'en');
  const ofType = (relationType: CompatibilityEdge['relationType']): PublicCompatibilityItem[] =>
    items.filter((item) => item.edge.relationType === relationType).sort(byConsumableId);

  return {
    required: ofType('required'),
    alternative: ofType('alternative'),
    optional: ofType('optional')
  };
}

export function buildDeviceCompatibilityView(
  snapshot: DataSnapshot,
  deviceId: string,
  now = new Date()
): DeviceCompatibilityView | null {
  const device = snapshot.devices.find(({ id }) => id === deviceId);
  if (!device) return null;

  const compatible = snapshot.compatibilityEdges.flatMap((edge) => {
    if (edge.deviceId !== device.id) return [];
    const consumable = snapshot.consumables.find(({ id }) => id === edge.consumableId);
    const evidence = edge.evidenceIds.flatMap((id) => {
      const item = snapshot.sourceEvidence.find((source) => source.id === id);
      return item ? [item] : [];
    });
    const decision = evaluateCompatibilityForPublication(edge, {
      device,
      evidence,
      now,
      ...(consumable ? { consumable } : {})
    });
    return decision.publish && consumable ? [{ edge, consumable, evidence }] : [];
  });

  const dates = compatible.flatMap(({ edge }) => (edge.lastVerifiedAt ? [edge.lastVerifiedAt] : []));
  return {
    device,
    compatible,
    groups: groupByRelationType(compatible),
    lastVerifiedAt: dates.length > 0 ? dates.sort().at(-1) ?? null : device.lastVerifiedAt ?? null
  };
}

export function isDevicePageIndexable(view: DeviceCompatibilityView): boolean {
  return (
    view.device.verificationStatus.startsWith('verified_') &&
    view.compatible.length > 0 &&
    view.compatible.every(({ evidence }) => evidence.length > 0)
  );
}
