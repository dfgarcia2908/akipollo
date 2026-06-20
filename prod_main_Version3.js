window.$ = function (id) {
  return document.getElementById(id);
};

window.setText = function (id, value) {
  const el = $(id);
  if (el) el.textContent = value;
};

window.esc = function (s) {
  return String(s || '').replace(/[&<>"']/g, function (c) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c];
  });
};

window.money = function (n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(n) || 0);
};

window.parseMoney = function (v) {
  return Number(String(v || '').replace(/\D/g, '')) || 0;
};

window.invoiceId = function (n) {
  return 'FV' + String(Number(n) || 0).padStart(3, '0');
};

window.toast = function (msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () {
    t.classList.remove('show');
  }, 2500);
};

const DB_NAME = 'AkiPolloDB';
const DB_VERSION = 1;
const STORE_NAME = 'store';

window.idb = {
  db: null,

  init: function () {
    return new Promise(function (resolve, reject) {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = function () {
        reject(req.error);
      };

      req.onsuccess = function () {
        window.idb.db = req.result;
        resolve();
      };

      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  },

  get: function (key, fallback) {
    return new Promise(function (resolve) {
      if (!window.idb.db) {
        resolve(fallback);
        return;
      }

      try {
        const req = window.idb.db
          .transaction(STORE_NAME, 'readonly')
          .objectStore(STORE_NAME)
          .get(key);

        req.onsuccess = function () {
          resolve(req.result !== undefined ? req.result : fallback);
        };

        req.onerror = function () {
          resolve(fallback);
        };
      } catch (e) {
        resolve(fallback);
      }
    });
  },

  set: function (key, value) {
    return new Promise(function (resolve) {
      if (!window.idb.db) {
        resolve(false);
        return;
      }

      try {
        const req = window.idb.db
          .transaction(STORE_NAME, 'readwrite')
          .objectStore(STORE_NAME)
          .put(value, key);

        req.onsuccess = function () {
          resolve(true);
        };

        req.onerror = function () {
          resolve(false);
        };
      } catch (e) {
        resolve(false);
      }
    });
  }
};

window.DEFAULT_CASHIERS = [
  { user: 'admin', pin: '1234', role: 'Gerente', approved: true, blocked: false },
  { user: 'caja', pin: '1111', role: 'Cajero', approved: true, blocked: false }
];

window.APP_STATE = {
  products: window.AKI_PRODUCTS || [],
  historicalClients: window.AKI_CLIENTS || [],
  cart: [],
  sales: [],
  cashiers: [],
  activeUser: null,
  category: 'Todos',
  orderType: 'Mesa',
  method: 'Efectivo',
  nextInvoice: 1
};

window.ensureCashiers = async function () {
  let cashiers = await window.idb.get('cashiers', []);

  if (!Array.isArray(cashiers) || !cashiers.length) {
    cashiers = window.DEFAULT_CASHIERS.slice();
    await window.idb.set('cashiers', cashiers);
  }

  window.APP_STATE.cashiers = cashiers;
};

window.loadInitialData = async function () {
  window.APP_STATE.products = window.AKI_PRODUCTS || [];
  window.APP_STATE.historicalClients = window.AKI_CLIENTS || [];
  window.APP_STATE.sales = await window.idb.get('sales', []);
  window.APP_STATE.nextInvoice = await window.idb.get('nextInvoice', 1);

  const invoice = $('invoiceNumber');
  if (invoice) {
    invoice.value = String(window.APP_STATE.nextInvoice).padStart(3, '0');
  }
};

window.saveCashiers = async function () {
  await window.idb.set('cashiers', window.APP_STATE.cashiers || []);
};

window.login = function () {
  const userInput = $('loginUser');
  const pinInput = $('loginPin');

  const u = userInput ? userInput.value.trim().toLowerCase() : '';
  const pin = pinInput ? pinInput.value.trim() : '';

  const cashiers = window.APP_STATE.cashiers || [];

  if (!u || !pin) {
    setText('loginError', 'Ingrese usuario y clave.');
    return;
  }

  const person = cashiers.find(function (c) {
    return String(c.user).toLowerCase() === u && String(c.pin) === pin;
  });

  if (!person) {
    setText('loginError', 'Usuario o clave incorrectos.');
    return;
  }

  if (person.blocked) {
    setText('loginError', 'Usuario bloqueado.');
    return;
  }

  if (!person.approved) {
    setText('loginError', 'Usuario pendiente de aprobación.');
    return;
  }

  window.APP_STATE.activeUser = person;
  setText('loginError', '');

  if (pinInput) {
    pinInput.value = '';
  }

  const modal = $('loginModal');
  if (modal) {
    modal.classList.remove('open');
  }

  setText('activeUserName', person.user);
  setText('activeUserRole', '● ' + person.role + ' · Caja abierta');
  setText('activeUserAvatar', person.user.charAt(0).toUpperCase());

  toast('Caja abierta por ' + person.user);
  renderCashiers();
};

window.logout = function () {
  window.APP_STATE.activeUser = null;
  setText('activeUserName', 'SIN SESIÓN');
  setText('activeUserRole', '● Caja cerrada');
  setText('activeUserAvatar', '—');

  const modal = $('loginModal');
  if (modal) {
    modal.classList.add('open');
  }

  renderCashiers();
};

window.requireManager = function () {
  const user = window.APP_STATE.activeUser;
  if (!user || user.role !== 'Gerente') {
    toast('Solo el gerente puede hacer esta acción.');
    return false;
  }
  return true;
};

window.createCashier = async function (user, pin, role) {
  const current = window.APP_STATE.activeUser;
  const username = String(user || '').trim();
  const password = String(pin || '').trim();
  const roleName = String(role || 'Cajero').trim() || 'Cajero';

  if (!username || !password) {
    toast('Usuario y clave son obligatorios.');
    return false;
  }

  if (roleName === 'Gerente' && (!current || current.role !== 'Gerente')) {
    toast('Solo un gerente puede crear otro gerente.');
    return false;
  }

  const exists = window.APP_STATE.cashiers.some(function (c) {
    return String(c.user).toLowerCase() === username.toLowerCase();
  });

  if (exists) {
    toast('Ese usuario ya existe.');
    return false;
  }

  window.APP_STATE.cashiers.push({
    user: username,
    pin: password,
    role: roleName,
    approved: true,
    blocked: false
  });

  await window.saveCashiers();
  toast('Usuario creado: ' + username);
  return true;
};

window.toggleCashierBlock = async function (user) {
  const current = window.APP_STATE.activeUser;
  const cashier = window.APP_STATE.cashiers.find(function (c) {
    return c.user === user;
  });

  if (!cashier) return;

  if (current && cashier.user === current.user) {
    toast('No puede bloquear su propio usuario.');
    return;
  }

  cashier.blocked = !cashier.blocked;
  await window.saveCashiers();
  toast(cashier.blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado');
};

window.changeCashierPin = async function (user, newPin) {
  const cashier = window.APP_STATE.cashiers.find(function (c) {
    return c.user === user;
  });

  if (!cashier) {
    toast('Usuario no encontrado.');
    return false;
  }

  const cleanPin = String(newPin || '').trim();
  if (!cleanPin) {
    toast('La nueva clave no puede estar vacía.');
    return false;
  }

  cashier.pin = cleanPin;
  await window.saveCashiers();
  toast('Clave actualizada para ' + user);
  return true;
};

window.deleteCashier = async function (user) {
  const current = window.APP_STATE.activeUser;
  const cashier = window.APP_STATE.cashiers.find(function (c) {
    return c.user === user;
  });

  if (!cashier) {
    toast('Usuario no encontrado.');
    return false;
  }

  if (current && cashier.user === current.user) {
    toast('No puede eliminar su propio usuario.');
    return false;
  }

  const managers = window.APP_STATE.cashiers.filter(function (c) {
    return c.role === 'Gerente';
  });

  if (cashier.role === 'Gerente' && managers.length <= 1) {
    toast('Debe existir al menos un gerente.');
    return false;
  }

  window.APP_STATE.cashiers = window.APP_STATE.cashiers.filter(function (c) {
    return c.user !== user;
  });

  await window.saveCashiers();
  toast('Usuario eliminado: ' + user);
  return true;
};

window.renderCashiers = function () {
  const body = $('cashiersBody');
  if (!body) return;

  const user = window.APP_STATE.activeUser;
  if (!user || user.role !== 'Gerente') {
    body.innerHTML = '<tr><td colspan="5">Solo el gerente puede ver esta sección.</td></tr>';
    return;
  }

  const cashiers = window.APP_STATE.cashiers || [];

  body.innerHTML = cashiers.map(function (c) {
    return '' +
      '<tr>' +
        '<td>' + esc(c.user) + '</td>' +
        '<td>' + esc(c.role) + '</td>' +
        '<td>' + (c.blocked ? 'Bloqueado' : 'Activo') + '</td>' +
        '<td>' + (c.approved ? 'Sí' : 'No') + '</td>' +
        '<td style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button onclick="toggleCashierBlockFromUI(\'' + esc(c.user) + '\')">' +
            (c.blocked ? 'Desbloquear' : 'Bloquear') +
          '</button>' +
          '<button onclick="changeCashierPinFromUI(\'' + esc(c.user) + '\')">Cambiar clave</button>' +
          '<button onclick="deleteCashierFromUI(\'' + esc(c.user) + '\')">Eliminar</button>' +
        '</td>' +
      '</tr>';
  }).join('');
};

window.createCashierFromUI = async function () {
  if (!requireManager()) return;

  const userEl = $('newCashierUser');
  const pinEl = $('newCashierPin');
  const roleEl = $('newCashierRole');

  const user = userEl ? userEl.value.trim() : '';
  const pin = pinEl ? pinEl.value.trim() : '';
  const role = roleEl ? roleEl.value : 'Cajero';

  const ok = await window.createCashier(user, pin, role);
  if (!ok) return;

  if (userEl) userEl.value = '';
  if (pinEl) pinEl.value = '';
  if (roleEl) roleEl.value = 'Cajero';

  renderCashiers();
};

window.toggleCashierBlockFromUI = async function (user) {
  if (!requireManager()) return;
  await window.toggleCashierBlock(user);
  renderCashiers();
};

window.changeCashierPinFromUI = async function (user) {
  if (!requireManager()) return;

  const newPin = prompt('Nueva clave para ' + user + ':');
  if (newPin === null) return;

  const ok = await window.changeCashierPin(user, newPin);
  if (!ok) return;

  renderCashiers();
};

window.deleteCashierFromUI = async function (user) {
  if (!requireManager()) return;

  const yes = confirm('¿Seguro que desea eliminar al usuario ' + user + '?');
  if (!yes) return;

  const ok = await window.deleteCashier(user);
  if (!ok) return;

  renderCashiers();
};

window.productPrice = function (p) {
  return Number((p && p.price) || 0);
};

window.renderChips = function () {
  const el = $('chips');
  if (!el) return;

  const products = window.APP_STATE.products || [];
  const category = window.APP_STATE.category || 'Todos';
  const cats = ['Todos'].concat(
    Array.from(new Set(products.map(function (p) { return p.cat; }).filter(Boolean)))
  );

  el.innerHTML = cats.map(function (c) {
    return '<button class="chip ' + (c === category ? 'active' : '') +
      '" onclick="APP_STATE.category=\'' + esc(c) + '\';renderChips();renderProducts()">' +
      esc(c) + '</button>';
  }).join('');
};

// renderProducts is defined in index.html to include product images.

window.add = function (id) {
  const products = window.APP_STATE.products || [];
  const cart = window.APP_STATE.cart || [];
  const p = products.find(function (x) { return x.id === id; });

  if (!p) return;

  const row = cart.find(function (x) { return x.id === id; });
  if (row) {
    row.qty++;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      cat: p.cat,
      price: productPrice(p),
      qty: 1
    });
  }

  renderCart();
};

window.qty = function (id, d) {
  const state = window.APP_STATE;
  const r = state.cart.find(function (x) { return x.id === id; });
  if (!r) return;

  r.qty += d;

  if (r.qty < 1) {
    state.cart = state.cart.filter(function (x) { return x.id !== id; });
  }

  renderCart();
};

window.renderCart = function () {
  const cartEl = $('cart');
  if (!cartEl) return;

  const cart = window.APP_STATE.cart || [];

  if (!cart.length) {
    cartEl.innerHTML = '<div style="padding:20px;border:2px dashed #ddd;border-radius:14px;color:#666;text-align:center;">No hay productos en el carrito</div>';
  } else {
    cartEl.innerHTML = cart.map(function (r) {
      return '' +
        '<div class="cart-row">' +
          '<div>' +
            '<b>' + esc(r.name) + '</b>' +
            '<small>' + money(r.price) + ' c/u</small>' +
          '</div>' +
          '<div class="qty">' +
            '<button onclick="qty(\'' + esc(r.id) + '\', -1)">-</button>' +
            '<span>' + r.qty + '</span>' +
            '<button onclick="qty(\'' + esc(r.id) + '\', 1)">+</button>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  const subtotal = cart.reduce(function (a, r) {
    return a + (Number(r.price) || 0) * (Number(r.qty) || 0);
  }, 0);

  const tax = 0;
  const total = subtotal + tax;

  setText('subtotal', money(subtotal));
  setText('tax', money(tax));
  setText('total', money(total));

  updateQuickChange();
};

window.updateQuickChange = function () {
  const total = (window.APP_STATE.cart || []).reduce(function (a, r) {
    return a + (Number(r.price) || 0) * (Number(r.qty) || 0);
  }, 0);

  const receivedInput = $('quickReceived');
  const received = parseMoney(receivedInput ? receivedInput.value : 0);
  const change = received - total;

  setText('quickChange', money(change > 0 ? change : 0));
  setText('quickWarning', received > 0 && change < 0 ? 'Falta dinero para completar el pago.' : '');
};

window.renderSales = function () {
  const body = $('salesBody');
  if (!body) return;

  const search = $('salesSearch');
  const q = String(search ? search.value : '').toLowerCase();

  const rows = (window.APP_STATE.sales || []).filter(function (s) {
    return String(s.invoice || '').toLowerCase().includes(q) ||
      String(s.customer || '').toLowerCase().includes(q) ||
      String(s.cashier || '').toLowerCase().includes(q);
  });

  body.innerHTML = rows.map(function (s) {
    return '' +
      '<tr>' +
        '<td>' + esc(s.invoice) + '</td>' +
        '<td>' + esc(s.date) + '</td>' +
        '<td>' + esc(s.orderType) + '</td>' +
        '<td>' + s.items + '</td>' +
        '<td>' + esc(s.method) + '</td>' +
        '<td>' + money(s.total) + '</td>' +
        '<td>OK</td>' +
      '</tr>';
  }).join('');
};

window.updateDashboard = function () {
  const sales = window.APP_STATE.sales || [];
  const todayStr = new Date().toLocaleDateString('es-CO');
  const todaySales = sales.filter(function (s) { return s.date === todayStr; });

  const total = todaySales.reduce(function (a, s) {
    return a + (Number(s.total) || 0);
  }, 0);

  const count = todaySales.length;
  const avg = count ? total / count : 0;

  setText('todaySales', money(total));
  setText('todayOrders', String(count));
  setText('averageTicket', money(avg));
  setText('activeProductCount', String((window.APP_STATE.products || []).length));
};

window.completeSale = async function () {
  const state = window.APP_STATE;

  if (!state.activeUser) {
    toast('Debe iniciar sesión.');
    return;
  }

  if (!state.cart.length) {
    toast('No hay productos en el carrito.');
    return;
  }

  const subtotal = state.cart.reduce(function (a, r) {
    return a + (Number(r.price) || 0) * (Number(r.qty) || 0);
  }, 0);

  const total = subtotal;

  const sale = {
    invoice: invoiceId(state.nextInvoice),
    date: new Date().toLocaleDateString('es-CO'),
    orderType: state.orderType,
    method: state.method || 'Efectivo',
    customer: $('customerName') ? $('customerName').value : 'Consumidor final',
    cashier: state.activeUser.user,
    items: state.cart.reduce(function (a, r) {
      return a + (Number(r.qty) || 0);
    }, 0),
    total: total
  };

  state.sales.unshift(sale);
  state.nextInvoice += 1;
  state.cart = [];

  await window.idb.set('sales', state.sales);
  await window.idb.set('nextInvoice', state.nextInvoice);

  if ($('invoiceNumber')) $('invoiceNumber').value = String(state.nextInvoice).padStart(3, '0');
  if ($('customerName')) $('customerName').value = '';
  if ($('customerDoc')) $('customerDoc').value = '';
  if ($('customerPhone')) $('customerPhone').value = '';
  if ($('customerEmail')) $('customerEmail').value = '';
  if ($('quickReceived')) $('quickReceived').value = '';

  renderCart();
  renderSales();
  updateDashboard();
  toast('Venta registrada correctamente');
};

window.saveBilling = async function () {
  const data = {
    nit: $('factNit') ? $('factNit').value.trim() : '',
    razonSocial: $('factRazonSocial') ? $('factRazonSocial').value.trim() : '',
    resolucion: $('factResolucion') ? $('factResolucion').value.trim() : '',
    rangoInicial: $('factRangoInicial') ? $('factRangoInicial').value.trim() : '',
    rangoFinal: $('factRangoFinal') ? $('factRangoFinal').value.trim() : '',
    actual: $('factActual') ? $('factActual').value.trim() : ''
  };
  await window.idb.set('billing', data);
  toast('Datos de facturación guardados.');
};

window.loadBilling = async function () {
  const data = await window.idb.get('billing', {});
  if ($('factNit')) $('factNit').value = data.nit || '';
  if ($('factRazonSocial')) $('factRazonSocial').value = data.razonSocial || '';
  if ($('factResolucion')) $('factResolucion').value = data.resolucion || '';
  if ($('factRangoInicial')) $('factRangoInicial').value = data.rangoInicial || '';
  if ($('factRangoFinal')) $('factRangoFinal').value = data.rangoFinal || '';
  if ($('factActual')) $('factActual').value = data.actual || '';
};

window.goPage = function (page) {
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
  });

  document.querySelectorAll('.nav button').forEach(function (b) {
    b.classList.remove('active');
  });

  const pageEl = document.getElementById(page);
  if (pageEl) pageEl.classList.add('active');

  const navBtn = document.querySelector('.nav button[data-page="' + page + '"]');
  if (navBtn) navBtn.classList.add('active');

  const title = {
    inicio: 'Inicio',
    vender: 'Vender',
    ventas: 'Ventas',
    cajeros: 'Cajeros',
    facturacion: 'Facturación'
  };

  setText('pageTitle', title[page] || 'AKI POLLO POS');

  if (page === 'cajeros') {
    renderCashiers();
  }

  if (page === 'facturacion') {
    loadBilling();
  }
};

