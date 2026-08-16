// frontend/assets/js/compras.js
const API_PRODUCTOS = 'http://localhost:3000/api/productos';
const API_COMPRAS = 'http://localhost:3000/api/compras';

let productosDisponibles = [];
let carritoCompra = [];
let productoSeleccionado = null;

async function cargarProductosDisponibles() {
  const res = await fetch(API_PRODUCTOS);
  const data = await res.json();

  if (!data.ok) return;

  productosDisponibles = data.productos;
}

function buscarProductoCompra() {
  const termino = document.getElementById('buscadorProductoCompra').value.toLowerCase().trim();
  const resultados = document.getElementById('resultadosBusquedaProducto');

  productoSeleccionado = null;

  if (!termino) {
    resultados.style.display = 'none';
    resultados.innerHTML = '';
    limpiarInfoProducto();
    return;
  }

  const coincidencias = productosDisponibles
    .filter(p =>
      p.nombre.toLowerCase().includes(termino) ||
      (p.codigo && p.codigo.toLowerCase().includes(termino))
    )
    .slice(0, 8);

  if (coincidencias.length === 0) {
    resultados.innerHTML = '<div style="padding:10px; color:#64748b;">Sin resultados</div>';
    resultados.style.display = 'block';
    return;
  }

  resultados.innerHTML = coincidencias.map(p => `
    <div class="resultado-item" onclick="seleccionarProductoCompra(${p.id})">
      <strong>${p.nombre}</strong><br>
      <span style="color:#94a3b8;">Stock: ${p.stock} ${p.unidad_medida} · Costo actual: Bs ${p.precio_costo.toFixed(2)} · Venta: Bs ${p.precio_venta.toFixed(2)}</span>
    </div>
  `).join('');
  resultados.style.display = 'block';
}

function seleccionarProductoCompra(id) {
  productoSeleccionado = productosDisponibles.find(p => p.id === id);

  if (!productoSeleccionado) return;

  document.getElementById('buscadorProductoCompra').value = productoSeleccionado.nombre;
  document.getElementById('resultadosBusquedaProducto').style.display = 'none';
  document.getElementById('resultadosBusquedaProducto').innerHTML = '';

  document.getElementById('unidadesPorPaquete').value = productoSeleccionado.unidades_por_empaque || 1;
  document.getElementById('nombreEmpaqueLabel').textContent = `${productoSeleccionado.nombre_empaque || 'paquete'}(s)`;

  calcularResumenLinea();
}

function limpiarInfoProducto() {
  document.getElementById('infoProducto').innerHTML = '';
  document.getElementById('resumenLinea').innerHTML = '';
  document.getElementById('unidadesPorPaquete').value = 1;
  document.getElementById('nombreEmpaqueLabel').textContent = 'paquete(s)';
}

function calcularResumenLinea() {
  if (!productoSeleccionado) {
    document.getElementById('infoProducto').innerHTML = '';
    document.getElementById('resumenLinea').innerHTML = '';
    return;
  }

  const cantidadPaquetes = parseFloat(document.getElementById('cantidadPaquetes').value) || 0;
  const unidadesPorPaquete = parseFloat(document.getElementById('unidadesPorPaquete').value) || 1;
  const costoPaquete = parseFloat(document.getElementById('costoPaquete').value) || 0;

  const costoAnterior = productoSeleccionado.precio_costo;
  const precioVenta = productoSeleccionado.precio_venta;
  const gananciaAnterior = precioVenta - costoAnterior;

  // Info base: siempre visible aunque todavía no escriban el costo nuevo
  let infoHtml = `Última vez compraste a <strong>Bs ${costoAnterior.toFixed(2)}</strong> por ${productoSeleccionado.unidad_medida} · ` +
    `Precio de venta actual: Bs ${precioVenta.toFixed(2)} · Ganancia actual: Bs ${gananciaAnterior.toFixed(2)}`;

  document.getElementById('infoProducto').innerHTML = infoHtml;

  if (costoPaquete <= 0 || unidadesPorPaquete <= 0) {
    document.getElementById('resumenLinea').innerHTML = '';
    return;
  }

  const cantidadUnidades = cantidadPaquetes * unidadesPorPaquete;
  const costoNuevo = costoPaquete / unidadesPorPaquete;
  const subtotal = costoPaquete * cantidadPaquetes;
  const diferencia = costoNuevo - costoAnterior;
  const gananciaNueva = precioVenta - costoNuevo;

  const colorDiferencia = diferencia > 0.001 ? '#f87171' : (diferencia < -0.001 ? '#86efac' : '#94a3b8');
  const bajoGanancia = gananciaNueva < gananciaAnterior - 0.001;
  const sinGanancia = gananciaNueva <= 0;
  const colorGanancia = sinGanancia || bajoGanancia ? '#f87171' : '#86efac';

  let alerta = '';
  if (sinGanancia) {
    alerta = ' ⚠️ ¡ESTARÍAS VENDIENDO A PÉRDIDA CON ESTE COSTO!';
  } else if (bajoGanancia) {
    alerta = ' ⚠️ Tu ganancia bajó respecto a la compra anterior';
  }

  const resumenHtml =
    `= ${cantidadUnidades} unidades a <strong>Bs ${costoNuevo.toFixed(2)}</strong> c/u ` +
    `(<span style="color:${colorDiferencia}; font-weight:bold;">${diferencia >= 0 ? '+' : ''}Bs ${diferencia.toFixed(2)} vs. la última compra</span>) · ` +
    `Subtotal: Bs ${subtotal.toFixed(2)}<br>` +
    `Ganancia por unidad con este nuevo costo: <span style="color:${colorGanancia}; font-weight:bold;">Bs ${gananciaNueva.toFixed(2)}</span>${alerta}`;

  document.getElementById('resumenLinea').innerHTML = resumenHtml;
}

