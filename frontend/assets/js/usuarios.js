document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formUsuario');
  const tablaUsuarios = document.getElementById('tablaUsuarios');
  const tablaAccesos = document.getElementById('tablaAccesos');
  const mensaje = document.getElementById('mensaje');

  function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
  }

  function formatearFecha(fecha) {
    if (!fecha) return 'Sin ingresos aún';
    const fechaDate = new Date(fecha);
    if (Number.isNaN(fechaDate.getTime())) return fecha;
    return fechaDate.toLocaleString('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  async function cargarUsuarios() {
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.mensaje || 'No se pudo cargar la lista de usuarios');
      }

      tablaUsuarios.innerHTML = '';
      data.usuarios.forEach(usuario => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
          <td>${usuario.nombre}</td>
          <td>${usuario.usuario}</td>
          <td>${usuario.rol}</td>
          <td><span class="badge ${usuario.activo ? 'activo' : 'inactivo'}">${usuario.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td>${formatearFecha(usuario.ultimo_login)}</td>
          <td>${formatearFecha(usuario.fecha_creacion)}</td>
        `;
        tablaUsuarios.appendChild(fila);
      });
    } catch (error) {
      console.error(error);
      mostrarMensaje('No se pudo cargar la lista de usuarios', 'error');
    }
  }

  async function cargarAccesos() {
    try {
      const res = await fetch('/api/usuarios/actividad');
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.mensaje || 'No se pudo cargar el historial de accesos');
      }

      tablaAccesos.innerHTML = '';
      if (!data.accesos.length) {
        tablaAccesos.innerHTML = '<tr><td colspan="2">No hay accesos registrados todavía.</td></tr>';
        return;
      }

      data.accesos.forEach(acceso => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
          <td>${acceso.nombre} (${acceso.usuario})</td>
          <td>${formatearFecha(acceso.fecha_ingreso)}</td>
        `;
        tablaAccesos.appendChild(fila);
      });
    } catch (error) {
      console.error(error);
      mostrarMensaje('No se pudo cargar el historial de accesos', 'error');
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const datos = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.mensaje || 'No se pudo crear el usuario');
      }

      mostrarMensaje(`Usuario creado correctamente: ${data.usuario.nombre}`, 'ok');
      form.reset();
      cargarUsuarios();
      cargarAccesos();
    } catch (error) {
      mostrarMensaje(error.message, 'error');
    }
  });

  cargarUsuarios();
  cargarAccesos();
});
