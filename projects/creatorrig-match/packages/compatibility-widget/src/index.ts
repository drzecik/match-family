export type PublicWidgetStatus =
  | 'directly_compatible'
  | 'compatible_with_adapter'
  | 'compatible_with_limitations'
  | 'conditionally_compatible'
  | 'incompatible'
  | 'unknown'
  | 'candidate';

export interface WidgetInput {
  readonly sourceName: string;
  readonly targetName: string;
  readonly status: PublicWidgetStatus;
  readonly verificationStatus: 'verified' | 'candidate' | 'in_review' | 'rejected';
  readonly evidenceIds: readonly string[];
  readonly requiredProductNames: readonly string[];
  readonly limitations: readonly string[];
  readonly sponsored: boolean;
}

export interface WidgetViewModel {
  readonly title: string;
  readonly label: string;
  readonly tone: 'positive' | 'warning' | 'negative' | 'unknown';
  readonly recommendable: boolean;
  readonly requiredItems: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceCount: number;
  readonly disclosure?: string;
  readonly noindex: boolean;
}

export function createWidgetViewModel(input: WidgetInput): WidgetViewModel {
  const verified = input.verificationStatus === 'verified' && input.evidenceIds.length > 0;
  const positive =
    input.status === 'directly_compatible' ||
    input.status === 'compatible_with_adapter' ||
    input.status === 'compatible_with_limitations' ||
    input.status === 'conditionally_compatible';
  const recommendable = verified && positive;
  const label = !verified
    ? 'Niepotwierdzone'
    : input.status === 'directly_compatible'
      ? 'Zgodne bezpośrednio'
      : input.status === 'compatible_with_adapter'
        ? 'Zgodne z adapterem'
        : input.status === 'compatible_with_limitations' ||
            input.status === 'conditionally_compatible'
          ? 'Zgodne z ograniczeniami'
          : input.status === 'incompatible'
            ? 'Niezgodne'
            : 'Niepotwierdzone';
  const tone: WidgetViewModel['tone'] =
    !verified || input.status === 'unknown'
      ? 'unknown'
      : input.status === 'incompatible'
        ? 'negative'
        : input.status === 'compatible_with_limitations' ||
            input.status === 'conditionally_compatible'
          ? 'warning'
          : 'positive';

  return {
    title: `${input.sourceName} → ${input.targetName}`,
    label,
    tone,
    recommendable,
    requiredItems: recommendable ? [...input.requiredProductNames] : [],
    limitations: verified ? [...input.limitations] : ['Brak zweryfikowanego zakresu dowodu.'],
    evidenceCount: verified ? input.evidenceIds.length : 0,
    ...(input.sponsored ? { disclosure: 'Pozycja sponsorowana' } : {}),
    noindex: !verified || input.status === 'candidate' || input.status === 'unknown',
  };
}
