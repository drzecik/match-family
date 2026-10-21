import type { VerificationStatus } from "./types.js";

const evidenceStrength: Readonly<Record<VerificationStatus, number>> = {
  unknown: 0,
  candidate: 1,
  rejected: 2,
  conflicting: 3,
  deprecated: 4,
  verified_supplier: 5,
  verified_multi_source: 6,
  verified_official: 7,
};

export function verificationStrength(status: VerificationStatus): number {
  return evidenceStrength[status];
}

export function canReplaceVerification(
  existing: VerificationStatus,
  incoming: VerificationStatus,
): boolean {
  return verificationStrength(incoming) >= verificationStrength(existing);
}
