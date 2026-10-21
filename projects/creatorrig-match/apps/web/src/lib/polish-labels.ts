const relationLabels: Readonly<Record<string, string>> = {
  directly_compatible: 'Zgodne bezpośrednio',
  compatible_with_adapter: 'Zgodne po dodaniu adaptera',
  compatible_with_limitations: 'Zgodne z ograniczeniami',
  physically_compatible_only: 'Zgodne wyłącznie mechanicznie',
  electronically_compatible_only: 'Zgodne wyłącznie elektronicznie',
  conditionally_compatible: 'Zgodne warunkowo',
  incompatible: 'Niezgodne',
  unknown: 'Niepotwierdzone',
  candidate: 'Oczekuje na weryfikację',
  deprecated: 'Wycofane',
};

const categoryLabels: Readonly<Record<string, string>> = {
  capture_device: 'Urządzenia rejestrujące',
  optics: 'Optyka',
  audio: 'Dźwięk',
  stabilization_and_mounting: 'Stabilizacja i mocowanie',
  lighting: 'Oświetlenie',
  monitoring_and_recording: 'Podgląd i rejestracja',
  power: 'Zasilanie',
  memory_and_transfer: 'Pamięć i transfer',
  memory_transfer: 'Pamięć i transfer',
  studio_and_workflow: 'Studio i obieg pracy',
};

const subcategoryLabels: Readonly<Record<string, string>> = {
  ac_power_supply: 'zasilacz sieciowy',
  audio_cable: 'przewód audio',
  audio_interface: 'interfejs audio',
  audio_receiver: 'odbiornik audio',
  audio_recorder: 'rejestrator dźwięku',
  cage: 'klatka operatorska',
  camera: 'aparat lub kamera',
  capture_card: 'karta przechwytująca',
  card_reader: 'czytnik kart',
  cfexpress_card: 'karta CFexpress',
  cob_light: 'lampa COB',
  computer: 'komputer',
  dock: 'stacja dokująca',
  desktop_stand: 'ramię biurkowe',
  external_recorder: 'rejestrator zewnętrzny',
  field_monitor: 'monitor podglądowy',
  gimbal: 'stabilizator gimbalowy',
  grip: 'uchwyt',
  hdmi_cable: 'przewód HDMI',
  headphones: 'słuchawki',
  led_panel: 'panel LED',
  lens: 'obiektyw',
  lens_mount_adapter: 'adapter bagnetowy',
  light_stand: 'statyw oświetleniowy',
  lighting_controller: 'sterownik oświetlenia',
  lighting_grid: 'plaster miodu',
  matte_box: 'kompendium',
  phone: 'telefon',
  power_bank: 'powerbank',
  round_filter: 'filtr okrągły',
  sd_card: 'karta SD',
  softbox: 'softbox',
  ssd: 'dysk SSD',
  step_up_ring: 'pierścień zwiększający średnicę',
  streaming_device: 'urządzenie do transmisji',
  teleprompter: 'teleprompter',
  tripod: 'statyw',
  tripod_head: 'głowica statywowa',
  trs_trrs_adapter: 'adapter TRS/TRRS',
  usb_audio_cable: 'przewód audio USB',
  usb_c_cable: 'przewód USB-C',
  v_mount_system: 'akumulator V-Mount',
  wired_microphone: 'mikrofon przewodowy',
  wireless_microphone: 'system mikrofonów bezprzewodowych',
  workflow_power_supply: 'zasilacz urządzenia roboczego',
  xlr_cable: 'przewód XLR',
  xlr_microphone: 'mikrofon XLR',
};

