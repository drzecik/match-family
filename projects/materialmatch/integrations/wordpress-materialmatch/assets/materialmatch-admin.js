/* global document, wp */

document.addEventListener('DOMContentLoaded', () => {
  const picker = document.querySelector('[data-materialmatch-logo-picker]');
  if (!picker || typeof wp === 'undefined' || typeof wp.media !== 'function') return;

  const input = picker.querySelector('#materialmatch-logo-id');
  const preview = picker.querySelector('[data-materialmatch-logo-preview]');
  const selectButton = picker.querySelector('[data-materialmatch-logo-select]');
  const removeButton = picker.querySelector('[data-materialmatch-logo-remove]');
  if (!input || !preview || !selectButton || !removeButton) return;

  selectButton.addEventListener('click', () => {
    const frame = wp.media({
      title: 'Wybierz logo kalkulatora',
      button: { text: 'Użyj tego logo' },
      library: { type: 'image' },
      multiple: false,
    });
    frame.on('select', () => {
      const attachment = frame.state().get('selection').first()?.toJSON();
      if (!attachment?.id || !attachment?.url) return;
      input.value = String(attachment.id);
      preview.src = attachment.url;
      preview.style.display = 'block';
      removeButton.hidden = false;
    });
    frame.open();
  });

  removeButton.addEventListener('click', () => {
    input.value = '0';
    preview.removeAttribute('src');
    preview.style.display = 'none';
    removeButton.hidden = true;
  });
});
