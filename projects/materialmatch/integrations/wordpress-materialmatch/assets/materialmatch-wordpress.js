/* global CustomEvent, FormData, document, fetch */

const statusFor = (element) =>
  element.closest('.materialmatch-wordpress')?.querySelector('[data-materialmatch-cart-status]');

for (const element of document.querySelectorAll('material-match[data-materialmatch-wordpress]')) {
  element.addEventListener('materialmatch:add-to-cart', async (event) => {
    const status = statusFor(element);
    if (status) status.textContent = 'Dodawanie zestawu do koszyka…';
    const form = new FormData();
    form.set('action', element.dataset.ajaxAction ?? '');
    form.set('nonce', element.dataset.ajaxNonce ?? '');
    form.set('configuration_checksum', element.dataset.configurationChecksum ?? '');
    form.set('allow_partial', element.dataset.allowPartial ?? '0');
    form.set('calculation_id', String(event.detail?.calculationId ?? ''));
    form.set('calculation_input', JSON.stringify(event.detail?.input ?? {}));
    form.set('lines', JSON.stringify(event.detail?.lines ?? []));

    try {
      const response = await fetch(element.dataset.ajaxUrl ?? '', {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json();
      if (!response.ok || payload.success !== true) {
        throw new Error(payload?.data?.code ?? 'cart_request_failed');
      }
      if (status) status.textContent = 'Zestaw został dodany do koszyka.';
      element.dispatchEvent(
        new CustomEvent('materialmatch:cart-result', {
          bubbles: true,
          composed: true,
          detail: payload.data,
        }),
      );
    } catch (error) {
      if (status)
        status.textContent =
          'Nie udało się dodać zestawu. Sprawdź dostępność produktów i spróbuj ponownie.';
      element.dispatchEvent(
        new CustomEvent('materialmatch:error', {
          bubbles: true,
          composed: true,
          detail: { code: 'cart-request-failed', message: String(error) },
        }),
      );
    }
  });
}
