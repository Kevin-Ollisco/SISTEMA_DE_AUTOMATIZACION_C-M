// frontend/assets/js/pos.js
const API_PRODUCTOS = 'http://localhost:3000/api/productos';

const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
if (!usuarioActivo) {
  window.location.href = '/login.html';
}

if (usuarioActivo) {
  document.addEventListener('DOMContentLoaded', () => {
    const span = document.getElementById('nombreUsuarioActivo');
    if (span) span.textContent = `${usuarioActivo.nombre} (${usuarioActivo.rol})`;
    initSidebar();
  });
}

let carrito = [];

async function buscarProductos() {
  const termino = document.getElementById('buscadorPos').value;
  const url = termino ? `${API_PRODUCTOS}?busqueda=${encodeURIComponent(termino)}` : API_PRODUCTOS;

  const res = await fetch(url);
  const data = await res.json();

  const grid = document.getElementById('gridProductos');
  grid.innerHTML = '';

  if (!data.ok) return;

  data.productos.forEach(producto => {
    const sinStock = producto.stock <= 0;

    const tarjeta = document.createElement('div');
    tarjeta.className = `tarjeta-producto ${sinStock ? 'sin-stock' : ''}`;
    tarjeta.innerHTML = `
      <div class="nombre">${producto.nombre}${producto.es_retornable === 1 ? ' ♻️' : ''}</div>
      <div class="precio">Bs ${producto.precio_venta.toFixed(2)}</div>
      <div class="stock">Stock: ${producto.stock} ${producto.unidad_medida}</div>
    `;

    if (!sinStock) {
      tarjeta.onclick = () => agregarAlCarrito(producto);
    }

    grid.appendChild(tarjeta);
  });
}

function agregarAlCarrito(producto) {
  let sinEnvase = false;

  if (producto.es_retornable === 1) {
    sinEnvase = !confirm(`"${producto.nombre}" es un producto retornable.\n\n¿El cliente TRAE su envase vacío?\n\nAceptar = Sí trae envase (no se cobra depósito)\nCancelar = No trae envase (se cobra depósito de Bs ${producto.precio_envase.toFixed(2)})`);
  }

  const itemExistente = carrito.find(
    item => item.producto_id === producto.id && item.sin_envase === sinEnvase
  );

  if (itemExistente) {
    if (itemExistente.cantidad + 1 > producto.stock) {
      alert(`No hay suficiente stock de "${producto.nombre}". Stock disponible: ${producto.stock}`);
      return;
    }
    itemExistente.cantidad += 1;
  } else {
    carrito.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio_venta: producto.precio_venta,
      unidad_medida: producto.unidad_medida,
      stock_disponible: producto.stock,
      es_retornable: producto.es_retornable === 1,
      precio_envase: producto.precio_envase || 0,
      sin_envase: sinEnvase,
      cantidad: 1
    });
  }

  renderizarCarrito();
}

function cambiarCantidad(producto_id, sinEnvase, delta) {
  const item = carrito.find(i => i.producto_id === producto_id && i.sin_envase === sinEnvase);
  if (!item) return;

  const nuevaCantidad = item.cantidad + delta;

  if (nuevaCantidad <= 0) {
    carrito = carrito.filter(i => !(i.producto_id === producto_id && i.sin_envase === sinEnvase));
  } else if (nuevaCantidad > item.stock_disponible) {
    alert(`No hay suficiente stock de "${item.nombre}". Stock disponible: ${item.stock_disponible}`);
    return;
  } else {
    item.cantidad = nuevaCantidad;
  }

  renderizarCarrito();
}

function quitarDelCarrito(producto_id, sinEnvase) {
  carrito = carrito.filter(i => !(i.producto_id === producto_id && i.sin_envase === sinEnvase));
  renderizarCarrito();
}

function calcularSubtotalItem(item) {
  const montoEnvase = item.sin_envase ? item.precio_envase * item.cantidad : 0;
  return (item.precio_venta * item.cantidad) + montoEnvase;
}

function renderizarCarrito() {
  const lista = document.getElementById('listaCarrito');
  const btnCobrar = document.getElementById('btnCobrar');

  if (carrito.length === 0) {
    lista.innerHTML = '<div class="carrito-vacio">El carrito está vacío</div>';
    btnCobrar.disabled = true;
  } else {
    lista.innerHTML = '';
    btnCobrar.disabled = false;

    carrito.forEach(item => {
      const subtotal = calcularSubtotalItem(item);
      const etiquetaEnvase = item.es_retornable
        ? (item.sin_envase ? ` · +Bs ${item.precio_envase.toFixed(2)} envase` : ' · trae envase')
        : '';

      const fila = document.createElement('div');
      fila.className = 'item-carrito';
      fila.innerHTML = `
        <div class="info-item">
          <div class="nombre-item">${item.nombre}</div>
          <div class="precio-item">Bs ${item.precio_venta.toFixed(2)} c/u${etiquetaEnvase}</div>
        </div>
        <div class="controles-cantidad">
          <button onclick="cambiarCantidad(${item.producto_id}, ${item.sin_envase}, -1)">-</button>
          <span>${item.cantidad}</span>
          <button onclick="cambiarCantidad(${item.producto_id}, ${item.sin_envase}, 1)">+</button>
        </div>
        <div class="subtotal-item">Bs ${subtotal.toFixed(2)}</div>
        <button class="btn-quitar" onclick="quitarDelCarrito(${item.producto_id}, ${item.sin_envase})">✕</button>
      `;
      lista.appendChild(fila);
    });
  }

  const total = carrito.reduce((suma, item) => suma + calcularSubtotalItem(item), 0);
  document.getElementById('totalVenta').textContent = `Bs ${total.toFixed(2)}`;
}

async function procesarCobro() {
  if (carrito.length === 0) return;

  const btnCobrar = document.getElementById('btnCobrar');
  btnCobrar.disabled = true;
  btnCobrar.textContent = 'Procesando...';

  const items = carrito.map(item => ({
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    sin_envase: item.sin_envase
  }));

  const metodo_pago = document.getElementById('metodoPago').value;

  try {
    const res = await fetch('http://localhost:3000/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, metodo_pago, usuario_id: usuarioActivo ? usuarioActivo.id : null })
    });

    const data = await res.json();

    if (data.ok) {
      const venta = data.venta;
      alert(
        `Venta #${venta.id} registrada correctamente\n\n` +
        venta.detalles.map(d => `${d.cantidad} x ${d.nombre} = Bs ${d.subtotal.toFixed(2)}`).join('\n') +
        `\n\nTOTAL COBRADO: Bs ${venta.total.toFixed(2)}` +
        `\nGanancia de esta venta: Bs ${venta.ganancia.toFixed(2)}`
      );

      carrito = [];
      renderizarCarrito();
      buscarProductos();
    } else {
      alert('No se pudo registrar la venta:\n' + data.mensaje);
    }
  } catch (error) {
    alert('Error de conexión al registrar la venta');
  } finally {
    btnCobrar.textContent = 'Cobrar';
    btnCobrar.disabled = carrito.length === 0;
  }
}

function cerrarSesion() {
  localStorage.removeItem('usuarioActivo');
  window.location.href = '/login.html';
}

document.getElementById('buscadorPos').addEventListener('input', buscarProductos);
document.getElementById('btnCobrar').addEventListener('click', procesarCobro);

renderizarCarrito();
buscarProductos();
