export interface CandidateProductRecord {
  readonly id: string;
  readonly brand: string;
  readonly canonicalName: string;
  readonly model?: string;
  readonly aliases?: readonly string[];
  readonly category: string;
  readonly subcategory: string;
  readonly dimensions?: Readonly<Record<string, unknown>>;
  readonly weightGrams?: number;
  readonly weightBasis?: string;
  readonly lifecycleStatus?: string;
  readonly region?: readonly string[];
  readonly officialUrl?: string;
  readonly evidenceIds?: readonly string[];
  readonly sourceReferences?: readonly string[];
  readonly interfaceIds?: readonly string[];
  readonly requirementIds?: readonly string[];
  readonly specs?: Readonly<Record<string, unknown>>;
}

export interface CandidateEvidenceRecord {
  readonly id: string;
  readonly title: string;
  readonly sourceType: string;
  readonly url: string;
  readonly accessedAt?: string;
  readonly scope?: readonly string[];
  readonly proofScope?: readonly string[];
  readonly supportedClaims?: readonly string[];
  readonly notes?: string;
}

export interface CandidateInterfaceRecord {
  readonly id: string;
  readonly productId: string;
  readonly type: string;
  readonly subtype: string;
  readonly direction: string;
  readonly version?: string;
  readonly physicalConnector?: string;
  readonly electricalProperties?: Readonly<Record<string, unknown>>;
  readonly signalProperties?: Readonly<Record<string, unknown>>;
  readonly sourceReferences?: readonly string[];
}

export interface CandidateRequirementRecord {
  readonly id: string;
  readonly productId: string;
  readonly requirementType: string;
  readonly operator: string;
  readonly requiredValue: unknown;
  readonly unit?: string;
  readonly severity: string;
  readonly sourceReferences?: readonly string[];
}

export interface CandidateCatalogRecord {
  readonly products: readonly CandidateProductRecord[];
  readonly evidence: readonly CandidateEvidenceRecord[];
  readonly interfaces: readonly CandidateInterfaceRecord[];
  readonly requirements: readonly CandidateRequirementRecord[];
}

export interface TechnicalRow {
  readonly label: string;
  readonly value: string;
}

const fieldLabels: Readonly<Record<string, string>> = {
  apertureControl: 'Sterowanie przysłoną',
  attachesDirectlyToFullFrameEosR: 'Bezpośrednie mocowanie do pełnoklatkowego EOS R',
  autofocus: 'Autofokus',
  autofocusMotor: 'Napęd autofokusa',
  bitDepth: 'Głębia bitowa',
  capacityGb: 'Pojemność',
  cardSlotCount: 'Liczba gniazd kart',
  channelCount: 'Liczba kanałów',
  compatibleLensFamilies: 'Obsługiwane rodziny obiektywów',
  coverageFormat: 'Format krycia',
  depth: 'Głębokość',
  depthMm: 'Głębokość',
  diameter: 'Średnica',
  filterThreadMm: 'Gwint filtra',
  focalLengthMaxMm: 'Najdłuższa ogniskowa',
  focalLengthMinMm: 'Najkrótsza ogniskowa',
  fullFrameCropFactor: 'Mnożnik kadrowania na pełnej klatce',
  guaranteedSpeedClassMBps: 'Gwarantowany ciągły zapis klasy prędkości',
  height: 'Wysokość',
  heightMm: 'Wysokość',
  hostInterface: 'Interfejs urządzenia nadrzędnego',
  lensFamily: 'Rodzina obiektywu',
  lensMount: 'Bagnet',
  length: 'Długość',
  maxPowerW: 'Maksymalna udokumentowana moc',
  maximumAperture: 'Maksymalny otwór względny',
  maximumApertureTele: 'Maksymalny otwór względny — tele',
  maximumApertureWide: 'Maksymalny otwór względny — szeroki kąt',
  maximumReadMBps: 'Maksymalny deklarowany odczyt',
  maximumSequentialWriteMBps: 'Maksymalny deklarowany zapis sekwencyjny',
  maximumWriteMBps: 'Maksymalny deklarowany zapis',
  mediaFormat: 'Format nośnika',
  mediaFormats: 'Obsługiwane formaty nośników',
  mediaInterfaces: 'Obsługiwane interfejsy nośników',
  mediaProtocol: 'Protokół nośnika',
  plugInPower: 'Zasilanie przez wejście mikrofonowe',
  protocol: 'Protokół',
  rfSLensCropFactor: 'Mnożnik kadrowania dla RF-S',
  selfPowered: 'Własne zasilanie',
  sensor: 'Format matrycy',
  sensorFormat: 'Format matrycy',
  sensorHeightMm: 'Wysokość matrycy',
  sensorWidthMm: 'Szerokość matrycy',
  signalKind: 'Rodzaj sygnału',
  speedClasses: 'Klasy prędkości',
  stabilization: 'Stabilizacja',
  storageCapacities: 'Dostępne pojemności',
  supportedMedia: 'Obsługiwane nośniki',
  supportsAutofocus: 'Obsługa autofokusa',
  sustainedWriteMBps: 'Gwarantowany ciągły zapis',
  width: 'Szerokość',
  widthMm: 'Szerokość',
};

