import assert from 'node:assert/strict';
import { calculateMaterialProject } from '../../packages/calculation-engine/src/index.js';
import { referenceFlooringInput, referenceFlooringConfiguration } from '@materialmatch/test-fixtures';

const result = calculateMaterialProject(referenceFlooringInput, referenceFlooringConfiguration);
assert.equal(result.measurements.netAreaSquareMillimeters, 20_000_000);
assert.equal(result.measurements.grossAreaSquareMillimeters, 21_600_000);
assert.equal(result.mainProduct.quantity, 10);
assert.equal(result.mainProduct.purchasedAreaSquareMillimeters, 22_000_000);
assert.equal(result.accessories.find((line) => line.productId === 'underlay')?.quantity, 3);
assert.equal(result.accessories.find((line) => line.productId === 'skirting')?.quantity, 8);
console.log(JSON.stringify({ project: 'MaterialMatch', synthetic: true, notForProduction: true,
  measurements: result.measurements, packages: result.mainProduct.quantity, accessories: result.accessories,
  totalPrice: result.totalPrice, notice: 'Integer measurements and minor currency units; no order is placed.' }, null, 2));
