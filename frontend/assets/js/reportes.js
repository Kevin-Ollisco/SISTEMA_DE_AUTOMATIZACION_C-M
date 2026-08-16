// frontend/assets/js/reportes.js
const API_REPORTES = 'http://localhost:3000/api/reportes';

let periodoActual = 'hoy';

function seleccionarPeriodo(periodo) {
  periodoActual = periodo;

  document.querySelectorAll('.filtros button').forEach(btn => btn.classList.remove('activo'));
  document.getElementById(`btn-${periodo}`).classList.add('activo');

  const rangoPersonalizado = document.getElementById('rangoPersonalizado');
  if (periodo === 'personalizado') {
    rangoPersonalizado.classList.add('visible');
    return;
  } else {
    rangoPersonalizado.classList.remove('visible');
  }

  cargarReporte();
}

async function cargarReporte() {
  let url = `${API_REPORTES}/resumen?periodo=${periodoActual}`;

  if (periodoActual === 'personalizado') {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;

    if (!desde || !hasta) return;

    url += `&desde=${desde}&hasta=${hasta}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  if (!data.ok) return;

  const r = data.resumen;

  document.getElementById('cantidadVentas').textContent = r.cantidad_ventas;
  document.getElementById('totalVendido').textContent = `Bs ${r.total_vendido.toFixed(2)}`;
  document.getElementById('costoTotal').textContent = `Bs ${r.costo_total.toFixed(2)}`;
  document.getElementById('gananciaBruta').textContent = `Bs ${r.ganancia_bruta.toFixed(2)}`;
  document.getElementById('totalGastos').textContent = `Bs ${r.total_gastos.toFixed(2)}`;
  document.getElementById('gananciaNeta').textContent = `Bs ${r.ganancia_neta.toFixed(2)}`;

  const tbodyProductos = document.getElementById('tablaProductosMasVendidos');
  tbodyProductos.innerHTML = '';

  if (data.productos_mas_vendidos.length === 0) {
    tbodyProductos.innerHTML = '<tr><td colspan="3" class="vacio">No hay ventas en este período</td></tr>';
  } else {
    data.productos_mas_vendidos.forEach(p => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${p.nombre}</td>
        <td>${p.cantidad_vendida}</td>
        <td>Bs ${p.total_generado.toFixed(2)}</td>
      `;
      tbodyProductos.appendChild(fila);
    });
  }

  const tbodyMetodos = document.getElementById('tablaMetodosPago');
  tbodyMetodos.innerHTML = '';

  if (data.ventas_por_metodo_pago.length === 0) {
    tbodyMetodos.innerHTML = '<tr><td colspan="3" class="vacio">Sin datos</td></tr>';
  } else {
    data.ventas_por_metodo_pago.forEach(m => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td style="text-transform:capitalize;">${m.metodo_pago}</td>
        <td>${m.cantidad}</td>
        <td>Bs ${m.total.toFixed(2)}</td>
      `;
      tbodyMetodos.appendChild(fila);
    });
  }
}

async function cargarStockBajo() {
  const res = await fetch(`${API_REPORTES}/stock-bajo`);
  const data = await res.json();

  const tbody = document.getElementById('tablaStockBajo');
  tbody.innerHTML = '';

  if (!data.ok || data.productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="vacio">No hay productos con stock bajo</td></tr>';
    return;
  }

  data.productos.forEach(p => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${p.nombre}</td>
      <td class="alerta-stock">${p.stock} ${p.unidad_medida}</td>
      <td>${p.stock_minimo} ${p.unidad_medida}</td>
    `;
    tbody.appendChild(fila);
  });
}

document.getElementById('fechaDesde').addEventListener('change', cargarReporte);
document.getElementById('fechaHasta').addEventListener('change', cargarReporte);

cargarReporte();
cargarStockBajo();
