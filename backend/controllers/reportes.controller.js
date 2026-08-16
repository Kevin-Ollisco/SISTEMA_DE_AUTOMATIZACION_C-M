// backend/controllers/reportes.controller.js
const db = require('../../database/database.js');

function obtenerRangoFechas(periodo, desde, hasta) {
  const ahora = new Date();
  let inicio, fin;

  if (periodo === 'hoy') {
    inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
  } else if (periodo === 'semana') {
    const diaSemana = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1;
    inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - diaSemana, 0, 0, 0);
    fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
  } else if (periodo === 'mes') {
    inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
    fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
  } else if (periodo === 'personalizado' && desde && hasta) {
    inicio = new Date(`${desde}T00:00:00`);
    fin = new Date(`${hasta}T23:59:59`);
  } else {
    inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
  }

  const formatear = fecha => {
    const pad = n => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`;
  };

  return { inicio: formatear(inicio), fin: formatear(fin) };
}

function resumenVentas(req, res) {
  try {
    const { periodo, desde, hasta } = req.query;
    const { inicio, fin } = obtenerRangoFechas(periodo, desde, hasta);

    const resumen = db
      .prepare(`
        SELECT
          COUNT(*) AS cantidad_ventas,
          COALESCE(SUM(total), 0) AS total_vendido,
          COALESCE(SUM(costo_total), 0) AS costo_total,
          COALESCE(SUM(ganancia), 0) AS ganancia_neta
        FROM ventas
        WHERE fecha BETWEEN ? AND ?
      `)
      .get(inicio, fin);

    const gastos = db
      .prepare('SELECT COALESCE(SUM(monto), 0) AS total_gastos FROM gastos WHERE fecha BETWEEN ? AND ?')
      .get(inicio, fin);

    const productosMasVendidos = db
      .prepare(`
        SELECT p.nombre, SUM(dv.cantidad) AS cantidad_vendida, SUM(dv.subtotal) AS total_generado
        FROM detalle_ventas dv
        JOIN ventas v ON dv.venta_id = v.id
        JOIN productos p ON dv.producto_id = p.id
        WHERE v.fecha BETWEEN ? AND ?
        GROUP BY dv.producto_id
        ORDER BY cantidad_vendida DESC
        LIMIT 5
      `)
      .all(inicio, fin);

    const ventasPorMetodoPago = db
      .prepare(`
        SELECT metodo_pago, COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS total
        FROM ventas
        WHERE fecha BETWEEN ? AND ?
        GROUP BY metodo_pago
      `)
      .all(inicio, fin);

    res.json({
      ok: true,
      periodo: { inicio, fin },
      resumen: {
        cantidad_ventas: resumen.cantidad_ventas,
        total_vendido: resumen.total_vendido,
        costo_total: resumen.costo_total,
        ganancia_bruta: resumen.ganancia_neta,
        total_gastos: gastos.total_gastos,
        ganancia_neta: resumen.ganancia_neta - gastos.total_gastos
      },
      productos_mas_vendidos: productosMasVendidos,
      ventas_por_metodo_pago: ventasPorMetodoPago
    });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function productosStockBajo(req, res) {
  try {
    const productos = db
      .prepare(`
        SELECT * FROM productos
        WHERE activo = 1 AND stock <= stock_minimo
        ORDER BY stock ASC
      `)
      .all();

    res.json({ ok: true, productos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = {
  resumenVentas,
  productosStockBajo
};
