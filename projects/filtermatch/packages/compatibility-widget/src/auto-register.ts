import { loadStaticWidgetConfig, resolveStaticConfigUrl } from './bootstrap.js';
import { FilterMatchWidget, registerFilterMatchWidget } from './index.js';

registerFilterMatchWidget();

void autoConfigureFromScript();

async function autoConfigureFromScript(): Promise<void> {
  const configuredScripts = Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[type="module"][src][data-config-url]')
  );
  const script = configuredScripts.find((item) => {
      try {
        return new URL(item.src, document.baseURI).href === import.meta.url;
      } catch {
        return false;
      }
    }) ?? (configuredScripts.length === 1 ? configuredScripts[0] : undefined);
  const configuredTargets = Array.from(
    document.querySelectorAll<FilterMatchWidget>('filter-match-widget[data-config-url]')
  );
  const declarativeTarget = configuredTargets.length === 1 ? configuredTargets[0] : undefined;
  const rawConfigUrl = script?.dataset.configUrl ?? declarativeTarget?.dataset.configUrl;
  const configurationSource = script ?? declarativeTarget;
  if (!configurationSource || !rawConfigUrl) return;
  let target: FilterMatchWidget | null = null;
  try {
    const targetSelector = script?.dataset.target ?? 'filter-match-widget';
    const candidate = declarativeTarget ?? document.querySelector(targetSelector);
    if (!(candidate instanceof FilterMatchWidget)) {
      throw new Error(`FilterMatch widget target not found: ${targetSelector}`);
    }
    target = candidate;
    const configUrl = resolveStaticConfigUrl(
      rawConfigUrl,
      document.baseURI,
      configurationSource.dataset.allowCrossOriginConfig === 'true'
    );
    target.config = await loadStaticWidgetConfig(configUrl);
  } catch (error) {
    if (target) {
      target.textContent = 'Widget ma nieprawidłową konfigurację i nie może pokazać wyników.';
    }
    (target ?? document).dispatchEvent(new CustomEvent('filtermatch:config-error', {
      detail: { message: error instanceof Error ? error.message : 'Static widget configuration failed' },
      bubbles: true,
      composed: true
    }));
  }
}
