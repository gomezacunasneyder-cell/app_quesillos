import { describe, expect, it } from 'vitest';
import { urlComoLlegar } from './maps';

describe('urlComoLlegar', () => {
  it('arma el enlace de direcciones de Google Maps con las coordenadas', () => {
    expect(urlComoLlegar({ lat: 7.8391, lng: -72.5051 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=7.8391,-72.5051',
    );
  });
});
