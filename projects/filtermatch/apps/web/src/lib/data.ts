import snapshotJson from '../../../../data/generated/public-snapshot.json';
import searchIndexJson from '../../../../data/generated/model-search-index.json';
import coverageJson from '../../../../data/generated/catalog-coverage-report.json';
import type { DataSnapshot } from '@filtermatch/domain';
import type { StaticModelSearchIndex } from '@filtermatch/model-search';

const snapshotEnvelope = snapshotJson as unknown as {
  schemaVersion: number;
  generatedAt: string;
  data: DataSnapshot;
};
if (snapshotEnvelope.schemaVersion !== 2) {
  throw new Error(`Unsupported public data schema: ${snapshotEnvelope.schemaVersion}`);
}
const privateReview = import.meta.env.FILTERMATCH_BUILD_PROFILE === 'private-review';
export const snapshot = privateReview
  ? {
      devices: [],
      consumables: [],
      compatibilityEdges: [],
      sourceEvidence: [],
      searchAliases: [],
      offers: [],
      reviewDecisions: []
    }
  : snapshotEnvelope.data;
export const searchIndex = searchIndexJson as unknown as StaticModelSearchIndex;

const coverage = coverageJson as unknown as {
  scopeId: string;
  dataRevision: string;
  generatedAt: string;
};

/**
 * Identity of the demonstration catalog behind the published pages. Any claim
 * about coverage must be stated against this scope and revision, never against
 * the market.
 */
export const catalogScope = {
  scopeId: coverage.scopeId,
  dataRevision: coverage.dataRevision,
  shortRevision: coverage.dataRevision.replace(/^sha256:/, '').slice(0, 12),
  generatedAt: coverage.generatedAt
};