window.bindEvents = function () {
  const productSearch = $('productSearch');
  const salesSearch = $('salesSearch');
  const quickReceived = $('quickReceived');

  if (productSearch) productSearch.addEventListener('input', renderProducts);
  if (salesSearch) salesSearch.addEventListener('input', renderSales);
  if (quickReceived) quickReceived.addEventListener('input', updateQuickChange);

  document.querySelectorAll('.nav button').forEach(function (b) {
    b.addEventListener('click', function () {
      goPage(b.dataset.page);
    });
  });

  document.querySelectorAll('.types button').forEach(function (b) {
    b.onclick = function () {
      window.APP_STATE.orderType = b.textContent;
      document.querySelectorAll('.types button').forEach(function (x) {
        x.classList.toggle('active', x === b);
      });
    };
  });
};

window.closePayment = function () {
  const modal = $('paymentModal');
  if (modal) modal.classList.remove('open');
};

window.initApp = async function () {
  await window.idb.init();
  await loadInitialData();
  await ensureCashiers();
  await loadBilling();

  bindEvents();
  renderChips();
  renderProducts();
  renderCart();
  renderSales();
  updateDashboard();
  renderCashiers();

  const todayEl = $('today');
  if (todayEl) {
    todayEl.textContent = new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }
};

document.addEventListener('DOMContentLoaded', function () {
  initApp();
});
