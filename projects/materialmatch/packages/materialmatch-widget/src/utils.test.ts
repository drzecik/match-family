import { describe, expect, it } from 'vitest';
import {
  millimetersToMeterInput,
  parseMetersToMillimeters,
  parseNonNegativeInteger,
  parseSquareMetersToSquareMillimeters,
  squareMillimetersToSquareMeterInput,
} from './utils';

describe('localized integer measurement parsing', () => {
  it.each([
    ['4', 4000],
    ['0,9', 900],
    ['2.475', 2475],
  ])('parses %s m', (input, expected) => {
    expect(parseMetersToMillimeters(input)).toBe(expected);
  });

  it('rejects negative, exponential and over-precise dimensions', () => {
    expect(parseMetersToMillimeters('-1')).toBeNull();
    expect(parseMetersToMillimeters('1e3')).toBeNull();
    expect(parseMetersToMillimeters('1.0001')).toBeNull();
  });

  it('parses square meters without floating point multiplication', () => {
    expect(parseSquareMetersToSquareMillimeters('1,234567')).toBe(1_234_567);
  });

  it('accepts only non-negative safe integers for discrete counts', () => {
    expect(parseNonNegativeInteger('0')).toBe(0);
    expect(parseNonNegativeInteger('12')).toBe(12);
    expect(parseNonNegativeInteger('-1')).toBeNull();
    expect(parseNonNegativeInteger('1,5')).toBeNull();
    expect(parseNonNegativeInteger('1e3')).toBeNull();
    expect(parseNonNegativeInteger('9007199254740992')).toBeNull();
  });

  it('restores exact integer measurements as localized inputs', () => {
    expect(millimetersToMeterInput(2475)).toBe('2,475');
    expect(millimetersToMeterInput(4000)).toBe('4');
    expect(squareMillimetersToSquareMeterInput(1_234_567)).toBe('1,234567');
  });
});