const valueLabels: Readonly<Record<string, string>> = {
  active: 'aktywny',
  analog_audio: 'analogowy sygnał dźwiękowy',
  aps_c: 'APS-C',
  bidirectional: 'dwukierunkowy',
  body_only: 'sam korpus',
  body_with_hot_shoe_cover: 'korpus z osłoną stopki',
  cable: 'przewód',
  candidate: 'kandydat do ręcznej weryfikacji',
  canon_rf: 'Canon RF',
  canon_rf_s: 'Canon RF-S',
  cfexpress_type_b: 'CFexpress typu B',
  compactflash: 'CompactFlash',
  complete_device: 'kompletne urządzenie',
  complete_device_rest_of_world: 'kompletne urządzenie — wariant poza USA',
  excluding_battery_and_memory_card: 'bez akumulatora i karty pamięci',
  excluding_caps_and_hood: 'bez dekielków i osłony',
  full_frame: 'pełna klatka',
  fujifilm_x: 'FUJIFILM X',
  global: 'świat',
  input: 'wejście',
  legacy: 'starszy model',
  lens_only: 'sam obiektyw',
  micro_four_thirds: 'Mikro Cztery Trzecie',
  microsd_uhs_i: 'microSD UHS-I',
  microsd_uhs_ii: 'microSD UHS-II',
  nikon_z: 'Nikon Z',
  official_listed_weight: 'masa podana w oficjalnej specyfikacji',
  output: 'wyjście',
  passive: 'pasywny',
  reader_only: 'sam czytnik',
  sd: 'SD',
  sdhc: 'SDHC',
  sdxc: 'SDXC',
  sd_uhs_i: 'SD UHS-I',
  sd_uhs_ii: 'SD UHS-II',
  sony_e: 'Sony E',
  stm: 'STM',
  uhs_i: 'UHS-I',
  uhs_ii: 'UHS-II',
  usb_audio: 'dźwięk USB',
  usb_c_5gbps: 'USB-C 5 Gb/s',
  usb_c_usb_3_2_gen_1: 'USB-C, USB 3.2 pierwszej generacji',
  with_battery_and_memory_card: 'z akumulatorem i kartą pamięci',
};

const unitByField: Readonly<Record<string, string>> = {
  capacityGb: 'GB',
  depth: 'mm',
  depthMm: 'mm',
  diameter: 'mm',
  filterThreadMm: 'mm',
  focalLengthMaxMm: 'mm',
  focalLengthMinMm: 'mm',
  guaranteedSpeedClassMBps: 'MB/s',
  height: 'mm',
  heightMm: 'mm',
  length: 'mm',
  maxPowerW: 'W',
  maximumReadMBps: 'MB/s',
  maximumSequentialWriteMBps: 'MB/s',
  maximumWriteMBps: 'MB/s',
  sensorHeightMm: 'mm',
  sensorWidthMm: 'mm',
  sustainedWriteMBps: 'MB/s',
  width: 'mm',
  widthMm: 'mm',
};

const phraseLabels: Readonly<Record<string, string>> = {
  '3.5mm TRS cable end A': 'pierwszy koniec przewodu TRS 3,5 mm',
  '3.5mm TRS cable end B': 'drugi koniec przewodu TRS 3,5 mm',
  'USB-C cable end A': 'pierwszy koniec przewodu USB-C',
  'USB-C cable end B': 'drugi koniec przewodu USB-C',
  'USB-C host audio accessory port': 'port USB-C urządzenia nadrzędnego dla akcesoriów dźwiękowych',
  'USB audio': 'dźwięk USB',
  'USB audio accessory': 'akcesorium dźwiękowe USB',
  'USB audio transport': 'przesyłanie dźwięku przez USB',
  'analog microphone output': 'analogowe wyjście mikrofonowe',
  'analog microphone output powered by host input': 'analogowe wyjście mikrofonowe zasilane z wejścia urządzenia',
  'analog microphone-level': 'analogowy poziom mikrofonowy',
  'analog microphone-level stereo': 'analogowy stereofoniczny poziom mikrofonowy',
  'digital USB audio output': 'cyfrowe wyjście dźwięku USB',
  'stereo microphone input with plug-in power': 'stereofoniczne wejście mikrofonowe z zasilaniem',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3 }).format(value);
}

function formatToken(value: string): string {
  return valueLabels[value] ?? phraseLabels[value] ?? value.replaceAll('_', ' ');
}

export function candidateProductPath(id: string): string {
  return `/katalog-badawczy/${encodeURIComponent(id)}`;
}

export function collectProductEvidenceIds(product: CandidateProductRecord): readonly string[] {
  return [...new Set([
    ...(product.evidenceIds ?? []),
    ...(product.sourceReferences ?? []),
    ...((product.specs?.evidenceIds as readonly string[] | undefined) ?? []),
  ])];
}

export function formatTechnicalValue(key: string, value: unknown): string {
  if (typeof value === 'boolean') return value ? 'tak' : 'nie';
  if (typeof value === 'number') {
    const unit = unitByField[key];
    return `${formatNumber(value)}${unit ? ` ${unit}` : ''}`;
  }
  if (typeof value === 'string') return formatToken(value);
  if (Array.isArray(value)) return value.map((item) => formatTechnicalValue(key, item)).join(', ');
  if (value && typeof value === 'object') {
    const record = value as Readonly<Record<string, unknown>>;
    if (typeof record.min === 'number' && typeof record.max === 'number') {
      return `${formatNumber(record.min)}–${formatNumber(record.max)}`;
    }
    return Object.entries(record)
      .map(([nestedKey, nestedValue]) => `${fieldLabels[nestedKey] ?? nestedKey}: ${formatTechnicalValue(nestedKey, nestedValue)}`)
      .join(', ');
  }
  return 'brak danych';
}

