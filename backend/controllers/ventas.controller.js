// backend/controllers/ventas.controller.js
const db = require('../../database/database.js');

const registrarVentaTransaccion = db.transaction((items, metodo_pago, usuario_id) => {
  let total = 0;
  let costo_total = 0;
  const detalles = [];

  for (const item of items) {
    const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(item.producto_id);

    if (!producto) {
      throw new Error(`Producto con id ${item.producto_id} no encontrado`);
    }

    if (producto.activo !== 1) {
      throw new Error(`El producto "${producto.nombre}" ya no está disponible`);
    }

    if (producto.stock < item.cantidad) {
      throw new Error(`Stock insuficiente de "${producto.nombre}". Disponible: ${producto.stock}, solicitado: ${item.cantidad}`);
    }

    const sinEnvase = producto.es_retornable === 1 && item.sin_envase === true;
    const montoEnvase = sinEnvase ? producto.precio_envase * item.cantidad : 0;

    const subtotal = (producto.precio_venta * item.cantidad) + montoEnvase;
    const costoLinea = producto.precio_costo * item.cantidad;

    total += subtotal;
    costo_total += costoLinea;

    detalles.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad: item.cantidad,
      precio_unitario: producto.precio_venta,
      costo_unitario: producto.precio_costo,
      subtotal,
      incluye_envase: sinEnvase ? 1 : 0,
      monto_envase: montoEnvase,
      es_retornable: producto.es_retornable === 1
    });
  }

  const ganancia = total - costo_total;

  const resultadoVenta = db
    .prepare(`
      INSERT INTO ventas (usuario_id, total, costo_total, ganancia, metodo_pago)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(usuario_id || null, total, costo_total, ganancia, metodo_pago || 'efectivo');

  const venta_id = resultadoVenta.lastInsertRowid;

  const insertarDetalle = db.prepare(`
    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, costo_unitario, subtotal, monto_envase, incluye_envase)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const descontarStock = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?');
  const aumentarEnvasesPrestados = db.prepare('UPDATE productos SET envases_prestados = envases_prestados + ? WHERE id = ?');

  const insertarMovimiento = db.prepare(`
    INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo)
    VALUES (?, 'salida', ?, ?)
  `);

  for (const detalle of detalles) {
    insertarDetalle.run(
      venta_id,
      detalle.producto_id,
      detalle.cantidad,
      detalle.precio_unitario,
      detalle.costo_unitario,
      detalle.subtotal,
      detalle.monto_envase,
      detalle.incluye_envase
    );

    descontarStock.run(detalle.cantidad, detalle.producto_id);

    if (detalle.incluye_envase === 1) {
      aumentarEnvasesPrestados.run(detalle.cantidad, detalle.producto_id);
    }

    insertarMovimiento.run(
      detalle.producto_id,
      detalle.cantidad,
      `Venta #${venta_id}`
    );
  }

  return {
    id: venta_id,
    total,
    costo_total,
    ganancia,
    metodo_pago: metodo_pago || 'efectivo',
    detalles
  };
});

function crear(req, res) {
  try {
    const { items, metodo_pago, usuario_id } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, mensaje: 'El carrito está vacío' });
    }

    for (const item of items) {
      if (!item.producto_id || !item.cantidad || item.cantidad <= 0) {
        return res.status(400).json({ ok: false, mensaje: 'Datos de producto inválidos en el carrito' });
      }
    }

    const venta = registrarVentaTransaccion(items, metodo_pago, usuario_id);

    res.status(201).json({ ok: true, venta });
  } catch (error) {
    res.status(400).json({ ok: false, mensaje: error.message });
  }
}

function listar(req, res) {
  try {
    const ventas = db
      .prepare('SELECT * FROM ventas ORDER BY fecha DESC')
      .all();
    res.json({ ok: true, ventas });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function obtenerPorId(req, res) {
  try {
    const venta = db.prepare('SELECT * FROM ventas WHERE id = ?').get(req.params.id);

    if (!venta) {
      return res.status(404).json({ ok: false, mensaje: 'Venta no encontrada' });
    }

    const detalles = db
      .prepare(`
        SELECT dv.*, p.nombre AS producto_nombre
        FROM detalle_ventas dv
        JOIN productos p ON dv.producto_id = p.id
        WHERE dv.venta_id = ?
      `)
      .all(req.params.id);

    res.json({ ok: true, venta: { ...venta, detalles } });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = {
  crear,
  listar,
  obtenerPorId
};