const dimensionLabels: Readonly<Record<string, string>> = {
  physical: 'Połączenie fizyczne',
  signal: 'Sygnał i protokół',
  electrical: 'Zasilanie mikrofonu',
  channels: 'Liczba kanałów',
  mechanical: 'Bagnet i mocowanie',
  coverage: 'Pokrycie sensora',
  autofocus: 'Autofokus',
  aperture: 'Sterowanie przysłoną',
  stabilization: 'Stabilizacja obiektywu',
  exif: 'Dane EXIF',
  format: 'Format karty',
  capacity: 'Pojemność',
  sustainedWrite: 'Ciągła prędkość zapisu',
  speedClass: 'Klasa prędkości',
  filesystem: 'System plików',
  connectorDirection: 'Złącza i kierunek połączenia',
  protocolVersion: 'Protokół i jego wersja',
  videoMode: 'Tryb obrazu',
  capability: 'Obsługiwana funkcja',
  powerPrecondition: 'Warunki zasilania',
  evidence: 'Kompletność dowodów',
  mountChain: 'Łańcuch mocowań',
  payloadMargin: 'Udźwig z zapasem',
  plateCompatibility: 'Zgodność płytki',
  clearanceWeight: 'Prześwit i masa',
  modifierDiameter: 'Średnica modyfikatora',
  standPayload: 'Udźwig statywu',
  electricalPower: 'Parametry zasilania',
  wirelessControl: 'Sterowanie bezprzewodowe',
  busProtocol: 'Magistrala danych',
  mediaProtocol: 'Protokół nośnika',
  sustainedTransfer: 'Ciągła szybkość transferu',
  power: 'Zasilanie',
  osSoftware: 'System i oprogramowanie',
  audioFormatTransfer: 'Format i przesył dźwięku',
  channelsSignal: 'Kanały i rodzaj sygnału',
};

const messageLabels: Readonly<Record<string, string>> = {
  'The adapter does not pass autofocus.': 'Adapter nie przekazuje sterowania autofokusem.',
  'The adapter does not pass electronic aperture control.':
    'Adapter nie przekazuje elektronicznego sterowania przysłoną.',
  'The adapter does not pass lens stabilization control.':
    'Adapter nie przekazuje sterowania stabilizacją obiektywu.',
  'The adapter does not pass EXIF transfer.': 'Adapter nie przekazuje danych EXIF.',
  'The lens image circle does not cover the full sensor.':
    'Koło obrazowe obiektywu nie pokrywa całego sensora.',
  'The mounts do not match and no verified matching adapter was supplied.':
    'Bagnety nie pasują i nie wskazano dokładnego, zweryfikowanego adaptera.',
  'Optical facts are not supported by scoped evidence.':
    'Dane optyczne nie mają dowodów potwierdzających dokładnie ten zakres.',
  'Required sustained write speed is unknown.': 'Nie podano wymaganej ciągłej prędkości zapisu.',
  'Card sustained write speed is unknown.':
    'Nie podano gwarantowanej ciągłej prędkości zapisu karty.',
  'Card guaranteed speed class is unknown.': 'Nie podano gwarantowanej klasy prędkości karty.',
  'Collision-free and vignetting-free use is confirmed only under stated limitations.':
    'Brak kolizji i winietowania potwierdzono wyłącznie przy zachowaniu podanych ograniczeń.',
};

export function relationTypeLabel(value: string): string {
  return relationLabels[value] ?? 'Nieznany status relacji';
}

export function categoryLabel(value: string): string {
  return categoryLabels[value] ?? 'Pozostały sprzęt';
}

export function subcategoryLabel(value: string): string {
  return subcategoryLabels[value] ?? 'akcesorium';
}

export function evidenceSourceLabel(value: string): string {
  if (value === 'official_manual') return 'oficjalna instrukcja';
  if (value === 'official_compatibility_list') return 'oficjalna lista zgodności';
  if (value === 'official_specification') return 'oficjalna specyfikacja';
  if (value === 'official_product_spec') return 'oficjalna specyfikacja produktu';
  if (value === 'official_product_specification') return 'oficjalna specyfikacja produktu';
  if (value === 'official_adapter_documentation') return 'oficjalna dokumentacja adaptera';
  if (value === 'official_firmware_documentation') return 'oficjalna dokumentacja oprogramowania';
  if (value === 'independent_test') return 'niezależny test uzupełniający';
  return 'źródło wymagające opisu';
}

export function evidenceHeading(value: string): string {
  const label = evidenceSourceLabel(value);
  return `Dowód: ${label.charAt(0).toLocaleUpperCase('pl-PL')}${label.slice(1)}`;
}

export function dimensionLabel(value: string): string {
  return dimensionLabels[value] ?? 'Dodatkowy warunek zgodności';
}

export function dimensionStatusLabel(value: string): string {
  if (value === 'compatible') return 'zgodne';
  if (value === 'compatible_with_limitations') return 'zgodne z ograniczeniami';
  if (value === 'incompatible') return 'niezgodne';
  if (value === 'not_applicable') return 'nie dotyczy';
  return 'niepotwierdzone';
}