export function technicalRows(record: Readonly<Record<string, unknown>> | undefined): readonly TechnicalRow[] {
  if (!record) return [];
  return Object.entries(record)
    .filter(([key, value]) => key !== 'evidenceIds' && value !== undefined && value !== null)
    .map(([key, value]) => ({
      label: fieldLabels[key] ?? key.replaceAll('_', ' '),
      value: formatTechnicalValue(key, value),
    }));
}

export function weightBasisLabel(value: string | undefined): string | undefined {
  return value ? formatToken(value) : undefined;
}

export function lifecycleLabel(value: string | undefined): string | undefined {
  return value ? formatToken(value) : undefined;
}

export function interfaceDirectionLabel(value: string): string {
  return formatToken(value);
}

export function interfaceSubtypeLabel(value: string): string {
  return phraseLabels[value] ?? value;
}

export function requirementLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    plug_in_power: 'wymagane zasilanie z wejścia mikrofonowego',
    plug_in_power_voltage_range: 'wymagany zakres napięcia zasilania mikrofonowego',
    usb_bus_voltage: 'wymagane napięcie magistrali USB',
  };
  return labels[value] ?? value.replaceAll('_', ' ');
}

export function severityLabel(value: string): string {
  return value === 'safety_critical' ? 'krytyczne dla bezpieczeństwa' : formatToken(value);
}

export function requirementValue(requirement: CandidateRequirementRecord): string {
  const value = formatTechnicalValue(requirement.requirementType, requirement.requiredValue);
  return `${value}${requirement.unit ? ` ${requirement.unit}` : ''}`;
}

export function scopeLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    electrical: 'zasilanie i parametry elektryczne',
    mechanical: 'mechanika i wymiary',
    memory: 'pamięć i nośniki',
    optical: 'optyka',
    protocol: 'protokół transmisji',
    signal: 'sygnał',
    signal_protocol: 'sygnał i protokół',
    software_firmware: 'oprogramowanie i firmware',
    storage: 'pamięć wbudowana',
  };
  return labels[value] ?? value.replaceAll('_', ' ');
}

export function polishCandidateCopy(value: string): string {
  return candidateCopyTranslations[value] ?? value;
}

