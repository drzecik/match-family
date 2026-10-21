import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calculatePower } from '../packages/calculation-engine/src/index.js';
import {
  evaluatePodcastMobileWorkflow,
  evaluatePowerPath,
  evaluateStorageWorkflow,
  type CardReaderWorkflowProfile,
  type ComputerWorkflowProfile,
  type PodcastAudioInterfaceProfile,
  type PodcastAudioSourceProfile,
  type PodcastMobileHostProfile,
  type PodcastMonitoringProfile,
  type PodcastPowerSourceProfile,
  type StorageMediaWorkflowProfile,
  type WorkflowDockProfile,
  type WorkflowPowerSourceProfile,
} from '../packages/compatibility-evaluator/src/index.js';
import { validateDemoData, type DemoData } from './validate-data.js';

const fixture = JSON.parse(
  readFileSync(new URL('../data/fixtures/demo-catalog.json', import.meta.url), 'utf8'),
) as unknown as DemoData;

function evaluateFixturePowerPath(profileId: string) {
  const profile = fixture.powerPathProfiles.find((item) => item.id === profileId);
  if (!profile) throw new Error(`Missing power profile fixture: ${profileId}`);
  const source = fixture.products.find((product) => product.id === profile.powerSourceId);
  const cable = fixture.products.find((product) => product.id === profile.cableId);
  if (!source?.specs || !cable?.specs) throw new Error(`Missing power products: ${profileId}`);

  return {
    profile,
    source,
    evaluation: evaluatePowerPath(
      {
        id: source.id,
        outputConnector: source.specs.outputConnector ?? '',
        protocol: source.specs.protocol ?? '',
        pdProfiles: source.specs.pdProfiles ?? [],
        maximumPowerWatts: source.specs.maximumPowerWatts ?? Number.NaN,
        evidenceIds: source.specs.evidenceIds ?? [],
      },
      {
        id: cable.id,
        inputConnector: cable.specs.inputConnector ?? '',
        outputConnector: cable.specs.outputConnector ?? '',
        directional: cable.specs.directional ?? true,
        supportedProtocols: cable.specs.supportedProtocols ?? [],
        maxVoltageV: cable.specs.maxVoltageV ?? Number.NaN,
        maxCurrentA: cable.specs.maxCurrentA ?? Number.NaN,
        maxPowerWatts: cable.specs.maximumPowerWatts ?? Number.NaN,
        evidenceIds: cable.specs.evidenceIds ?? [],
      },
      {
        deviceId: profile.deviceId,
        inputConnector: profile.requiredConnector,
        protocol: profile.requiredProtocol,
        requiredVoltageV: profile.requiredVoltageV,
        requiredCurrentA: profile.requiredCurrentA,
        requiredPowerWatts: profile.requiredPowerWatts,
        evidenceIds: profile.evidenceIds,
        conditions: profile.conditions,
        limitations: profile.limitations,
      },
    ),
  };
}

function fixtureProductProfile<T>(id: string): T {
  const product = fixture.products.find((item) => item.id === id);
  if (!product?.specs) throw new Error(`Missing fixture product profile: ${id}`);
  return { id: product.id, ...product.specs } as unknown as T;
}

function evaluateFixtureStorageWorkflow(profileId: string) {
  const profile = fixture.storageWorkflowProfiles.find((item) => item.id === profileId);
  if (!profile) throw new Error(`Missing storage workflow fixture: ${profileId}`);
  return evaluateStorageWorkflow({
    computer: fixtureProductProfile<ComputerWorkflowProfile>(profile.computerId),
    ...(profile.dockId ? { dock: fixtureProductProfile<WorkflowDockProfile>(profile.dockId) } : {}),
    reader: fixtureProductProfile<CardReaderWorkflowProfile>(profile.readerId),
    media: fixtureProductProfile<StorageMediaWorkflowProfile>(profile.mediaId),
    ...(profile.powerSourceId
      ? { powerSource: fixtureProductProfile<WorkflowPowerSourceProfile>(profile.powerSourceId) }
      : {}),
    busProfile: profile.busProfile,
    transferDirection: profile.transferDirection,
    requiredSustainedTransferMBps: profile.requiredSustainedTransferMBps,
    osVersion: profile.osVersion,
    ...(profile.softwareId ? { softwareId: profile.softwareId } : {}),
    claim: profile,
  });
}

function evaluateFixturePodcastWorkflow(profileId: string) {
  const profile = fixture.podcastMobileWorkflowProfiles.find((item) => item.id === profileId);
  if (!profile) throw new Error(`Missing podcast workflow fixture: ${profileId}`);
  return evaluatePodcastMobileWorkflow({
    host: fixtureProductProfile<PodcastMobileHostProfile>(profile.hostId),
    audioInterface: fixtureProductProfile<PodcastAudioInterfaceProfile>(profile.interfaceId),
    sources: profile.sourceIds.map((id) => fixtureProductProfile<PodcastAudioSourceProfile>(id)),
    ...(profile.monitoringId
      ? { monitoring: fixtureProductProfile<PodcastMonitoringProfile>(profile.monitoringId) }
      : {}),
    ...(profile.powerSourceId
      ? { powerSource: fixtureProductProfile<PodcastPowerSourceProfile>(profile.powerSourceId) }
      : {}),
    busProfile: profile.busProfile,
    audioProtocol: profile.audioProtocol,
    sampleRateHz: profile.sampleRateHz,
    bitDepth: profile.bitDepth,
    channelCount: profile.channelCount,
    osVersion: profile.osVersion,
    appId: profile.appId,
    claim: profile,
  });
}

