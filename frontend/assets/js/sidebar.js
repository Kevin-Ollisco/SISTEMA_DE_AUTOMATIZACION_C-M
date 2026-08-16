function initSidebar() {
  const links = document.querySelectorAll('#globalSidebar nav a');
  if (!links || links.length === 0) return;
  const current = window.location.pathname.split('/').pop() || 'pos.html';
  links.forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === current) a.classList.add('active');
  });
}

function initNumericInputs() {
  const inputs = document.querySelectorAll('input[data-decimal="true"]');
  inputs.forEach(input => {
    if (input.dataset.decimalInitialized === 'true') return;

    input.dataset.decimalInitialized = 'true';
    input.setAttribute('inputmode', 'decimal');
    input.setAttribute('pattern', '[0-9,.-]*');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');

    const normalizarValor = () => {
      let valor = input.value || '';
      valor = valor.replace(/,/g, '.');
      const partes = valor.split('.');
      if (partes.length > 2) {
        valor = `${partes.shift()}.${partes.join('')}`;
      }

      valor = valor.replace(/[^0-9.-]/g, '');

      const tieneSignoNegativo = valor.startsWith('-');
      const sinSignos = valor.replace(/-/g, '');
      const partesFinales = sinSignos.split('.');
      if (partesFinales.length > 2) {
        valor = `${partesFinales.shift()}.${partesFinales.join('')}`;
      }

      if (tieneSignoNegativo && !valor.startsWith('-')) {
        valor = `-${valor}`;
      }

      input.value = valor;
    };

    input.addEventListener('input', normalizarValor);

    input.addEventListener('blur', () => {
      if (!input.value) return;
      const numero = Number.parseFloat(input.value.replace(',', '.'));
      input.value = Number.isNaN(numero) ? '' : numero.toString();
    });
  });
}

if (!window.__numericInputObserver) {
  window.__numericInputObserver = new MutationObserver(() => initNumericInputs());
  window.__numericInputObserver.observe(document.body, { childList: true, subtree: true });
}

function cerrarSesion() {
  localStorage.removeItem('usuarioActivo');
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('globalSidebar');
  if (!sidebar) return;
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
  if (!usuarioActivo) {
    if (window.location.pathname !== '/login.html') {
      window.location.href = '/login.html';
    }
    return;
  }

  document.body.classList.add('has-sidebar');
  initNumericInputs();
  sidebar.innerHTML = `
    <div class="logo">Menú</div>
    <div class="user-info">
      <div id="nombreUsuarioActivo">${usuarioActivo.nombre} (${usuarioActivo.rol})</div>
      <button onclick="cerrarSesion()">Cerrar sesión</button>
    </div>
    <nav>
      <a href="/pos.html"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5z"/></svg>POS</a>
      <a href="/inventario.html"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 7v13h18V7L12 2 3 7zm2 2h14v9H5V9zM7 11h2v2H7v-2z"/></svg>Inventario</a>
      <a href="/gastos.html"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 1 3 5v6c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V5l-9-4zM11 8h2v6h-2V8zM11 16h2v2h-2v-2z"/></svg>Gastos</a>
      <a href="/compras.html"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.6-1.35 2.45C5.1 14.37 5 14.68 5 15c0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21 6H6.21l-.94-4H1zM17 18c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2z"/></svg>Compras</a>
      <a href="/categorias.html"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z"/></svg>Categorías</a>
      <a href="/reportes.html"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h2v-2H3v2zm4 6h2v-8H7v8zm4-12h2V3h-2v4zm4 6h2v-4h-2v4zm4 6h2v-10h-2v10z"/></svg>Reportes</a>
      <a href="/backups.html"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 6V2L8 6h3v6h2V6h3l-4-4zM6 12v6h12v-6H6zm2 2h8v2H8v-2z"/></svg>Backups</a>
      <a href="/pagos-qr.html"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2 4h2v2h-2v-2z"/></svg>Pagos QR</a>
      <a href="/usuarios.html"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.2c-3.3 0-9.8 1.7-9.8 5v2.6h19.6V19c0-3.3-6.5-5-9.8-5z"/></svg>Usuarios</a>
    </nav>
    <div class="logo-tienda">
      <img src="/assets/img/logotienda.png" alt="Logo de la tienda" onerror="this.style.display='none'">
    </div>
  `;
  initSidebar();
});
