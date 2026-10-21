import type { CalculationInput, MeasurementProject } from '@materialmatch/domain';
import { flooringConfiguration, flooringVerticalPack } from '@materialmatch/vertical-pack-flooring';

export const referenceFlooringConfiguration = flooringConfiguration;
export const referenceFlooringVerticalPack = flooringVerticalPack;

export const referenceFlooringExpected = {
  netAreaSquareMillimeters: 20_000_000,
  wasteAreaSquareMillimeters: 1_600_000,
  grossAreaSquareMillimeters: 21_600_000,
  mainPackages: 10,
  purchasedAreaSquareMillimeters: 22_000_000,
  underlayRolls: 3,
  perimeterMillimeters: 18_000,
  doorWidthMillimeters: 900,
  skirtingLengthMillimeters: 17_100,
  skirtingPieces: 8,
} as const;

export const referenceFlooringProject: MeasurementProject = {
  id: 'fictional-reference-project-4x5',
  wasteBasisPoints: 800,
  installationPattern: 'straight',
  rooms: [
    {
      id: 'room-1',
      name: 'Fikcyjny pokój referencyjny',
      geometry: { kind: 'rectangle', widthMillimeters: 4_000, lengthMillimeters: 5_000 },
      excludedAreas: [],
      doors: [{ id: 'door-1', widthMillimeters: 900 }],
      corners: { internal: 4, external: 0 },
    },
  ],
};

export const referenceFlooringInput: CalculationInput = {
  project: referenceFlooringProject,
};
