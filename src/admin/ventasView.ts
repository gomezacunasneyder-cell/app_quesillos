import { MESES, type ResumenMes, type ResumenSemana, type TotalesPeriodo } from '../domain/ventas';
import { currencyFormatter } from '../utils/format';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-10-26" → "26 oct". */
function diaCorto(clave: string): string {
  const [, mes, dia] = clave.split('-');
  return `${Number(dia)} ${MESES_CORTOS[Number(mes) - 1] ?? ''}`;
}

export function etiquetaSemana(resumen: ResumenSemana): string {
  const anio = resumen.fin.slice(0, 4);
  return `${diaCorto(resumen.inicio)} – ${diaCorto(resumen.fin)} ${anio}`;
}

export function etiquetaMes(resumen: ResumenMes): string {
  return `${MESES[resumen.mes - 1] ?? ''} ${resumen.anio}`;
}

/** Valor abreviado para las barras (el total exacto va en el atributo title). */
export function abreviarPesos(valor: number): string {
  if (valor === 0) return '—';
  if (valor < 1000) return `$${valor}`;
  return `$${(valor / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} mil`;
}

function textoTotales(totales: TotalesPeriodo): string {
  const pedidos = totales.pedidos === 1 ? '1 pedido' : `${totales.pedidos} pedidos`;
  const quesillos = totales.quesillos === 1 ? '1 quesillo' : `${totales.quesillos} quesillos`;
  return `${pedidos} · ${quesillos}`;
}

export interface ElementosVentas {
  semanaEtiqueta: HTMLElement;
  semanaTotal: HTMLElement;
  semanaDetalle: HTMLElement;
  semanaBarras: HTMLElement;
  mesEtiqueta: HTMLElement;
  mesTotal: HTMLElement;
  mesDetalle: HTMLElement;
}

export function renderSemana(el: ElementosVentas, resumen: ResumenSemana): void {
  el.semanaEtiqueta.textContent = etiquetaSemana(resumen);
  el.semanaTotal.textContent = currencyFormatter.format(resumen.totales.total);
  el.semanaDetalle.textContent = textoTotales(resumen.totales);

  const maximo = Math.max(...resumen.dias.map((d) => d.total), 0);

  const columnas = resumen.dias.map((dia) => {
    const item = document.createElement('li');
    item.className = 'bar';
    item.title = `${dia.etiqueta} ${diaCorto(dia.fecha)}: ${currencyFormatter.format(dia.total)} (${dia.pedidos} pedido${dia.pedidos === 1 ? '' : 's'})`;

    const valor = document.createElement('span');
    valor.className = 'bar__value';
    valor.textContent = abreviarPesos(dia.total);

    const pista = document.createElement('span');
    pista.className = 'bar__track';
    pista.setAttribute('aria-hidden', 'true');
    const relleno = document.createElement('span');
    relleno.className = 'bar__fill';
    const porcentaje = maximo > 0 ? (dia.total / maximo) * 100 : 0;
    relleno.style.height = dia.total > 0 ? `${Math.max(porcentaje, 4)}%` : '0';
    pista.append(relleno);

    const nombre = document.createElement('span');
    nombre.className = 'bar__label';
    nombre.textContent = dia.etiqueta.slice(0, 3);
    nombre.title = dia.etiqueta;

    item.append(valor, pista, nombre);
    return item;
  });

  el.semanaBarras.replaceChildren(...columnas);
}

export function renderMes(el: ElementosVentas, resumen: ResumenMes): void {
  el.mesEtiqueta.textContent = etiquetaMes(resumen);
  el.mesTotal.textContent = currencyFormatter.format(resumen.totales.total);
  el.mesDetalle.textContent = textoTotales(resumen.totales);
}