function agregarItemCompra() {
  if (!productoSeleccionado) {
    alert('Busca y selecciona un producto de la lista');
    return;
  }

  const cantidadPaquetes = parseFloat(document.getElementById('cantidadPaquetes').value);
  const unidadesPorPaquete = parseFloat(document.getElementById('unidadesPorPaquete').value) || 1;
  const costoPaquete = parseFloat(document.getElementById('costoPaquete').value);

  if (!cantidadPaquetes || cantidadPaquetes <= 0) {
    alert('Ingresa una cantidad válida');
    return;
  }

  if (costoPaquete === undefined || isNaN(costoPaquete) || costoPaquete < 0) {
    alert('Ingresa un costo válido');
    return;
  }

  const costoNuevo = costoPaquete / unidadesPorPaquete;
  const gananciaNueva = productoSeleccionado.precio_venta - costoNuevo;

  if (gananciaNueva <= 0) {
    const continuar = confirm(
      `Con este costo (Bs ${costoNuevo.toFixed(2)} c/u), estarías vendiendo "${productoSeleccionado.nombre}" a pérdida ` +
      `(precio de venta actual: Bs ${productoSeleccionado.precio_venta.toFixed(2)}).\n\n` +
      '¿Deseas agregarlo de todas formas? (recuerda subir el precio de venta luego en Inventario)'
    );
    if (!continuar) return;
  }

  carritoCompra.push({
    producto_id: productoSeleccionado.id,
    nombre: productoSeleccionado.nombre,
    nombre_empaque: productoSeleccionado.nombre_empaque || 'paquete',
    cantidad_paquetes: cantidadPaquetes,
    unidades_por_paquete: unidadesPorPaquete,
    costo_paquete: costoPaquete,
    costo_anterior: productoSeleccionado.precio_costo
  });

  document.getElementById('buscadorProductoCompra').value = '';
  document.getElementById('cantidadPaquetes').value = '';
  document.getElementById('costoPaquete').value = '';
  document.getElementById('unidadesPorPaquete').value = 1;
  document.getElementById('nombreEmpaqueLabel').textContent = 'paquete(s)';
  limpiarInfoProducto();
  productoSeleccionado = null;

  renderizarCarritoCompra();
}

function quitarItemCompra(index) {
  carritoCompra.splice(index, 1);
  renderizarCarritoCompra();
}

function renderizarCarritoCompra() {
  const tbody = document.getElementById('tablaCarritoCompra');
  tbody.innerHTML = '';

  let total = 0;

  carritoCompra.forEach((item, index) => {
    const cantidadUnidades = item.cantidad_paquetes * item.unidades_por_paquete;
    const costoUnitario = item.costo_paquete / item.unidades_por_paquete;
    const subtotal = item.costo_paquete * item.cantidad_paquetes;
    const diferencia = costoUnitario - item.costo_anterior;
    total += subtotal;

    const colorDif = diferencia > 0.001 ? '#f87171' : (diferencia < -0.001 ? '#86efac' : '#94a3b8');

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${item.nombre}</td>
      <td>${item.cantidad_paquetes} ${item.nombre_empaque}(s)</td>
      <td>${cantidadUnidades}</td>
      <td>Bs ${costoUnitario.toFixed(2)} <span style="color:${colorDif}; font-size:11px;">(${diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)})</span></td>
      <td>Bs ${subtotal.toFixed(2)}</td>
      <td><button class="btn-quitar-compra" onclick="quitarItemCompra(${index})">✕</button></td>
    `;
    tbody.appendChild(fila);
  });

  document.getElementById('totalCompra').textContent = `Bs ${total.toFixed(2)}`;
  document.getElementById('btnRegistrarCompra').disabled = carritoCompra.length === 0;
}

async function registrarCompra() {
  if (carritoCompra.length === 0) return;

  const proveedor = document.getElementById('proveedor').value;
  const btn = document.getElementById('btnRegistrarCompra');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const items = carritoCompra.map(item => ({
    producto_id: item.producto_id,
    cantidad_paquetes: item.cantidad_paquetes,
    unidades_por_paquete: item.unidades_por_paquete,
    costo_total_paquete: item.costo_paquete
  }));

  try {
    const res = await fetch(API_COMPRAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proveedor, items })
    });

    const data = await res.json();

    if (data.ok) {
      alert(`Compra #${data.compra.id} registrada. Stock actualizado correctamente.`);
      carritoCompra = [];
      document.getElementById('proveedor').value = '';
      renderizarCarritoCompra();
      cargarProductosDisponibles();
    } else {
      alert('No se pudo registrar la compra:\n' + data.mensaje);
    }
  } catch (error) {
    alert('Error de conexión al registrar la compra');
  } finally {
    btn.textContent = 'Registrar Compra';
    btn.disabled = carritoCompra.length === 0;
  }
}

document.getElementById('buscadorProductoCompra').addEventListener('input', buscarProductoCompra);
document.getElementById('cantidadPaquetes').addEventListener('input', calcularResumenLinea);
document.getElementById('unidadesPorPaquete').addEventListener('input', calcularResumenLinea);
document.getElementById('costoPaquete').addEventListener('input', calcularResumenLinea);
document.getElementById('btnAgregarItem').addEventListener('click', agregarItemCompra);
document.getElementById('btnRegistrarCompra').addEventListener('click', registrarCompra);

document.addEventListener('click', (e) => {
  const contenedor = document.querySelector('.buscador-producto-contenedor');
  if (contenedor && !contenedor.contains(e.target)) {
    document.getElementById('resultadosBusquedaProducto').style.display = 'none';
  }
});

cargarProductosDisponibles();
