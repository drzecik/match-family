# MaterialMatch widget

Framework-agnostic web component. It reads a validated JSON configuration and delegates all domain calculations to the deterministic MaterialMatch engine. The host does not need React, a user account, or an external backend.

The production build creates two self-contained files:

- `dist/materialmatch-widget.js` — ES module;
- `dist/materialmatch-widget.iife.js` — classic script for hosts that cannot load modules.

```html
<script type="module" src="/materialmatch-widget.js"></script>
<material-match id="calculator"></material-match>
<script type="module">
  const element = document.querySelector('#calculator');
  element.configuration = configurationFromTrustedSource;
</script>
```

The default bundle already contains the calculation adapter. Applications may replace the `calculator` property in tests or specialized integrations.

For a fully declarative installation, keep the JSON as inert data inside the element:

```html
<script src="/materialmatch-widget.iife.js" defer></script>
<material-match>
  <script type="application/json" data-materialmatch-configuration>
    { "schemaVersion": "1", "configurationVersion": "1.0", "...": "..." }
  </script>
</material-match>
```

The `configuration` attribute also accepts serialized JSON up to 1 MB. Prefer the property or inert script for larger and easier-to-escape payloads. Every entry path runs through the widget configuration validator; the calculation engine validates the nested domain configuration again.

Changing `element.configuration` preserves entered room dimensions and returns to the measurement step. This lets a host switch a product or variant without making the customer re-enter measurements.

## Public methods

`setMeasurements(rooms, wasteBasisPoints?)` restores integer measurements supplied by the host. A room may include `internalCornerCount` and `externalCornerCount`; both must be non-negative integers. For compatibility with older hosts, omitted corner counts are restored as `0`. Rooms entered directly in the widget start with `4` internal and `0` external corners. `reset()` clears rooms and the result. Neither method accesses storage or the network.

## Events

All events bubble and cross the shadow DOM boundary.

| Event                                | Detail                                   | When                                                          |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------- |
| `materialmatch:ready`                | `{ configurationVersion }`               | Configuration is rendered.                                    |
| `materialmatch:measurements-change`  | `{ rooms, wasteBasisPoints }`            | A measurement changes.                                        |
| `materialmatch:step-change`          | `{ step }`                               | The user moves between measurements and result.               |
| `materialmatch:calculation-complete` | `{ result }`                             | A calculation finishes successfully.                          |
| `materialmatch:add-to-cart`          | `{ calculationId, lines, omittedLines }` | The user confirms cart lines. The host owns cart integration. |
| `materialmatch:error`                | `{ code, message }`                      | Configuration or calculation fails.                           |

## Theming

Set CSS custom properties on the element: `--mm-color-primary`, `--mm-color-primary-contrast`, `--mm-color-text`, `--mm-color-muted`, `--mm-color-surface`, `--mm-color-subtle`, `--mm-color-border`, `--mm-color-danger`, `--mm-color-warning`, `--mm-radius`, `--mm-font-family`, and `--mm-shadow`.

The default locale is Polish. Text customization uses typed translation identifiers, not selectors or executable templates.

Brand logos may use a same-origin URL or an embedded PNG, JPEG, or WebP data URL. Cross-origin and SVG URLs are rejected so configuration cannot silently add a tracking request or executable image payload.

## Accessibility

The component uses native labels, fieldsets, buttons, a result table, keyboard-focus management, live status messages, visible focus states, and a focusable overflow region on narrow screens. Mobile and desktop fixtures are checked with axe for critical and serious violations.

## Privacy and host responsibilities

The widget performs no fetches, analytics, storage, or logging. The `materialmatch:add-to-cart` event is a request to the host: the commerce adapter must validate SKU, availability, price, and quantity again on the server before changing a cart.