export function searchMatchLabel(value: string): string {
  if (value === 'canonical_name') return 'nazwa produktu';
  if (value === 'model') return 'model';
  if (value === 'alias') return 'inna nazwa modelu';
  if (value === 'brand') return 'marka';
  if (value === 'variant') return 'wariant';
  return 'podobna nazwa';
}

export function formatEvidenceDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date);
}

export function localizeCompatibilityMessage(value: string): string {
  const exact = messageLabels[value];
  if (exact) return exact;

  const channels = value.match(
    /^Source exposes (\d+) channels? but the selected input records (\d+)\.$/,
  );
  if (channels)
    return `Źródło udostępnia ${channels[1]} kanały, a wybrane wejście zapisuje ${channels[2]}.`;

  const required = value.match(
    /^Required sustained write is ([\d.]+) MB\/s; card guarantees ([\d.]+) MB\/s\.$/,
  );
  if (required)
    return `Tryb wymaga ${required[1]} MB/s ciągłego zapisu, a karta gwarantuje ${required[2]} MB/s.`;

  return localizeTechnicalCopy(value);
}

export function localizeTechnicalCopy(value: string): string {
  const exact = messageLabels[value];
  if (exact) return exact;

  return value
    .replaceAll('w górnym cold shoe', 'w górnej stopce akcesoriów')
    .replaceAll('sensora full frame', 'sensora pełnoklatkowego')
    .replaceAll('sensor full frame', 'sensor pełnoklatkowy')
    .replaceAll('phone clamp', 'uchwytu telefonu')
    .replaceAll('matte box', 'kompendium')
    .replaceAll('Matte box', 'Kompendium')
    .replaceAll('phantom power', 'zasilanie fantomowe')
    .replaceAll('USB Audio', 'dźwięk USB')
    .replaceAll('full frame', 'pełnoklatkowy')
    .replaceAll('cold shoe', 'stopka akcesoriów')
    .replaceAll('step-up', 'zwiększający średnicę')
    .replaceAll('sustained read', 'ciągły odczyt')
    .replaceAll('enclosure', 'obudowa')
    .replaceAll('workflow', 'ścieżka robocza')
    .replaceAll('streamingowym', 'do transmisji na żywo')
    .replaceAll('streaming', 'transmisja na żywo')
    .replaceAll('short-form', 'krótkich pionowych filmów')
    .replaceAll('payloadzie', 'obciążeniu')
    .replaceAll('payloadu', 'obciążenia')
    .replaceAll('payloadem', 'obciążeniem')
    .replaceAll('Payload', 'Obciążenie')
    .replaceAll('payload', 'obciążenie')
    .replaceAll('gimbalem', 'stabilizatorem')
    .replaceAll('gimbala', 'stabilizatora')
    .replaceAll('gimbalu', 'stabilizatorze')
    .replaceAll('gimbal', 'stabilizator')
    .replaceAll('rigu', 'zestawu')
    .replaceAll('rig', 'zestaw')
    .replaceAll('dockiem', 'stacją dokującą')
    .replaceAll('docka', 'stacji dokującej')
    .replaceAll('dock', 'stacja dokująca')
    .replaceAll('Dock', 'Stacja dokująca')
    .replaceAll('hosta', 'urządzenia nadrzędnego')
    .replaceAll('host', 'urządzenie nadrzędne')
    .replaceAll('gridu', 'plastra miodu')
    .replaceAll('grid', 'plaster miodu')
    .replaceAll('clamp', 'obejma');
}

export function dimensionExplanation(_dimension: string, status: string): string {
  if (status === 'compatible')
    return `Ten wymiar zgodności jest potwierdzony dla wybranej konfiguracji.`;
  if (status === 'compatible_with_limitations')
    return `Ten wymiar jest zgodny wyłącznie z ograniczeniami opisanymi powyżej.`;
  if (status === 'incompatible') return `Ten wymiar nie spełnia wymagań tej konfiguracji.`;
  if (status === 'not_applicable') return `Ten wymiar nie dotyczy wybranej konfiguracji.`;
  return `Brakuje wystarczającego dowodu, aby potwierdzić ten wymiar.`;
}