const candidateCopyTranslations: Readonly<Record<string, string>> = {
  'Product-level candidate only; no host-device compatibility is inferred.':
    'To wyłącznie kandydatura produktu; nie wyciągamy z niej wniosku o zgodności z urządzeniem nadrzędnym.',
  'Exact device paths, timecode support and power budgets require separate human review.':
    'Dokładne ścieżki urządzeń, obsługa kodu czasowego i budżet zasilania wymagają osobnej weryfikacji przez człowieka.',
  'No microphone, card or power-source recommendation is created from these specifications.':
    'Na podstawie tych parametrów nie tworzymy rekomendacji mikrofonu, karty ani źródła zasilania.',
  'Tested payload alone does not prove clearance, balance or camera-control compatibility.':
    'Sam testowany udźwig nie potwierdza prześwitu, wyważenia ani zgodności sterowania aparatem.',
  'A phone inside the ranges is not automatically marked compatible; the official device list and app functions require review.':
    'Telefon mieszczący się w podanych zakresach nie jest automatycznie uznawany za zgodny; oficjalna lista urządzeń i funkcje aplikacji wymagają sprawdzenia.',
  'The manufacturer list remains a candidate until model variants, port clearance and exact SKU are reviewed.':
    'Lista producenta pozostaje kandydaturą do czasu sprawdzenia wariantów modelu, dostępu do portów i dokładnego SKU.',
  'No specific microphone fit is promoted from the weight range or thread adapter alone.':
    'Sam zakres masy lub adapter gwintu nie stanowi podstawy do potwierdzenia montażu konkretnego mikrofonu.',
  'No power source or modifier compatibility is inferred from the product specification.':
    'Ze specyfikacji produktu nie wyciągamy wniosku o zgodności źródła zasilania ani modyfikatora.',
  'Battery, adapter and modifier paths remain unasserted pending exact-source review.':
    'Ścieżki akumulatora, adaptera i modyfikatora pozostają niepotwierdzone do czasu sprawdzenia dokładnych źródeł.',
  'Mount naming and wattage are not enough to approve a specific light-modifier pair without human review.':
    'Nazwa mocowania i moc nie wystarczają do zatwierdzenia pary lampa–modyfikator bez weryfikacji człowieka.',
  'RAW recording, triggering and media support depend on exact camera, mode, firmware and media; none are approved here.':
    'Nagrywanie RAW, wyzwalanie i obsługa nośników zależą od konkretnego aparatu, trybu, firmware i nośnika; żadna z tych relacji nie jest tu zatwierdzona.',
  'No camera, cable, media or power-source pair is approved by this product record.':
    'Ten rekord produktu nie zatwierdza żadnej pary z aparatem, przewodem, nośnikiem ani źródłem zasilania.',
  'This is not electrical approval for any attached product; exact port, voltage, current, cable and protocol evidence is still required.':
    'Nie jest to zatwierdzenie elektryczne podłączonego produktu; nadal wymagany jest dowód dotyczący dokładnego portu, napięcia, prądu, przewodu i protokołu.',
  'Payload does not by itself prove stability or fit for a particular rig.':
    'Sam udźwig nie potwierdza stabilności ani dopasowania do konkretnego zestawu.',
  'Camera, computer, lens and software compatibility require exact path review; no relation is approved here.':
    'Zgodność aparatu, komputera, obiektywu i oprogramowania wymaga sprawdzenia dokładnej ścieżki; żadna relacja nie jest tu zatwierdzona.',
  'Does not by itself prove compatibility with any particular microphone.':
    'Samo źródło nie potwierdza zgodności z żadnym konkretnym mikrofonem.',
  'The page does not document VideoMic GO II maximum power draw.':
    'Strona nie dokumentuje maksymalnego poboru mocy VideoMic GO II.',
  'The guide does not state a plug-in-power voltage; no numeric voltage claim is made.':
    'Instrukcja nie podaje napięcia zasilania przez wejście mikrofonowe, dlatego nie formułujemy wartości liczbowej.',
  'The product page does not state maximum USB current or power consumption.':
    'Strona produktu nie podaje maksymalnego prądu USB ani poboru mocy.',
  'Connection guidance is not treated as a complete current/power rating.':
    'Instrukcji połączenia nie traktujemy jako kompletnej specyfikacji prądu i mocy.',
  'No maximum voltage, current, power, or USB protocol version is stated on the cited page.':
    'Cytowana strona nie podaje maksymalnego napięcia, prądu, mocy ani wersji protokołu USB.',
  'The guide recommends disabling automatic gain or processing and adjusting camera gain manually.':
    'Instrukcja zaleca wyłączenie automatycznej regulacji wzmocnienia lub przetwarzania i ręczne ustawienie wzmocnienia aparatu.',
  'The two-transmitter kit contains two 28 g transmitters, one 28 g receiver and a 200 g charging case.':
    'Zestaw z dwoma nadajnikami zawiera dwa nadajniki po 28 g, odbiornik 28 g i etui ładujące 200 g.',
  'DJI specifies 2.400–2.4835 GHz GFSK wireless operation and up to six hours of transmitter and receiver operation under its stated test conditions.':
    'DJI podaje bezprzewodową pracę GFSK w paśmie 2,400–2,4835 GHz oraz do sześciu godzin działania nadajnika i odbiornika w opisanych warunkach testowych.',
  'RØDE publishes an official technical datasheet for Wireless PRO.':
    'RØDE publikuje oficjalną kartę danych technicznych systemu Wireless PRO.',
  'The official product page describes 32-bit float onboard recording and a receiver headphone output.':
    'Oficjalna strona produktu opisuje pokładowe nagrywanie 32-bit float i wyjście słuchawkowe odbiornika.',
  "H6essential provides four XLR/TRS combo inputs and supports +48 V phantom power within the manual's stated current limit.":
    'H6essential ma cztery wejścia zespolone XLR/TRS i obsługuje zasilanie fantomowe +48 V w granicach prądu podanych w instrukcji.',
  'The recorder supports 32-bit-float WAV recording and microSDHC/microSDXC media within the documented capacity ranges.':
    'Rejestrator obsługuje zapis WAV 32-bit float oraz nośniki microSDHC i microSDXC w udokumentowanych zakresach pojemności.',
  'DJI specifies a tested payload of 3 kg for RS 4.':
    'DJI podaje testowany udźwig 3 kg dla RS 4.',
  'The gimbal body is approximately 1066 g and its unfolded dimensions with grip are 218.8 × 190.7 × 369 mm.':
    'Korpus stabilizatora waży około 1066 g, a jego wymiary po rozłożeniu z uchwytem wynoszą 218,8 × 190,7 × 369 mm.',
  'DJI specifies supported phone geometry of 67–84 mm width, 6.9–10 mm thickness and 170–290 g weight.':
    'DJI podaje obsługiwaną szerokość telefonu 67–84 mm, grubość 6,9–10 mm i masę 170–290 g.',
  'The gimbal weighs approximately 305 g and uses the DJI Mimo app.':
    'Stabilizator waży około 305 g i korzysta z aplikacji DJI Mimo.',
  'SmallRig lists model 3667B for specified Sony Alpha bodies and documents two-point locking.':
    'SmallRig wymienia model 3667B dla wskazanych korpusów Sony Alpha i dokumentuje blokadę w dwóch punktach.',
  'The cage includes Arca-Swiss, NATO, cold-shoe, 1/4-inch and 3/8-inch mounting features.':
    'Klatka ma mocowania Arca-Swiss, NATO, stopkę akcesoriów oraz gwinty 1/4 cala i 3/8 cala.',
  'PSA1+ is a desk or table microphone arm with 360-degree rotation, 940 mm horizontal reach and 860 mm vertical reach.':
    'PSA1+ jest biurkowym ramieniem mikrofonowym z obrotem 360°, zasięgiem poziomym 940 mm i pionowym 860 mm.',
  'RØDE specifies a supported microphone weight range from 94 g to 1.2 kg and provides a universal thread adapter.':
    'RØDE podaje obsługiwaną masę mikrofonu od 94 g do 1,2 kg i dołącza uniwersalny adapter gwintu.',
  'amaran 100x S has a 2700–6500 K CCT range and a stated maximum DC input power of 113 W.':
    'amaran 100x S ma zakres temperatury barwowej 2700–6500 K i deklarowaną maksymalną moc wejściową DC 113 W.',
  'Aputure specifies 1420 g weight and 207 × 119 × 200 mm dimensions including the bracket.':
    'Aputure podaje masę 1420 g i wymiary 207 × 119 × 200 mm wraz z uchwytem.',
  'amaran 200x S has a 2700–6500 K CCT range and a stated 200 W lamp output.':
    'amaran 200x S ma zakres temperatury barwowej 2700–6500 K i deklarowaną moc lampy 200 W.',
  'Aputure specifies 1560 g weight and 207 × 119 × 200 mm dimensions including the bracket.':
    'Aputure podaje masę 1560 g i wymiary 207 × 119 × 200 mm wraz z uchwytem.',
  'Nanlite specifies a 2700–6500 K CCT range, 72 W rated power and DC 15 V/6 A maximum input.':
    'Nanlite podaje zakres temperatury barwowej 2700–6500 K, moc znamionową 72 W i maksymalne wejście DC 15 V/6 A.',
  'The light measures 20 × 10.8 × 8.4 cm and weighs 0.7 kg.':
    'Lampa ma wymiary 20 × 10,8 × 8,4 cm i waży 0,7 kg.',
  'Light Dome Mini III is a 60 cm Bowens-mount quick-folding softbox with stated use up to 600 W fixture output.':
    'Light Dome Mini III jest szybko składanym softboksem 60 cm z mocowaniem Bowens, przeznaczonym według producenta do lamp o mocy do 600 W.',
  'Aputure specifies 58.0 cm built diameter, 32.7 cm depth and 1.30 kg total weight.':
    'Aputure podaje średnicę po rozłożeniu 58,0 cm, głębokość 32,7 cm i masę całkowitą 1,30 kg.',
  'ATOMNJ004 has a 5.2-inch 1920 × 1080 display and HDMI input/output up to DCI 4K at 60 fps.':
    'ATOMNJ004 ma ekran 5,2 cala o rozdzielczości 1920 × 1080 oraz wejście i wyjście HDMI do DCI 4K przy 60 kl./s.',
  'Atomos specifies 151 × 91.5 × 31 mm dimensions, 360 g weight and a 6.2–16.8 V input range.':
    'Atomos podaje wymiary 151 × 91,5 × 31 mm, masę 360 g i zakres napięcia wejściowego 6,2–16,8 V.',
  'The device provides HDMI 2.0a and 12G-SDI input/output and supports formats through 2160p60 as specified.':
    'Urządzenie ma wejścia i wyjścia HDMI 2.0a oraz 12G-SDI i obsługuje wymienione formaty do 2160p60.',
  'It has one UHS-II SD slot, USB-C external-drive recording and a 12 V external power input.':
    'Urządzenie ma jedno gniazdo SD UHS-II, zapis na dysku zewnętrznym przez USB-C i wejście zasilania zewnętrznego 12 V.',
  'SmallRig specifies 14.54 V, 6.8 Ah and 98.872 Wh nominal battery values.':
    'SmallRig podaje znamionowe parametry akumulatora: 14,54 V, 6,8 Ah i 98,872 Wh.',
  'The official page lists USB-C, USB-A, D-Tap, 8 V and 12 V outputs and USB-C PD 3.0 up to 100 W.':
    'Oficjalna strona wymienia wyjścia USB-C, USB-A, D-Tap, 8 V i 12 V oraz USB-C PD 3.0 do 100 W.',
  'Manfrotto specifies a 1.59 kg kit weight, 151 cm maximum height and 40 cm closed length.':
    'Manfrotto podaje masę zestawu 1,59 kg, maksymalną wysokość 151 cm i długość po złożeniu 40 cm.',
  'The kit includes an Advanced 494 ball head, 200PL PRO plate and a safety payload rating of 9 kg under the cited standard.':
    'Zestaw zawiera głowicę kulową Advanced 494 i płytkę 200PL PRO, a bezpieczny udźwig według cytowanej normy wynosi 9 kg.',
  'Prompter has a 9-inch 1024 × 600 display, USB-C interface and two 1/4-inch mounting threads.':
    'Prompter ma 9-calowy ekran 1024 × 600, interfejs USB-C i dwa gwinty montażowe 1/4 cala.',
  'Elgato specifies 690 g weight, 224 × 219 × 282 mm dimensions with the universal bracket and includes nine listed step-up ring sizes.':
    'Elgato podaje masę 690 g, wymiary 224 × 219 × 282 mm z uchwytem uniwersalnym i dołącza dziewięć wymienionych pierścieni zwiększających średnicę.',
  'iPhone 15 has a USB-C connector and supports USB 2.':
    'iPhone 15 ma złącze USB-C i obsługuje USB 2.',
  'iPhone 15 dimensions are 147.6 × 71.6 × 7.8 mm and weight is 171 g.':
    'iPhone 15 ma wymiary 147,6 × 71,6 × 7,8 mm i waży 171 g.',
  'iPhone 15 and later use USB-C and can connect to USB-C-compliant microphones.':
    'iPhone 15 i nowsze modele korzystają z USB-C i mogą łączyć się z mikrofonami zgodnymi z USB-C.',
  'A USB-C-to-USB-C cable is the documented connection when both devices have USB-C.':
    'Gdy oba urządzenia mają USB-C, udokumentowanym połączeniem jest przewód USB-C–USB-C.',
  'iPhone 15 and later can supply up to 4.5 W to a small connected USB device.':
    'iPhone 15 i nowsze modele mogą dostarczyć małemu podłączonemu urządzeniu USB do 4,5 W.',
  'ILCE-7M4 has a 3.5 mm stereo mini-jack microphone terminal.':
    'ILCE-7M4 ma stereofoniczne wejście mikrofonowe mini jack 3,5 mm.',
  'ILCE-7M4 dimensions are 131.3 × 96.4 × 79.8 mm and mass is approximately 658 g including battery and SD card.':
    'ILCE-7M4 ma wymiary 131,3 × 96,4 × 79,8 mm i waży około 658 g z akumulatorem i kartą SD.',
  'Connecting an external microphone switches off the internal microphone.':
    'Podłączenie mikrofonu zewnętrznego wyłącza mikrofon wewnętrzny.',
  'ILCE-7M4 supplies power when the external microphone is a plug-in-power type.':
    'ILCE-7M4 dostarcza zasilanie, gdy mikrofon zewnętrzny wymaga zasilania przez wejście mikrofonowe.',
  'VideoMic GO II has 3.5 mm TRS and USB-C outputs.':
    'VideoMic GO II ma wyjścia TRS 3,5 mm i USB-C.',
  'USB power requirement is 5 V; analog plug-in-power range is 2–5 V.':
    'Wymagane zasilanie USB wynosi 5 V, a analogowe zasilanie przez wejście mikrofonowe mieści się w zakresie 2–5 V.',
  'USB mode supports 24-bit, 48 kHz operation and minimum iOS 14.':
    'Tryb USB obsługuje pracę 24-bit/48 kHz i wymaga co najmniej iOS 14.',
  'Microphone-only dimensions are 120 mm length and 21.6 mm diameter; weight is 33 g.':
    'Sam mikrofon ma 120 mm długości, 21,6 mm średnicy i waży 33 g.',
  'For iPhone 15 and later, RØDE instructs using a USB-C-to-USB-C cable such as SC16 or SC17 with VideoMic GO II.':
    'Dla iPhone’a 15 i nowszych RØDE zaleca połączenie VideoMic GO II przewodem USB-C–USB-C, takim jak SC16 lub SC17.',
  'SC16 is a shielded 300 mm USB-C-to-USB-C cable weighing 6 g for connecting RØDE USB-C microphones to USB-C-compatible devices.':
    'SC16 to ekranowany przewód USB-C–USB-C o długości 300 mm i masie 6 g, przeznaczony do łączenia mikrofonów RØDE USB-C z urządzeniami zgodnymi z USB-C.',
  'SC16 is documented for RØDE devices with a USB-C output.':
    'SC16 jest udokumentowany dla urządzeń RØDE z wyjściem USB-C.',
  'VideoMicro II weighs 39 g including its shock mount and is 80 mm long.':
    'VideoMicro II waży 39 g wraz z uchwytem przeciwwstrząsowym i ma 80 mm długości.',
  'VideoMicro II requires no battery and includes camera and smartphone connection cables.':
    'VideoMicro II nie wymaga akumulatora, a w zestawie znajdują się przewody do aparatu i smartfona.',
  'VideoMicro II has a 3.5 mm TRS output for camera TRS inputs.':
    'VideoMicro II ma wyjście TRS 3,5 mm przeznaczone do wejść TRS w aparatach.',
  'The included SC13 is a 3.5 mm TRS-to-TRS cable.':
    'Dołączony SC13 jest przewodem TRS–TRS 3,5 mm.',
  'The SC13 connection transfers audio and camera power to VideoMicro II and turns the microphone on.':
    'Połączenie SC13 przesyła dźwięk i zasilanie z aparatu do VideoMicro II oraz włącza mikrofon.',
  'ILCE-6700 uses an APS-C sensor and Sony E-mount.':
    'ILCE-6700 korzysta z matrycy APS-C i bagnetu Sony E.',
  'Body-only mass is approximately 409 g.':
    'Masa samego korpusu wynosi około 409 g.',
  'The memory-card slot accepts SD cards and is UHS-I/II compliant.':
    'Gniazdo karty pamięci przyjmuje karty SD i jest zgodne z UHS-I oraz UHS-II.',
  'Z6III uses Nikon Z mount and an FX-format 35.9 × 23.9 mm sensor.':
    'Z6III korzysta z bagnetu Nikon Z i matrycy formatu FX o wymiarach 35,9 × 23,9 mm.',
  'Approximate listed mass is 670 g.':
    'Podana przybliżona masa wynosi 670 g.',
  'X-S20 uses FUJIFILM X mount and a 23.5 × 15.6 mm APS-C sensor.':
    'X-S20 korzysta z bagnetu FUJIFILM X i matrycy APS-C o wymiarach 23,5 × 15,6 mm.',
  'Mass excluding battery and memory card is approximately 410 g.':
    'Masa bez akumulatora i karty pamięci wynosi około 410 g.',
  'It accepts SD, SDHC and SDXC media with UHS-I/II support.':
    'Urządzenie przyjmuje karty SD, SDHC i SDXC z obsługą UHS-I oraz UHS-II.',
  'DC-GH7 uses Micro Four Thirds mount and a 17.3 × 13.0 mm sensor.':
    'DC-GH7 korzysta z bagnetu Mikro Cztery Trzecie i matrycy o wymiarach 17,3 × 13,0 mm.',
  'Body with hot-shoe cover is approximately 721 g.':
    'Korpus z osłoną stopki waży około 721 g.',
  'The official manual lists CFexpress Type B and SD-family recording media.':
    'Oficjalna instrukcja wymienia nośniki CFexpress typu B oraz karty z rodziny SD.',
  'iPhone 16 Pro dimensions are 71.5 × 149.6 × 8.25 mm and mass is 199 g.':
    'iPhone 16 Pro ma wymiary 71,5 × 149,6 × 8,25 mm i waży 199 g.',
  'Official capacities are 128 GB, 256 GB, 512 GB and 1 TB.':
    'Oficjalne pojemności to 128 GB, 256 GB, 512 GB i 1 TB.',
  'Rest-of-world Pixel 9 Pro dimensions are 152.8 × 72.0 × 8.5 mm and mass is 199 g.':
    'Pixel 9 Pro w wariancie poza USA ma wymiary 152,8 × 72,0 × 8,5 mm i waży 199 g.',
  'SEL2470GM2 is a full-frame Sony E-mount 24–70 mm F2.8 lens.':
    'SEL2470GM2 to pełnoklatkowy obiektyw 24–70 mm F2.8 z bagnetem Sony E.',
  'Listed mass is 695 g.':
    'Podana masa wynosi 695 g.',
  'The lens uses Nikon Z mount, covers FX format and supports autofocus.':
    'Obiektyw korzysta z bagnetu Nikon Z, kryje format FX i obsługuje autofokus.',
  'It weighs approximately 500 g and accepts 72 mm screw-in filters.':
    'Obiektyw waży około 500 g i przyjmuje filtry wkręcane 72 mm.',
  'The lens has an 18–55 mm focal range, F2.8–4 maximum aperture and optical stabilisation.':
    'Obiektyw ma zakres ogniskowych 18–55 mm, maksymalny otwór względny F2.8–4 i stabilizację optyczną.',
  'Approximate mass is 310 g and filter size is 58 mm.':
    'Przybliżona masa wynosi 310 g, a średnica filtra 58 mm.',
  'Professional 2000x is a UHS-II V90 card offered in 128 GB capacity.':
    'Professional 2000x to karta UHS-II V90 dostępna w pojemności 128 GB.',
  'Advertised maximum read and write speeds are 300 MB/s and 260 MB/s.':
    'Deklarowane maksymalne prędkości odczytu i zapisu wynoszą odpowiednio 300 MB/s i 260 MB/s.',
  'Model SDPR5A8-0000-GBAND uses USB-C USB 3.2 Gen 1 and accepts SD and microSD UHS-I media.':
    'Model SDPR5A8-0000-GBAND korzysta z USB-C USB 3.2 pierwszej generacji i przyjmuje nośniki SD oraz microSD UHS-I.',
  'Listed mass is 0.12 kg.':
    'Podana masa wynosi 0,12 kg.',
  'Model SDPR3A8-0000-GBAND supports CompactFlash, SD and microSD, including UHS-I/II media, over a USB-C 5 Gbps port.':
    'Model SDPR3A8-0000-GBAND obsługuje CompactFlash, SD i microSD, w tym nośniki UHS-I oraz UHS-II, przez port USB-C 5 Gb/s.',
  'Listed mass is 120 g.':
    'Podana masa wynosi 120 g.',
  'RØDE identifies SC4 as a 3.5 mm TRS-to-TRRS adaptor.':
    'RØDE opisuje SC4 jako adapter TRS–TRRS 3,5 mm.',
  'No host or microphone compatibility is inferred.':
    'Nie wyciągamy wniosku o zgodności z urządzeniem nadrzędnym ani mikrofonem.',
  'RØDE identifies SC7 as a shielded 3.5 mm TRS-to-TRRS patch cable.':
    'RØDE opisuje SC7 jako ekranowany przewód połączeniowy TRS–TRRS 3,5 mm.',
  'RØDE identifies VXLR+ as a 3.5 mm TRS female to XLR male adapter with documented power conversion.':
    'RØDE opisuje VXLR+ jako adapter z żeńskiego TRS 3,5 mm na męski XLR z udokumentowaną konwersją zasilania.',
  'No device pair or electrical capacity is approved.':
    'Nie zatwierdzono żadnej pary urządzeń ani wydajności elektrycznej.',
  'Microphone input support and a particular host remain unasserted.':
    'Obsługa wejścia mikrofonowego i konkretnego urządzenia nadrzędnego pozostają niepotwierdzone.',
  'The converter has HDMI Type A and SD/HD/3G-SDI input/output, USB-C configuration/power and a 4.4–5.25 V operating range.':
    'Konwerter ma wejście i wyjście HDMI typu A oraz SD/HD/3G-SDI, konfigurację i zasilanie przez USB-C oraz zakres pracy 4,4–5,25 V.',
  'No cable or endpoint combination is approved.':
    'Nie zatwierdzono żadnego połączenia przewodu z urządzeniem końcowym.',
  'The model has one HDMI Type A input, two 3G-SDI outputs and USB-C configuration/power.':
    'Model ma jedno wejście HDMI typu A, dwa wyjścia 3G-SDI oraz konfigurację i zasilanie przez USB-C.',
  'No lens fit is asserted from diameter alone.':
    'Sama średnica nie potwierdza dopasowania do obiektywu.',
  'No lens fit or guaranteed optical result is approved.':
    'Nie zatwierdzono dopasowania do obiektywu ani gwarantowanego rezultatu optycznego.',
  'Manfrotto specifies 2.5 kg weight, 170 cm maximum height, 61 cm closed length and a 3/8-inch top attachment.':
    'Manfrotto podaje masę 2,5 kg, maksymalną wysokość 170 cm, długość po złożeniu 61 cm i górne mocowanie 3/8 cala.',
  'Payload and top thread do not approve a complete rig.':
    'Udźwig i górny gwint nie stanowią zatwierdzenia kompletnego zestawu.',
  'No camera or rig is approved by payload alone.':
    'Sam udźwig nie zatwierdza żadnego aparatu ani zestawu.',
  'Manfrotto specifies 53 cm arm length, 1.09 kg weight, 3 kg payload and 1/4-inch and 3/8-inch female endpoints.':
    'Manfrotto podaje długość ramienia 53 cm, masę 1,09 kg, udźwig 3 kg oraz żeńskie zakończenia 1/4 cala i 3/8 cala.',
  'SmallRig lists VB50 nominal capacity as 14.54 V, 3400 mAh and 49.436 Wh with BP, USB-C, D-Tap, USB-A, 8 V and 12 V ports.':
    'SmallRig podaje znamionowe parametry VB50: 14,54 V, 3400 mAh i 49,436 Wh oraz porty BP, USB-C, D-Tap, USB-A, 8 V i 12 V.',
  'No output may be paired to a device without exact voltage, current, polarity and protocol evidence.':
    'Żadnego wyjścia nie wolno łączyć z urządzeniem bez dokładnego dowodu napięcia, prądu, polaryzacji i protokołu.',
  'SmallRig lists VB155 nominal capacity as 14.54 V, 10200 mAh and 148.308 Wh with multiple output interfaces.':
    'SmallRig podaje znamionowe parametry VB155: 14,54 V, 10200 mAh i 148,308 Wh oraz wiele interfejsów wyjściowych.',
  'No electrical recommendation is created from nominal capacity or connector presence.':
    'Z pojemności znamionowej ani obecności złącza nie tworzymy rekomendacji elektrycznej.',
  'A compatible device and cable must explicitly support the negotiated profile.':
    'Zgodne urządzenie i przewód muszą jawnie obsługiwać negocjowany profil.',
  'No camera or charger compatibility is inferred.':
    'Nie wyciągamy wniosku o zgodności z aparatem ani ładowarką.',
  'The official datasheet lists 128 GB, 256 GB and 512 GB SDXC UHS-II V60 variants; 128 GB is rated up to 100 MB/s write and 256/512 GB up to 150 MB/s write.':
    'Oficjalna karta danych wymienia warianty SDXC UHS-II V60 o pojemności 128 GB, 256 GB i 512 GB; dla 128 GB podaje zapis do 100 MB/s, a dla 256/512 GB do 150 MB/s.',
  'The official datasheet lists 128 GB, 256 GB and 512 GB SDXC UHS-II V60 variants; 128 GB is rated up to 210 MB/s write and 256/512 GB up to 250 MB/s write.':
    'Oficjalna karta danych wymienia warianty SDXC UHS-II V60 o pojemności 128 GB, 256 GB i 512 GB; dla 128 GB podaje zapis do 210 MB/s, a dla 256/512 GB do 250 MB/s.',
  'A card-to-camera relation and recording-mode sufficiency remain unasserted; affected-lot service notices require human review.':
    'Relacja karty z aparatem i wystarczalność dla trybu nagrywania pozostają niepotwierdzone; komunikaty serwisowe dotyczące określonych partii wymagają sprawdzenia przez człowieka.',
  'Elgato specifies unencrypted HDMI input, USB 3.0 host connection and documented input resolutions through 2160p.':
    'Elgato podaje nieszyfrowane wejście HDMI, połączenie z urządzeniem nadrzędnym przez USB 3.0 i udokumentowane rozdzielczości wejściowe do 2160p.',
  'Camera output behavior and exact capture mode require model-specific review.':
    'Zachowanie wyjścia aparatu i dokładny tryb przechwytywania wymagają sprawdzenia dla konkretnego modelu.',
  'No source, storage device or streaming service is approved by this record.':
    'Ten rekord nie zatwierdza żadnego źródła, nośnika ani usługi transmisji na żywo.',
  'No host, stand or interface relation is approved.':
    'Nie zatwierdzono relacji z urządzeniem nadrzędnym, statywem ani interfejsem.',
  'RØDE documents analog XLR and digital USB connectivity for NT1 5th Generation.':
    'RØDE dokumentuje analogowe połączenie XLR i cyfrowe USB dla NT1 piątej generacji.',
  'No microphone or computer compatibility is inferred.':
    'Nie wyciągamy wniosku o zgodności z mikrofonem ani komputerem.',
  'No host, interface or mount relation is approved.':
    'Nie zatwierdzono relacji z urządzeniem nadrzędnym, interfejsem ani mocowaniem.',
  'SmallRig identifies model 3873 as a compact magic arm with dual ball heads and 1/4-20 screws.':
    'SmallRig opisuje model 3873 jako kompaktowe ramię przegubowe z dwiema głowicami kulowymi i śrubami 1/4-20.',
  'Payload and anti-rotation behavior require exact official specification review.':
    'Udźwig i zabezpieczenie przed obrotem wymagają sprawdzenia dokładnej oficjalnej specyfikacji.',
  'A particular camera, strap or tripod path remains unapproved.':
    'Ścieżka konkretnego aparatu, paska lub statywu pozostaje niezatwierdzona.',
  'Manfrotto specifies 13–55 mm round-tube clamp range, 0.43 kg weight, 15 kg payload and 16 mm sockets for model 035.':
    'Manfrotto podaje dla modelu 035 zakres zacisku na okrągłej rurze 13–55 mm, masę 0,43 kg, udźwig 15 kg i gniazda 16 mm.',
};
