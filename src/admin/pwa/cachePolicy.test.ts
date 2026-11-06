import { describe, expect, it } from 'vitest';
import { decidirEstrategia, esRespuestaCacheable, type PeticionBasica } from './cachePolicy';

const ORIGEN = 'https://quesillos.example';

const peticion = (url: string, extra: Partial<PeticionBasica> = {}): PeticionBasica => ({
  method: 'GET',
  mode: 'cors',
  url,
  ...extra,
});

describe('decidirEstrategia', () => {
  it('las navegaciones del panel van primero a la red (con copia de respaldo)', () => {
    const p = peticion(`${ORIGEN}/admin/panel.html`, { mode: 'navigate' });
    expect(decidirEstrategia(p, ORIGEN)).toBe('red-primero');
  });

  it('los archivos de Vite con hash se sirven desde caché primero', () => {
    expect(decidirEstrategia(peticion(`${ORIGEN}/assets/adminPanel-DYO2MHWQ.js`), ORIGEN)).toBe('cache-primero');
    expect(decidirEstrategia(peticion(`${ORIGEN}/assets/dom-B_Ir2u1N.js`), ORIGEN)).toBe('cache-primero');
  });

  it('un archivo de /assets/ sin hash no se trata como inmutable', () => {
    expect(decidirEstrategia(peticion(`${ORIGEN}/assets/app.js`), ORIGEN)).toBe('ignorar');
  });

  it('el CSS del panel y el manifest van primero a la red para recibir cambios', () => {
    expect(decidirEstrategia(peticion(`${ORIGEN}/admin/css/admin.css`), ORIGEN)).toBe('red-primero');
    expect(decidirEstrategia(peticion(`${ORIGEN}/admin/manifest.webmanifest`), ORIGEN)).toBe('red-primero');
  });

  it('los íconos se sirven desde caché primero', () => {
    expect(decidirEstrategia(peticion(`${ORIGEN}/admin/icons/icon-192.png`), ORIGEN)).toBe('cache-primero');
  });

  it('NUNCA intercepta Firestore, Auth ni otros orígenes (los datos no se cachean)', () => {
    const urls = [
      'https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8',
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
      'https://securetoken.googleapis.com/v1/token',
      'https://fonts.gstatic.com/s/nunito/v26/algo.woff2',
    ];
    for (const url of urls) {
      expect(decidirEstrategia(peticion(url), ORIGEN)).toBe('ignorar');
      expect(decidirEstrategia(peticion(url, { mode: 'navigate' }), ORIGEN)).toBe('ignorar');
    }
  });

  it('solo intercepta GET: escrituras y otros métodos pasan directo', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(decidirEstrategia(peticion(`${ORIGEN}/admin/panel.html`, { method }), ORIGEN)).toBe('ignorar');
    }
  });

  it('el service worker nunca se cachea (para que pueda actualizarse)', () => {
    expect(decidirEstrategia(peticion(`${ORIGEN}/admin/sw.js`), ORIGEN)).toBe('ignorar');
  });

  it('ignora URLs inválidas y archivos propios que no son del cascarón', () => {
    expect(decidirEstrategia(peticion('no-es-una-url'), ORIGEN)).toBe('ignorar');
    expect(decidirEstrategia(peticion(`${ORIGEN}/img/hero-1.jpg`), ORIGEN)).toBe('ignorar');
  });
});

describe('esRespuestaCacheable', () => {
  const base = { ok: true, status: 200, type: 'basic', redirected: false };

  it('acepta una respuesta 200 del mismo origen', () => {
    expect(esRespuestaCacheable(base)).toBe(true);
  });

  it('rechaza errores, redirecciones y respuestas de otro origen', () => {
    expect(esRespuestaCacheable({ ...base, ok: false, status: 500 })).toBe(false);
    expect(esRespuestaCacheable({ ...base, status: 206 })).toBe(false);
    expect(esRespuestaCacheable({ ...base, redirected: true })).toBe(false);
    expect(esRespuestaCacheable({ ...base, type: 'opaque' })).toBe(false);
    expect(esRespuestaCacheable({ ...base, type: 'cors' })).toBe(false);
  });
});
