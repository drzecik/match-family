import { MaterialMatchElement } from './material-match-element';

if (!customElements.get('material-match')) {
  customElements.define('material-match', MaterialMatchElement);
}

export * from './index';
