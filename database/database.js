// database/database.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const electron = require('electron');
const app = electron && typeof electron === 'object' ? electron.app : null;
const empaquetado = !!(app && app.isPackaged);

const RUTA_DB = empaquetado
  ? path.join(app.getPath('userData'), 'tienda.db')
  : path.join(__dirname, 'tienda.db');

const RUTA_SQL = path.join(__dirname, 'init.sql');

const db = new Database(RUTA_DB);

db.pragma('foreign_keys = ON');

function inicializarBaseDeDatos() {
  const sql = fs.readFileSync(RUTA_SQL, 'utf8');
  db.exec(sql);
  ejecutarMigraciones();
  console.log('Base de datos inicializada correctamente en', RUTA_DB);
}

function ejecutarMigraciones() {
  const columnasProductos = db.prepare("PRAGMA table_info(productos)").all().map(col => col.name);

  if (!columnasProductos.includes('nombre_empaque')) {
    db.exec("ALTER TABLE productos ADD COLUMN nombre_empaque TEXT NOT NULL DEFAULT 'paquete'");
    console.log('Migración aplicada: columna nombre_empaque agregada a productos');
  }

  if (!columnasProductos.includes('unidades_por_empaque')) {
    db.exec("ALTER TABLE productos ADD COLUMN unidades_por_empaque REAL NOT NULL DEFAULT 1");
    console.log('Migración aplicada: columna unidades_por_empaque agregada a productos');
  }

  if (!columnasProductos.includes('precio_envase')) {
    db.exec("ALTER TABLE productos ADD COLUMN precio_envase REAL NOT NULL DEFAULT 0");
    console.log('Migración aplicada: columna precio_envase agregada a productos');
  }

  if (!columnasProductos.includes('envases_prestados')) {
    db.exec("ALTER TABLE productos ADD COLUMN envases_prestados REAL NOT NULL DEFAULT 0");
    console.log('Migración aplicada: columna envases_prestados agregada a productos');
  }

  const columnasDetalleVentas = db.prepare("PRAGMA table_info(detalle_ventas)").all().map(col => col.name);

  if (!columnasDetalleVentas.includes('monto_envase')) {
    db.exec("ALTER TABLE detalle_ventas ADD COLUMN monto_envase REAL NOT NULL DEFAULT 0");
    console.log('Migración aplicada: columna monto_envase agregada a detalle_ventas');
  }

  if (!columnasDetalleVentas.includes('incluye_envase')) {
    db.exec("ALTER TABLE detalle_ventas ADD COLUMN incluye_envase INTEGER NOT NULL DEFAULT 0");
    console.log('Migración aplicada: columna incluye_envase agregada a detalle_ventas');
  }

  const columnasUsuarios = db.prepare("PRAGMA table_info(usuarios)").all().map(col => col.name);

  if (!columnasUsuarios.includes('ultimo_login')) {
    db.exec("ALTER TABLE usuarios ADD COLUMN ultimo_login TEXT");
    console.log('Migración aplicada: columna ultimo_login agregada a usuarios');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS accesos_usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      fecha_ingreso TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_accesos_usuarios_fecha ON accesos_usuarios(fecha_ingreso DESC)');
}

inicializarBaseDeDatos();

module.exports = db;
module.exports.RUTA_DB = RUTA_DB;
module.exports.empaquetado = empaquetado;