describe('publication data validation', () => {
  it('accepts the guarded synthetic fixture', () => expect(validateDemoData(fixture)).toEqual([]));
  it('blocks a candidate presented as verified', () => {
    const changed: DemoData = {
      ...fixture,
      compatibilityEdges: fixture.compatibilityEdges.map((edge) =>
        edge.id === 'pocket-shot-candidate' ? { ...edge, verificationStatus: 'verified' } : edge,
      ),
    };
    expect(validateDemoData(changed)).toContain('Candidate marked verified: pocket-shot-candidate');
  });
  it('blocks publication without a source', () => {
    const changed: DemoData = {
      ...fixture,
      compatibilityEdges: fixture.compatibilityEdges.map((edge, index) =>
        index === 0 ? { ...edge, evidenceIds: [] } : edge,
      ),
    };
    expect(validateDemoData(changed)).toContain('Verified edge without evidence: n7-shot-s');
  });
  it('blocks a camera whose optical facts are incomplete', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'novacam-n7'
          ? { ...product, specs: { ...product.specs, lensMount: '' } }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain('Camera has incomplete optical facts: novacam-n7');
  });
  it('blocks an M1 audio source without scoped evidence', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'echomic-shot-s'
          ? { ...product, specs: { ...product.specs, evidenceIds: [] } }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'M1 audio source lacks verified scoped evidence: echomic-shot-s',
    );
  });
  it('blocks an audio adapter with unknown plug-in-power pass-through', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) => {
        if (product.id !== 'echomic-trrs-trs-adapter') return product;
        const { passesPlugInPower: _removed, ...specs } = product.specs ?? {};
        void _removed;
        return { ...product, specs };
      }),
    };
    expect(validateDemoData(changed)).toContain(
      'Audio adapter has incomplete directional power facts: echomic-trrs-trs-adapter',
    );
  });
  it('blocks a recording card without a positive sustained-write guarantee', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'swiftcard-v90-128'
          ? { ...product, specs: { ...product.specs, sustainedWriteMBps: 0 } }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Recording card has incomplete capacity or sustained-write facts: swiftcard-v90-128',
    );
  });
  it('blocks a recording mode without official memory evidence', () => {
    const changed: DemoData = {
      ...fixture,
      recordingModes: fixture.recordingModes.map((mode) =>
        mode.id === 'n7-4k25' ? { ...mode, evidenceIds: ['ev-echomic-guide'] } : mode,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Recording mode lacks verified memory evidence: n7-4k25',
    );
  });
  it('blocks a gimbal without verified mechanical evidence', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'motionrig-flow-pro'
          ? { ...product, specs: { ...product.specs, evidenceIds: [] } }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Gimbal lacks verified mechanical evidence: motionrig-flow-pro',
    );
  });
  it('blocks a rig geometry profile with a dangling product', () => {
    const changed: DemoData = {
      ...fixture,
      gimbalRigProfiles: fixture.gimbalRigProfiles.map((profile) =>
        profile.id === 'profile-n7-n23' ? { ...profile, deviceId: 'missing-camera' } : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Gimbal rig profile references unknown product: profile-n7-n23',
    );
  });
  it('blocks a cage without verified mechanical evidence', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'motionrig-n7-form-cage'
          ? { ...product, specs: { ...product.specs, evidenceIds: [] } }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Cage lacks verified mechanical evidence: motionrig-n7-form-cage',
    );
  });
  it('blocks a cage whose exact compatible device is missing', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'motionrig-n7-form-cage'
          ? {
              ...product,
              specs: { ...product.specs, compatibleDeviceIds: ['missing-camera'] },
            }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Cage lacks exact compatible devices: motionrig-n7-form-cage',
    );
  });
  it('blocks overlapping compatible and incompatible cage body declarations', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'motionrig-n7-form-cage'
          ? {
              ...product,
              specs: { ...product.specs, incompatibleDeviceIds: ['novacam-n7'] },
            }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Cage device declarations overlap: motionrig-n7-form-cage',
    );
  });
  it('blocks a cage rig profile without scoped mechanical evidence', () => {
    const changed: DemoData = {
      ...fixture,
      cageRigProfiles: fixture.cageRigProfiles.map((profile) =>
        profile.id === 'cage-profile-n7-travel' ? { ...profile, evidenceIds: [] } : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Cage rig profile lacks verified mechanical evidence: cage-profile-n7-travel',
    );
  });
  it('blocks duplicate exact cage rig profiles', () => {
    const original = fixture.cageRigProfiles[0];
    if (!original) throw new Error('Missing cage rig profile fixture.');
    const changed: DemoData = {
      ...fixture,
      cageRigProfiles: [...fixture.cageRigProfiles, { ...original, id: 'duplicate-cage-profile' }],
    };
    expect(validateDemoData(changed)).toContain(
      'Duplicate exact cage rig profile: duplicate-cage-profile',
    );
  });
  it('blocks reuse of cage-bound gimbal geometry with the wrong body', () => {
    const changed: DemoData = {
      ...fixture,
      gimbalRigProfiles: fixture.gimbalRigProfiles.map((profile) =>
        profile.id === 'profile-n7-n23' ? { ...profile, deviceId: 'novacam-x1' } : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Gimbal rig profile cage does not fit device: profile-n7-n23',
    );
  });
  it('blocks a selected cage from reusing a bare-rig gimbal profile', () => {
    const changed: DemoData = {
      ...fixture,
      gimbalRigProfiles: fixture.gimbalRigProfiles.map((profile) =>
        profile.id === 'profile-n7-n23'
          ? {
              id: profile.id,
              deviceId: profile.deviceId,
              ...(profile.lensId ? { lensId: profile.lensId } : {}),
              audioId: profile.audioId,
              ...(profile.mediaId ? { mediaId: profile.mediaId } : {}),
              cameraMount: profile.cameraMount,
              packageWidthMm: profile.packageWidthMm,
              packageHeightMm: profile.packageHeightMm,
              packageDepthMm: profile.packageDepthMm,
              centerOfGravityOffsetMm: profile.centerOfGravityOffsetMm,
              conditions: profile.conditions,
              evidenceIds: profile.evidenceIds,
              synthetic: true,
              notForProduction: true,
            }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Rig with cage lacks cage-bound gimbal geometry: complete-travel-rig',
    );
  });
  it('blocks power sources without valid energy and efficiency data', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'powerframe-pd-72'
          ? {
              ...product,
              specs: { ...product.specs, energyWh: 0, efficiencyPercent: 101 },
            }
          : product,
      ),
    };
    const errors = validateDemoData(changed);
    expect(errors).toContain('Power source has invalid energy capacity: powerframe-pd-72');
    expect(errors).toContain('Power source has invalid efficiency: powerframe-pd-72');
  });
  it('requires official electrical evidence for positive source facts', () => {
    const changed: DemoData = {
      ...fixture,
      evidence: fixture.evidence.map((evidence) =>
        evidence.id === 'ev-powerframe-pd72-spec'
          ? { ...evidence, sourceType: 'independent_test' }
          : evidence,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Power source lacks verified official electrical evidence: powerframe-pd-72',
    );
  });
  it('blocks a cable without an exact protocol declaration', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'powerframe-usbc-pd-60-cable'
          ? { ...product, specs: { ...product.specs, supportedProtocols: [] } }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Power cable has incomplete connector or rating facts: powerframe-usbc-pd-60-cable',
    );
  });
  it('requires exact power source and cable references', () => {
    const changed: DemoData = {
      ...fixture,
      powerPathProfiles: fixture.powerPathProfiles.map((profile) =>
        profile.id === 'power-path-n7-pd72-usbc'
          ? { ...profile, cableId: 'echomic-patch-35' }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Power path profile references wrong or unknown products: power-path-n7-pd72-usbc',
    );
  });
  it('blocks power paths without explicit limitations', () => {
    const changed: DemoData = {
      ...fixture,
      powerPathProfiles: fixture.powerPathProfiles.map((profile) =>
        profile.id === 'power-path-n7-pd72-usbc' ? { ...profile, limitations: [] } : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Power path profile lacks explicit conditions or limitations: power-path-n7-pd72-usbc',
    );
  });
  it('validates the power profile collection as an array', () => {
    const changed = { ...fixture, powerPathProfiles: undefined } as unknown as DemoData;

    expect(validateDemoData(changed)).toContain('Demo dataset powerPathProfiles must be an array.');
  });
  it('never treats an unknown or missing exact path as a rig recommendation', () => {
    const changed: DemoData = {
      ...fixture,
      powerPathProfiles: fixture.powerPathProfiles.filter(
        (profile) => profile.id !== 'power-path-n7-pd72-usbc',
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Rig power recommendation lacks one exact confirmed path: complete-travel-rig',
    );
  });
  it('does not recommend the explicitly incompatible legacy source', () => {
    const changed: DemoData = {
      ...fixture,
      rigs: fixture.rigs.map((rig) =>
        rig.id === 'complete-travel-rig'
          ? {
              ...rig,
              selectedProductIds: rig.selectedProductIds.map((id) =>
                id === 'powerframe-pd-72' ? 'powerframe-legacy-5' : id,
              ),
            }
          : rig,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Rig power recommendation lacks one exact confirmed path: complete-travel-rig',
    );
  });
  it('contains a broad, fully flagged M2 accessory catalogue', () => {
    const count = (subcategory: string): number =>
      fixture.products.filter((product) => product.subcategory === subcategory).length;

    expect(count('round_filter')).toBeGreaterThanOrEqual(4);
    expect(count('step_up_ring')).toBeGreaterThanOrEqual(3);
    expect(count('matte_box')).toBeGreaterThanOrEqual(2);
    expect(count('gimbal')).toBeGreaterThanOrEqual(4);
    expect(count('cage')).toBeGreaterThanOrEqual(4);
    expect(count('power_bank')).toBeGreaterThanOrEqual(4);
    expect(count('usb_c_cable')).toBeGreaterThanOrEqual(3);
    expect(fixture.products.every((product) => product.synthetic && product.notForProduction)).toBe(
      true,
    );
  });
  it('requires official mechanical and optical evidence for a published filter path', () => {
    const changed: DemoData = {
      ...fixture,
      filterRigProfiles: fixture.filterRigProfiles.map((profile) =>
        profile.id === 'filter-profile-n23-protect49-direct'
          ? { ...profile, evidenceIds: [] }
          : profile,
      ),
    };

    expect(validateDemoData(changed)).toContain(
      'Verified filter rig profile lacks official scoped evidence: filter-profile-n23-protect49-direct',
    );
  });
  it('requires device-scoped optical evidence for a published filter path', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'novacam-n7'
          ? { ...product, specs: { ...product.specs, evidenceIds: [] } }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Verified filter rig profile lacks device optical evidence: filter-profile-n23-protect49-direct',
    );
  });
  it('blocks a filter product whose exact dimensions lack scoped evidence', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'clearfilter-protect-49'
          ? { ...product, specs: { ...product.specs, evidenceIds: [] } }
          : product,
      ),
    };

    expect(validateDemoData(changed)).toContain(
      'Round filter lacks verified official mechanical and optical evidence: clearfilter-protect-49',
    );
  });
  it('blocks a step-up ring without an exact direction', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'clearfilter-step-up-49-67'
          ? { ...product, specs: { ...product.specs, directional: false } }
          : product,
      ),
    };

    expect(validateDemoData(changed)).toContain(
      'Step-up ring has invalid directional dimensions: clearfilter-step-up-49-67',
    );
  });
  it('blocks a positive filter status when the exact diameters do not fit', () => {
    const changed: DemoData = {
      ...fixture,
      filterRigProfiles: fixture.filterRigProfiles.map((profile) =>
        profile.id === 'filter-profile-l50-cpl82-wrong-ring'
          ? {
              ...profile,
              expectedStatus: 'compatible_with_adapter',
              collisionStatus: 'clear',
              vignettingStatus: 'clear',
            }
          : profile,
      ),
    };
    const errors = validateDemoData(changed);

    expect(errors).toContain(
      'Filter rig false-positive compatibility: filter-profile-l50-cpl82-wrong-ring',
    );
    expect(errors).toContain(
      'Adapter filter rig requires an exact directional ring path: filter-profile-l50-cpl82-wrong-ring',
    );
  });
  it('blocks a false clear-aperture claim that would vignette', () => {
    const changed: DemoData = {
      ...fixture,
      filterRigProfiles: fixture.filterRigProfiles.map((profile) =>
        profile.id === 'filter-profile-n23-narrow-vignetting'
          ? {
              ...profile,
              expectedStatus: 'directly_compatible',
              collisionStatus: 'clear',
              vignettingStatus: 'clear',
            }
          : profile,
      ),
    };

    expect(validateDemoData(changed)).toContain(
      'Filter rig false-positive compatibility: filter-profile-n23-narrow-vignetting',
    );
  });
  it('requires an exact device sensor and lens image-circle scope', () => {
    const changed: DemoData = {
      ...fixture,
      filterRigProfiles: fixture.filterRigProfiles.map((profile) =>
        profile.id === 'filter-profile-n23-protect49-direct'
          ? { ...profile, deviceId: 'novacam-x1', sensorDiagonalMm: 43.3 }
          : profile,
      ),
    };
    const errors = validateDemoData(changed);

    expect(errors).toContain(
      'Filter rig profile has invalid sensor or image-circle scope: filter-profile-n23-protect49-direct',
    );
    expect(errors).toContain(
      'Filter rig false-positive compatibility: filter-profile-n23-protect49-direct',
    );
  });
  it('keeps an unknown filter candidate wholly unknown and non-publishable', () => {
    const changed: DemoData = {
      ...fixture,
      filterRigProfiles: fixture.filterRigProfiles.map((profile) =>
        profile.id === 'filter-profile-l50-matte95-candidate'
          ? {
              ...profile,
              expectedStatus: 'directly_compatible',
              publicationStatus: 'verified',
              collisionStatus: 'clear',
              vignettingStatus: 'clear',
            }
          : profile,
      ),
    };
    const errors = validateDemoData(changed);

    expect(errors).toContain(
      'Verified filter rig profile lacks official scoped evidence: filter-profile-l50-matte95-candidate',
    );
    expect(errors).toContain(
      'Filter rig false-positive compatibility: filter-profile-l50-matte95-candidate',
    );
  });
  it('blocks an incompatible filter status without a measured conflict', () => {
    const changed: DemoData = {
      ...fixture,
      filterRigProfiles: fixture.filterRigProfiles.map((profile) =>
        profile.id === 'filter-profile-n23-protect49-direct'
          ? {
              ...profile,
              expectedStatus: 'incompatible',
              collisionStatus: 'conflict',
              limitations: ['Nieudokumentowany konflikt.'],
            }
          : profile,
      ),
    };

    expect(validateDemoData(changed)).toContain(
      'Incompatible filter rig lacks an exact documented conflict: filter-profile-n23-protect49-direct',
    );
  });
  it('blocks wrong product references and duplicate exact filter profiles', () => {
    const direct = fixture.filterRigProfiles.find(
      (profile) => profile.id === 'filter-profile-n23-protect49-direct',
    );
    const stepUp = fixture.filterRigProfiles.find(
      (profile) => profile.id === 'filter-profile-n23-vnd67-stepup',
    );
    if (!direct || !stepUp) throw new Error('Missing filter profile fixtures.');
    const changed: DemoData = {
      ...fixture,
      filterRigProfiles: [
        ...fixture.filterRigProfiles.map((profile) =>
          profile.id === direct.id ? { ...profile, filterId: 'echomic-shot-s' } : profile,
        ),
        { ...stepUp, id: 'filter-profile-duplicate' },
      ],
    };
    const errors = validateDemoData(changed);

    expect(errors).toContain(
      'Filter rig profile references wrong or unknown products: filter-profile-n23-protect49-direct',
    );
    expect(errors).toContain('Duplicate exact filter rig profile: filter-profile-duplicate');
  });
  it('validates the filter profile collection as an array', () => {
    const changed = { ...fixture, filterRigProfiles: undefined } as unknown as DemoData;

    expect(validateDemoData(changed)).toContain('Demo dataset filterRigProfiles must be an array.');
  });
  it('blocks a rig from selecting an unknown filter candidate', () => {
    const changed: DemoData = {
      ...fixture,
      rigs: fixture.rigs.map((rig) =>
        rig.id === 'complete-travel-rig'
          ? {
              ...rig,
              selectedProductIds: rig.selectedProductIds
                .filter((id) => id !== 'clearfilter-vnd-67' && id !== 'clearfilter-step-up-49-67')
                .concat(['clearfilter-cpl-82', 'motionrig-matte-cine-95-candidate']),
            }
          : rig,
      ),
    };

    expect(validateDemoData(changed)).toContain(
      'Rig filter recommendation lacks one exact verified profile: complete-travel-rig',
    );
  });
  it('requires gimbal geometry scoped to selected filter accessories', () => {
    const changed: DemoData = {
      ...fixture,
      gimbalRigProfiles: fixture.gimbalRigProfiles.map((profile) =>
        profile.id === 'profile-n7-n23'
          ? { ...profile, filterId: undefined, stepUpRingId: undefined }
          : profile,
      ),
    };

    expect(validateDemoData(changed)).toContain(
      'Rig with cage lacks cage-bound gimbal geometry: complete-travel-rig',
    );
  });
  it('contains complete flagged M3 catalogues, templates, and rigs', () => {
    const subcategories = (names: readonly string[]): number =>
      fixture.products.filter((product) => names.includes(product.subcategory)).length;
    expect(
      subcategories(['led_panel', 'cob_light', 'softbox', 'lighting_grid']),
    ).toBeGreaterThanOrEqual(5);
    expect(
      subcategories([
        'field_monitor',
        'external_recorder',
        'capture_card',
        'streaming_device',
        'hdmi_cable',
      ]),
    ).toBeGreaterThanOrEqual(7);
    expect(subcategories(['tripod', 'tripod_head', 'teleprompter'])).toBeGreaterThanOrEqual(6);
    expect(fixture.videoPathProfiles).toHaveLength(7);
    expect(fixture.supportRigProfiles).toHaveLength(8);
    expect(fixture.lightingRigProfiles).toHaveLength(6);
    expect(fixture.useCaseTemplates.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'studio-youtube-demo',
        'live-stream-demo',
        'single-interview-demo',
        'product-video-demo',
      ]),
    );
    expect(fixture.rigs.length).toBeGreaterThanOrEqual(9);
  });
  it('requires official signal and electrical evidence for a verified video path', () => {
    const changed: DemoData = {
      ...fixture,
      videoPathProfiles: fixture.videoPathProfiles.map((profile) =>
        profile.id === 'video-n7-field5-4k30' ? { ...profile, evidenceIds: [] } : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Verified video path lacks official scoped evidence: video-n7-field5-4k30',
    );
  });
  it('blocks connector-shaped HDMI that lacks the requested protocol and exact mode', () => {
    const changed: DemoData = {
      ...fixture,
      videoPathProfiles: fixture.videoPathProfiles.map((profile) =>
        profile.id === 'video-n7-rec7-legacy-cable-conflict'
          ? {
              ...profile,
              expectedStatus: 'directly_compatible',
              signalStatus: 'clear',
              safetyStatus: 'clear',
            }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Video path false-positive compatibility: video-n7-rec7-legacy-cable-conflict',
    );
  });
  it('never publishes a candidate video negotiation as compatible', () => {
    const changed: DemoData = {
      ...fixture,
      videoPathProfiles: fixture.videoPathProfiles.map((profile) =>
        profile.id === 'video-x1-capture-u4-candidate'
          ? { ...profile, expectedStatus: 'directly_compatible' }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Video candidate must remain wholly unknown and non-publishable: video-x1-capture-u4-candidate',
    );
  });
  it('recalculates exact support payload instead of trusting imported totals', () => {
    const changed: DemoData = {
      ...fixture,
      supportRigProfiles: fixture.supportRigProfiles.map((profile) =>
        profile.id === 'support-n7-field6-fluid5'
          ? { ...profile, totalPayloadGrams: 800 }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Support rig profile has an incorrect exact payload: support-n7-field6-fluid5',
    );
  });
  it('blocks a payload and thread conflict presented as safe support', () => {
    const changed: DemoData = {
      ...fixture,
      supportRigProfiles: fixture.supportRigProfiles.map((profile) =>
        profile.id === 'support-n7-desk15-mini-conflict'
          ? {
              ...profile,
              expectedStatus: 'directly_compatible',
              mountStatus: 'clear',
              payloadStatus: 'clear',
              collisionStatus: 'clear',
            }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Support rig false-positive compatibility: support-n7-desk15-mini-conflict',
    );
  });
  it('blocks an incorrect lighting voltage path presented as safe', () => {
    const changed: DemoData = {
      ...fixture,
      lightingRigProfiles: fixture.lightingRigProfiles.map((profile) =>
        profile.id === 'lighting-c120-wrong-voltage-conflict'
          ? {
              ...profile,
              expectedStatus: 'directly_compatible',
              electricalStatus: 'clear',
              collisionStatus: 'clear',
            }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Lighting rig false-positive compatibility: lighting-c120-wrong-voltage-conflict',
    );
  });
  it('blocks an overloaded lighting stand presented as safe', () => {
    const changed: DemoData = {
      ...fixture,
      lightingRigProfiles: fixture.lightingRigProfiles.map((profile) =>
        profile.id === 'lighting-c120-desk-payload-conflict'
          ? {
              ...profile,
              expectedStatus: 'directly_compatible',
              payloadStatus: 'clear',
              collisionStatus: 'clear',
            }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Lighting rig false-positive compatibility: lighting-c120-desk-payload-conflict',
    );
  });
  it('rejects candidate lighting control from complete rigs', () => {
    const changed: DemoData = {
      ...fixture,
      rigs: fixture.rigs.map((rig) =>
        rig.id === 'complete-live-stream-rig'
          ? {
              ...rig,
              selectedProductIds: rig.selectedProductIds.map((id) =>
                id === 'lumaforge-control-bt' ? 'lumaforge-control-wifi-candidate' : id,
              ),
            }
          : rig,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Rig lighting lacks one exact verified profile: complete-live-stream-rig',
    );
  });
  it('requires all M3 profile collections', () => {
    const changed = {
      ...fixture,
      videoPathProfiles: undefined,
      supportRigProfiles: undefined,
      lightingRigProfiles: undefined,
    } as unknown as DemoData;
    const errors = validateDemoData(changed);
    expect(errors).toEqual(
      expect.arrayContaining([
        'Demo dataset videoPathProfiles must be an array.',
        'Demo dataset supportRigProfiles must be an array.',
        'Demo dataset lightingRigProfiles must be an array.',
      ]),
    );
  });
  it('contains complete flagged M4 catalogues and exactly ten use cases', () => {
    const count = (subcategory: string): number =>
      fixture.products.filter((product) => product.subcategory === subcategory).length;
    expect(count('computer')).toBeGreaterThanOrEqual(2);
    expect(count('dock')).toBeGreaterThanOrEqual(2);
    expect(count('card_reader')).toBeGreaterThanOrEqual(3);
    expect(count('ssd')).toBeGreaterThanOrEqual(2);
    expect(count('audio_interface')).toBeGreaterThanOrEqual(2);
    expect(count('xlr_microphone')).toBeGreaterThanOrEqual(3);
    expect(count('xlr_cable')).toBeGreaterThanOrEqual(3);
    expect(fixture.storageWorkflowProfiles).toHaveLength(6);
    expect(fixture.podcastMobileWorkflowProfiles).toHaveLength(5);
    expect(fixture.useCaseTemplates).toHaveLength(10);
    expect(fixture.useCaseTemplates.map((item) => item.useCase)).toEqual(
      expect.arrayContaining(['vlog', 'two_person_interview', 'podcast', 'event_recording']),
    );
  });
  it('requires official scoped evidence for verified storage claims', () => {
    const changed: DemoData = {
      ...fixture,
      storageWorkflowProfiles: fixture.storageWorkflowProfiles.map((profile) =>
        profile.id === 'storage-air-sd-direct' ? { ...profile, evidenceIds: [] } : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Verified storage workflow lacks official scoped evidence: storage-air-sd-direct',
    );
  });
  it('requires memory evidence on the exact selected medium', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'swiftcard-v90-1024'
          ? { ...product, specs: { ...product.specs, evidenceIds: [] } }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Storage workflow media lacks verified memory evidence: storage-air-sd-direct',
    );
  });
  it('does not infer Thunderbolt from a USB-C connector', () => {
    const changed: DemoData = {
      ...fixture,
      storageWorkflowProfiles: fixture.storageWorkflowProfiles.map((profile) =>
        profile.id === 'storage-air-tb4-conflict'
          ? { ...profile, expectedStatus: 'directly_compatible' }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Storage workflow false-positive compatibility: storage-air-tb4-conflict',
    );
  });
  it('blocks a dock path whose exact external source is omitted', () => {
    const changed: DemoData = {
      ...fixture,
      storageWorkflowProfiles: fixture.storageWorkflowProfiles.map((profile) =>
        profile.id === 'storage-studio-cfxb-ingest'
          ? { ...profile, powerSourceId: undefined }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Storage workflow false-positive compatibility: storage-studio-cfxb-ingest',
    );
  });
  it('never publishes a candidate storage workflow', () => {
    const changed: DemoData = {
      ...fixture,
      storageWorkflowProfiles: fixture.storageWorkflowProfiles.map((profile) =>
        profile.id === 'storage-future-os-candidate'
          ? { ...profile, expectedStatus: 'directly_compatible' }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Storage candidate must remain unknown and non-publishable: storage-future-os-candidate',
    );
  });
  it('requires official scoped evidence for a verified podcast claim', () => {
    const changed: DemoData = {
      ...fixture,
      podcastMobileWorkflowProfiles: fixture.podcastMobileWorkflowProfiles.map((profile) =>
        profile.id === 'podcast-studio-duo-two-xlr' ? { ...profile, evidenceIds: [] } : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Verified podcast workflow lacks official scoped evidence: podcast-studio-duo-two-xlr',
    );
  });
  it('blocks insufficient mobile bus power presented as compatible', () => {
    const changed: DemoData = {
      ...fixture,
      podcastMobileWorkflowProfiles: fixture.podcastMobileWorkflowProfiles.map((profile) =>
        profile.id === 'podcast-pocket-solo-power-conflict'
          ? { ...profile, expectedStatus: 'directly_compatible' }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Podcast workflow false-positive compatibility: podcast-pocket-solo-power-conflict',
    );
  });
  it('blocks three XLR sources on a two-channel interface', () => {
    const changed: DemoData = {
      ...fixture,
      podcastMobileWorkflowProfiles: fixture.podcastMobileWorkflowProfiles.map((profile) =>
        profile.id === 'podcast-studio-three-channel-conflict'
          ? { ...profile, expectedStatus: 'directly_compatible' }
          : profile,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Podcast workflow false-positive compatibility: podcast-studio-three-channel-conflict',
    );
  });
  it('blocks missing exact XLR cable from a complete podcast rig', () => {
    const changed: DemoData = {
      ...fixture,
      rigs: fixture.rigs.map((rig) =>
        rig.id === 'complete-podcast-rig'
          ? {
              ...rig,
              selectedProductIds: rig.selectedProductIds.filter(
                (id) => id !== 'echomic-xlr-cable-b',
              ),
            }
          : rig,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Rig podcast workflow lacks one exact verified profile: complete-podcast-rig',
    );
  });
  it('requires every new M4 template to have one exact complete rig', () => {
    const changed: DemoData = {
      ...fixture,
      rigs: fixture.rigs.filter((rig) => rig.id !== 'complete-event-recording-rig'),
    };
    expect(validateDemoData(changed)).toContain(
      'M4 use-case template lacks one exact complete rig: event-recording-demo',
    );
  });
  it('rejects a rig fixture whose selected card cannot cover its planned duration', () => {
    const changed: DemoData = {
      ...fixture,
      rigs: fixture.rigs.map((rig) =>
        rig.id === 'complete-travel-rig' ? { ...rig, plannedDurationMinutes: 600 } : rig,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Rig media capacity does not cover planned duration with margin: complete-travel-rig',
    );
  });
  it('rejects a rig fixture whose selected card is too slow after safety margin', () => {
    const changed: DemoData = {
      ...fixture,
      products: fixture.products.map((product) =>
        product.id === 'swiftcard-v90-512'
          ? { ...product, specs: { ...product.specs, sustainedWriteMBps: 80 } }
          : product,
      ),
    };
    expect(validateDemoData(changed)).toContain(
      'Rig media cannot sustain recording mode with margin: complete-travel-rig',
    );
  });
  it('requires both M4 workflow collections', () => {
    const changed = {
      ...fixture,
      storageWorkflowProfiles: undefined,
      podcastMobileWorkflowProfiles: undefined,
    } as unknown as DemoData;
    expect(validateDemoData(changed)).toEqual(
      expect.arrayContaining([
        'Demo dataset storageWorkflowProfiles must be an array.',
        'Demo dataset podcastMobileWorkflowProfiles must be an array.',
      ]),
    );
  });
  it('runs the verified storage fixture through the production evaluator', () => {
    const result = evaluateFixtureStorageWorkflow('storage-studio-cfxb-ingest');
    expect(result.status).toBe('compatible_with_limitations');
    expect(result.effectiveSustainedTransferMBps).toBe(1700);
    expect(result.requiredItemIds).toEqual(
      expect.arrayContaining([
        'datadock-pro-tb4',
        'swiftreader-cfxb-pro',
        'swiftcard-cfxb-256',
        'powerframe-dock-100',
      ]),
    );
  });
  it('keeps storage conflicts and candidates fail-closed in the production evaluator', () => {
    expect(evaluateFixtureStorageWorkflow('storage-air-tb4-conflict').status).toBe('incompatible');
    expect(evaluateFixtureStorageWorkflow('storage-future-os-candidate').status).toBe('unknown');
    expect(evaluateFixtureStorageWorkflow('storage-future-os-candidate').requiredItemIds).toEqual(
      [],
    );
  });
  it('runs the verified two-XLR podcast fixture through the production evaluator', () => {
    const result = evaluateFixturePodcastWorkflow('podcast-studio-duo-two-xlr');
    expect(result.status).toBe('compatible_with_limitations');
    expect(result.requiredSustainedAudioMBps).toBeCloseTo(0.288);
    expect(result.requiredItemIds).toEqual(
      expect.arrayContaining([
        'echocast-duo-x',
        'echomic-studio-c1',
        'echomic-studio-c2',
        'echomic-monitor-h80',
        'powerframe-audio-30',
      ]),
    );
  });
  it('keeps mobile-power conflicts and podcast candidates fail-closed', () => {
    expect(evaluateFixturePodcastWorkflow('podcast-pocket-solo-power-conflict').status).toBe(
      'incompatible',
    );
    const candidate = evaluateFixturePodcastWorkflow('podcast-pocket-condenser-candidate');
    expect(candidate.status).toBe('unknown');
    expect(candidate.requiredItemIds).toEqual([]);
  });
  it('integrates the exact verified USB PD fixture with the deterministic evaluator', () => {
    const { evaluation } = evaluateFixturePowerPath('power-path-n7-pd72-usbc');

    expect(evaluation.status).toBe('compatible_with_limitations');
    expect(evaluation.selectedPdProfile).toEqual({ voltageV: 9, maxCurrentA: 3 });
    expect(evaluation.dimensions.connectorDirection.status).toBe('compatible');
    expect(evaluation.dimensions.protocolProfile.status).toBe('compatible');
    expect(evaluation.dimensions.electricalEvidence.status).toBe('compatible');
  });
  it('carries backup power in the travel rig while documenting off-gimbal operation', () => {
    const template = fixture.useCaseTemplates.find((item) => item.id === 'travel-vlog-demo');
    const rig = fixture.rigs.find((item) => item.id === 'complete-travel-rig');
    const mechanicalProfile = fixture.gimbalRigProfiles.find(
      (item) => item.id === 'profile-n7-n23',
    );

    expect(template?.defaultProductIds).toEqual(
      expect.arrayContaining(['powerframe-pd-72', 'powerframe-usbc-pd-60-cable']),
    );
    expect(rig?.selectedProductIds).toEqual(
      expect.arrayContaining(['powerframe-pd-72', 'powerframe-usbc-pd-60-cable']),
    );
    expect(
      mechanicalProfile?.conditions.some((condition) => condition.includes('poza gimbalem')),
    ).toBe(true);
  });
  it('keeps the exact legacy 5 V non-PD fixture incompatible', () => {
    const { evaluation } = evaluateFixturePowerPath('power-path-n7-legacy5-usbc');

    expect(evaluation.status).toBe('incompatible');
    expect(evaluation.dimensions.protocolProfile.status).toBe('incompatible');
    expect(evaluation.selectedPdProfile).toBeUndefined();
  });
  it('calculates runtime only after the exact path is confirmed', () => {
    const compatible = evaluateFixturePowerPath('power-path-n7-pd72-usbc');
    const incompatible = evaluateFixturePowerPath('power-path-n7-legacy5-usbc');
    const canEstimate = (status: string): boolean =>
      status === 'directly_compatible' || status === 'compatible_with_limitations';

    const runtime = canEstimate(compatible.evaluation.status)
      ? calculatePower({
          loads: [
            {
              id: compatible.profile.deviceId,
              powerWatts: compatible.profile.deviceTypicalPowerWatts,
              acceptedVoltage: {
                min: compatible.profile.requiredVoltageV,
                max: compatible.profile.requiredVoltageV,
              },
              requiredPdProfile: `${compatible.profile.requiredVoltageV}V/${compatible.profile.requiredCurrentA}A`,
            },
          ],
          source: {
            id: compatible.source.id,
            outputVoltage: compatible.profile.requiredVoltageV,
            maxOutputWatts: compatible.source.specs?.maximumPowerWatts ?? Number.NaN,
            energyWh: compatible.source.specs?.energyWh ?? Number.NaN,
            efficiencyPercent: compatible.source.specs?.efficiencyPercent ?? Number.NaN,
            supportedPdProfiles: [
              `${compatible.profile.requiredVoltageV}V/${compatible.profile.requiredCurrentA}A`,
            ],
          },
        })
      : undefined;
    const unsafeRuntime = canEstimate(incompatible.evaluation.status)
      ? calculatePower({ loads: [] })
      : undefined;

    expect(runtime?.status).toBe('complete');
    expect(runtime?.value?.safetyStatus).toBe('compatible');
    expect(runtime?.value?.estimatedRuntimeHours).toBeCloseTo(8.1);
    expect(unsafeRuntime).toBeUndefined();
  });
});
