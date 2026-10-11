'use strict';
/**
 * common.js – dùng chung cho mọi trang.
 *  - Tiện ích: esc(), money(), fmtDate()...
 *  - Store : "cơ sở dữ liệu" giả lập. Dữ liệu gốc đọc từ data/data.json (fetch),
 *            sau đó lưu vào localStorage của trình duyệt (giỏ hàng, tài khoản, đơn hàng...).
 *  - Layout: vẽ header/footer cho các trang.
 *  - boot(): khởi động trang (tải dữ liệu -> vẽ layout -> chạy hàm của trang).
 */

const DATA_URL = 'data/data.json';
const KEY_DB = 'lp_db_v1';
const KEY_CART = 'lp_cart_v1';
const KEY_SESSION = 'lp_session_v1';
const KEY_FLASH = 'lp_flash_v1';

/* ====================== Lưu trữ an toàn (localStorage) ====================== */
const memStore = {}; // dự phòng khi trình duyệt chặn localStorage

const LS = {
  get(key, def) {
    try {
      const v = localStorage.getItem(key);
      if (v !== null) return JSON.parse(v);
    } catch (e) { /* bỏ qua */ }
    return key in memStore ? memStore[key] : def;
  },
  set(key, value) {
    memStore[key] = value;
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
  remove(key) {
    delete memStore[key];
    try { localStorage.removeItem(key); } catch (e) { /* bỏ qua */ }
  },
};

/* ====================== Tiện ích hiển thị ====================== */
// Chống XSS: luôn escape dữ liệu trước khi chèn vào innerHTML
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function money(n) {
  return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + ' ₫';
}

function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

const STATUS = {
  pending: 'Chờ xử lý',
  shipping: 'Đang giao',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
};
function statusLabel(s) { return STATUS[s] || s; }
function statusBadge(s) { return `<span class="status st-${esc(s)}">${esc(statusLabel(s))}</span>`; }

function productImage(p) { return (p && p.image) ? p.image : 'images/no-image.svg'; }

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function appEl() { return document.getElementById('app'); }

/* ====================== Thông báo ====================== */
// flash(): thông báo hiện ở trang KẾ TIẾP (sau khi chuyển trang)
function flash(type, msg) {
  try { sessionStorage.setItem(KEY_FLASH, JSON.stringify({ type, msg })); } catch (e) { /* bỏ qua */ }
}
function consumeFlash() {
  try {
    const v = sessionStorage.getItem(KEY_FLASH);
    sessionStorage.removeItem(KEY_FLASH);
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
}

// toast(): thông báo nhỏ nổi lên ngay tại trang hiện tại
function toast(msg, type = 'success') {
  let box = document.getElementById('toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = 'toast alert-' + type;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// Hộp thông báo lỗi ngay trong trang (dùng cho form)
function showAlert(containerId, type, messages) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const list = Array.isArray(messages) ? messages : [messages];
  el.innerHTML = list.filter(Boolean).map((m) => `<div class="alert alert-${type}">${esc(m)}</div>`).join('');
}

/* ====================== Store: dữ liệu ====================== */
const Store = {
  db: null,

  async load() {
    if (this.db) return this.db;
    const saved = LS.get(KEY_DB, null);
    if (saved && Array.isArray(saved.products)) {
      this.db = saved;
      return this.db;
    }
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Không đọc được ' + DATA_URL + ' (HTTP ' + res.status + ')');
    this.db = await res.json();
    this.save();
    return this.db;
  },

  save() {
    if (!LS.set(KEY_DB, this.db)) {
      toast('Không lưu được vào trình duyệt (hết dung lượng hoặc bị chặn).', 'warning');
    }
  },

  // Xóa dữ liệu đã lưu và nạp lại từ data.json
  async reset() {
    [KEY_DB, KEY_CART, KEY_SESSION].forEach(LS.remove);
    this.db = null;
    await this.load();
  },

  nextId(list) { return list.reduce((m, x) => Math.max(m, x.id), 0) + 1; },

  /* ---------- Truy vấn ---------- */
  product(id) { return this.db.products.find((p) => p.id === Number(id)) || null; },
  category(id) { return this.db.categories.find((c) => c.id === Number(id)) || null; },
  categoryName(id) { const c = this.category(id); return c ? c.name : ''; },
  user(id) { return this.db.users.find((u) => u.id === Number(id)) || null; },
  order(id) { return this.db.orders.find((o) => o.id === Number(id)) || null; },

  /* ---------- Giỏ hàng: { productId: quantity } ---------- */
  getCart() { return LS.get(KEY_CART, {}); },
  cartCount() { return Object.values(this.getCart()).reduce((a, b) => a + b, 0); },

  addToCart(id, qty = 1) {
    const p = this.product(id);
    if (!p) throw new Error('Sản phẩm không tồn tại.');
    const cart = this.getCart();
    const have = cart[p.id] || 0;
    if (have + qty > p.stock) throw new Error('Số lượng vượt quá tồn kho (' + p.stock + ').');
    cart[p.id] = have + qty;
    LS.set(KEY_CART, cart);
  },

  setCartQty(id, qty) {
    const cart = this.getCart();
    const p = this.product(id);
    if (!p || qty <= 0) delete cart[id];
    else cart[id] = Math.min(qty, p.stock);
    LS.set(KEY_CART, cart);
  },

  clearCart() { LS.remove(KEY_CART); },

  cartDetail() {
    const cart = this.getCart();
    const rows = [];
    let total = 0;
    Object.keys(cart).forEach((id) => {
      const p = this.product(id);
      if (!p) return;
      const qty = cart[id];
      const subtotal = p.price * qty;
      total += subtotal;
      rows.push({ product: p, qty, subtotal });
    });
    return { rows, total };
  },

  /* ---------- Tài khoản ---------- */
  // Băm SHA-256 (chỉ để minh họa; thực tế phải làm ở phía máy chủ)
  async hash(text) {
    if (!(window.crypto && crypto.subtle)) {
      throw new Error('Cần mở trang qua http://localhost hoặc https để băm mật khẩu.');
    }
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  },

  currentUser() {
    const s = LS.get(KEY_SESSION, null);
    return s ? this.user(s.id) : null;
  },
  isAdmin() { const u = this.currentUser(); return !!u && u.role === 'admin'; },

  async register({ full_name, email, phone, address, password }) {
    email = email.trim().toLowerCase();
    if (this.db.users.some((u) => u.email === email)) throw new Error('Email này đã được đăng ký.');
    const user = {
      id: this.nextId(this.db.users),
      full_name: full_name.trim(),
      email,
      password: await this.hash(password),
      phone: phone.trim(),
      address: address.trim(),
      role: 'customer',
      created_at: new Date().toISOString(),
    };
    this.db.users.push(user);
    this.save();
    return user;
  },

  async login(email, password) {
    email = email.trim().toLowerCase();
    const u = this.db.users.find((x) => x.email === email);
    if (!u || u.password !== await this.hash(password)) throw new Error('Email hoặc mật khẩu không đúng.');
    LS.set(KEY_SESSION, { id: u.id });
    return u;
  },

  logout() { LS.remove(KEY_SESSION); },

  /* ---------- Đơn hàng ---------- */
  placeOrder(info) {
    const user = this.currentUser();
    if (!user) throw new Error('Vui lòng đăng nhập.');
    const { rows, total } = this.cartDetail();
    if (!rows.length) throw new Error('Giỏ hàng đang trống.');
    // Kiểm tra tồn kho TRƯỚC khi trừ (giống transaction: hoặc làm hết, hoặc không làm gì)
    rows.forEach((r) => {
      if (r.qty > r.product.stock) throw new Error('Sản phẩm "' + r.product.name + '" không đủ hàng.');
    });
    rows.forEach((r) => { r.product.stock -= r.qty; });
    const order = {
      id: this.nextId(this.db.orders),
      user_id: user.id,
      receiver_name: info.receiver_name,
      phone: info.phone,
      address: info.address,
      note: info.note || '',
      total,
      status: 'pending',
      created_at: new Date().toISOString(),
      items: rows.map((r) => ({
        product_id: r.product.id, product_name: r.product.name, price: r.product.price, quantity: r.qty,
      })),
    };
    this.db.orders.push(order);
    this.save();
    this.clearCart();
    return order;
  },

  restock(order, sign) {
    order.items.forEach((it) => {
      const p = this.product(it.product_id);
      if (p) p.stock = Math.max(0, p.stock + sign * it.quantity);
    });
  },

  // Khách hủy đơn (chỉ khi còn "Chờ xử lý")
  cancelOrder(id, userId) {
    const o = this.order(id);
    if (!o || o.user_id !== userId || o.status !== 'pending') throw new Error('Không thể hủy đơn hàng này.');
    o.status = 'cancelled';
    this.restock(o, +1);
    this.save();
  },

  // Admin đổi trạng thái; hủy -> hoàn kho, khôi phục từ "hủy" -> trừ kho lại
  setOrderStatus(id, status) {
    const o = this.order(id);
    if (!o) throw new Error('Đơn hàng không tồn tại.');
    if (!STATUS[status]) throw new Error('Trạng thái không hợp lệ.');
    const old = o.status;
    if (old === status) return;
    o.status = status;
    if (status === 'cancelled') this.restock(o, +1);
    else if (old === 'cancelled') this.restock(o, -1);
    this.save();
  },

  /* ---------- Quản trị: danh mục ---------- */
  saveCategory({ id, name, description }) {
    name = name.trim();
    if (!name) throw new Error('Tên danh mục không được để trống.');
    if (id) {
      const c = this.category(id);
      if (!c) throw new Error('Danh mục không tồn tại.');
      c.name = name; c.description = description.trim();
    } else {
      this.db.categories.push({ id: this.nextId(this.db.categories), name, description: description.trim() });
    }
    this.save();
  },

  deleteCategory(id) {
    if (this.db.products.some((p) => p.category_id === Number(id))) {
      throw new Error('Không thể xóa: danh mục đang có sản phẩm.');
    }
    this.db.categories = this.db.categories.filter((c) => c.id !== Number(id));
    this.save();
  },

  /* ---------- Quản trị: sản phẩm ---------- */
  saveProduct(data) {
    const errors = [];
    if (!data.name.trim()) errors.push('Tên sản phẩm không được để trống.');
    if (!this.category(data.category_id)) errors.push('Vui lòng chọn danh mục.');
    if (!(data.price >= 0)) errors.push('Giá không hợp lệ.');
    if (!(data.stock >= 0)) errors.push('Tồn kho không hợp lệ.');
    if (errors.length) throw new Error(errors.join(' '));
    const fields = {
      category_id: Number(data.category_id),
      name: data.name.trim(),
      brand: data.brand.trim(),
      price: Math.round(data.price),
      stock: Math.round(data.stock),
      image: data.image || null,
      description: data.description.trim(),
    };
    if (data.id) {
      const p = this.product(data.id);
      if (!p) throw new Error('Sản phẩm không tồn tại.');
      Object.assign(p, fields);
    } else {
      this.db.products.push({ id: this.nextId(this.db.products), ...fields });
    }
    this.save();
  },

  deleteProduct(id) {
    const used = this.db.orders.some((o) => o.items.some((it) => it.product_id === Number(id)));
    if (used) throw new Error('Không thể xóa: sản phẩm đã có trong đơn hàng. Hãy đặt tồn kho = 0.');
    this.db.products = this.db.products.filter((p) => p.id !== Number(id));
    this.save();
  },
};

/* ====================== Giao diện chung ====================== */
function productCard(p) {
  const link = 'product.html?id=' + p.id;
  const action = p.stock > 0
    ? `<button class="btn btn-primary btn-block" data-add="${p.id}">Thêm vào giỏ</button>`
    : '<button class="btn btn-block" disabled>Hết hàng</button>';
  return `
    <div class="card">
      <a href="${link}"><img src="${esc(productImage(p))}" alt="${esc(p.name)}"></a>
      <div class="card-body">
        <span class="brand">${esc(p.brand)}</span>
        <h3><a href="${link}">${esc(p.name)}</a></h3>
        <div class="price">${money(p.price)}</div>
        ${action}
      </div>
    </div>`;
}

const Layout = {
  render() {
    const user = Store.currentUser();
    const cats = Store.db.categories;
    const q = new URLSearchParams(location.search).get('q') || '';

    const header = document.getElementById('site-header');
    if (header) {
      header.innerHTML = `
        <div class="container header-top">
          <a class="logo" href="index.html">💻 Laptop<span>Parts</span></a>
          <form class="search-form" action="products.html" method="get">
            <input type="text" name="q" placeholder="Tìm RAM, SSD, pin, sạc..." value="${esc(q)}">
            <button type="submit">Tìm</button>
          </form>
          <nav class="user-nav">
            <a href="cart.html">🛒 Giỏ hàng <span class="badge" id="cart-badge">${Store.cartCount()}</span></a>
            ${user
              ? `<a href="orders.html">👤 ${esc(user.full_name)}</a>
                 ${user.role === 'admin' ? '<a href="admin.html">Quản trị</a>' : ''}
                 <a href="#" id="btn-logout">Đăng xuất</a>`
              : '<a href="login.html">Đăng nhập</a><a href="register.html">Đăng ký</a>'}
          </nav>
        </div>
        <div class="menu-bar">
          <div class="container">
            <a href="index.html">Trang chủ</a>
            <a href="products.html">Tất cả sản phẩm</a>
            ${cats.map((c) => `<a href="products.html?cat=${c.id}">${esc(c.name)}</a>`).join('')}
          </div>
        </div>`;
    }

    const footer = document.getElementById('site-footer');
    if (footer) {
      footer.innerHTML = `
        <div class="container">
          <p><strong>LaptopParts</strong> – Chuyên linh kiện laptop chính hãng: RAM, SSD, pin, sạc, bàn phím, màn hình.</p>
          <p>Ví dụ mẫu môn Ứng dụng mã nguồn mở – Trường Đại học Công nghiệp Việt Trì &copy; ${new Date().getFullYear()}</p>
        </div>`;
    }
  },

  updateCartBadge() {
    const b = document.getElementById('cart-badge');
    if (b) b.textContent = Store.cartCount();
  },
};

function showFlash() {
  const f = consumeFlash();
  const box = document.getElementById('flash');
  if (f && box) box.innerHTML = `<div class="alert alert-${esc(f.type)}">${esc(f.msg)}</div>`;
}

function logoutAndGoHome() {
  Store.logout();
  flash('success', 'Bạn đã đăng xuất.');
  location.href = 'index.html';
}

// Sự kiện dùng chung: "Thêm vào giỏ" và "Đăng xuất"
document.addEventListener('click', (ev) => {
  const addBtn = ev.target.closest('[data-add]');
  if (addBtn) {
    try {
      Store.addToCart(addBtn.dataset.add, 1);
      Layout.updateCartBadge();
      toast('Đã thêm sản phẩm vào giỏ hàng.');
    } catch (e) { toast(e.message, 'warning'); }
    return;
  }
  if (ev.target.closest('#btn-logout')) {
    ev.preventDefault();
    logoutAndGoHome();
  }
});

/**
 * Khởi động trang.
 * fn: hàm riêng của từng trang (async được). opts.layout=false cho trang quản trị.
 */
function boot(fn, opts = {}) {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await Store.load();
      if (opts.layout !== false) Layout.render();
      showFlash();
      await fn();
    } catch (err) {
      console.error(err);
      const el = appEl();
      if (el) {
        el.innerHTML = `<div class="alert alert-danger">Có lỗi khi tải trang: ${esc(err.message)}.<br>
          Nếu bạn mở file trực tiếp (file://), hãy chạy qua máy chủ web, ví dụ <code>python -m http.server</code> rồi vào http://localhost:8000.</div>`;
      }
    }
  });
}

// Chuyển hướng sang trang đăng nhập rồi quay lại trang hiện tại
function requireLogin() {
  if (Store.currentUser()) return true;
  flash('warning', 'Vui lòng đăng nhập để tiếp tục.');
  const here = location.pathname.split('/').pop() + location.search;
  location.href = 'login.html?next=' + encodeURIComponent(here);
  return false;
}
