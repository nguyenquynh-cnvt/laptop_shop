'use strict';
/**
 * Trang quản trị (một trang, chuyển màn hình bằng #hash):
 *   #/dashboard  #/categories  #/categories/edit/ID
 *   #/products   #/product/new  #/product/ID
 *   #/orders     #/orders/TRẠNG_THÁI    #/order/ID
 */
const MENU = [
  ['dashboard', 'Tổng quan'],
  ['categories', 'Danh mục'],
  ['products', 'Sản phẩm'],
  ['orders', 'Đơn hàng'],
];

boot(() => {
  if (!Store.isAdmin()) {
    flash('danger', 'Bạn không có quyền truy cập khu vực quản trị.');
    // Đã đăng nhập (khách thường) -> về trang chủ; chưa đăng nhập -> sang trang đăng nhập
    location.href = Store.currentUser() ? 'index.html' : 'login.html?next=admin.html';
    return;
  }

  let pendingImage; // undefined = giữ ảnh cũ; null = xóa; chuỗi = ảnh mới (data URL)

  /* ---------- Điều hướng ---------- */
  function route() {
    const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
    const section = parts[0];
    drawMenu(section === 'product' ? 'products' : section === 'order' ? 'orders' : section);

    if (section === 'categories') viewCategories(parts[1] === 'edit' ? Number(parts[2]) : 0);
    else if (section === 'products') viewProducts();
    else if (section === 'product') viewProductForm(parts[1] === 'new' ? 0 : Number(parts[1]));
    else if (section === 'orders') viewOrders(parts[1] || '');
    else if (section === 'order') viewOrderDetail(Number(parts[1]));
    else viewDashboard();
    window.scrollTo(0, 0);
  }

  function drawMenu(active) {
    document.getElementById('admin-menu').innerHTML = MENU.map(([key, label]) =>
      `<a class="${key === active ? 'active' : ''}" href="#/${key}">${label}</a>`).join('');
  }

  const go = (hash) => { location.hash = hash; };

  /* ---------- Tổng quan ---------- */
  function viewDashboard() {
    const { products, categories, users, orders } = Store.db;
    const revenue = orders.filter((o) => o.status === 'done').reduce((s, o) => s + o.total, 0);
    const stats = [
      [products.length, 'Sản phẩm'],
      [categories.length, 'Danh mục'],
      [users.filter((u) => u.role === 'customer').length, 'Khách hàng'],
      [orders.filter((o) => o.status === 'pending').length, 'Đơn chờ xử lý'],
      [money(revenue), 'Doanh thu (đơn hoàn thành)'],
    ];
    const latest = [...orders].sort((a, b) => b.id - a.id).slice(0, 5);
    const low = products.filter((p) => p.stock <= 10).sort((a, b) => a.stock - b.stock).slice(0, 5);

    appEl().innerHTML = `
      <h2 class="section-title">Tổng quan</h2>
      <div class="stats">${stats.map(([v, l]) => `<div class="stat"><b>${esc(v)}</b>${esc(l)}</div>`).join('')}</div>

      <h3>Đơn hàng mới nhất</h3>
      <table class="table">
        <tr><th>Mã</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày đặt</th></tr>
        ${latest.map((o) => `<tr>
          <td><a href="#/order/${o.id}">#${o.id}</a></td>
          <td>${esc((Store.user(o.user_id) || {}).full_name || '')}</td>
          <td>${money(o.total)}</td><td>${statusBadge(o.status)}</td><td>${esc(fmtDate(o.created_at))}</td>
        </tr>`).join('') || '<tr><td colspan="5">Chưa có đơn hàng.</td></tr>'}
      </table>

      <h3>Sản phẩm sắp hết hàng (tồn ≤ 10)</h3>
      <table class="table">
        <tr><th>Sản phẩm</th><th>Tồn kho</th></tr>
        ${low.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.stock}</td></tr>`).join('')
          || '<tr><td colspan="2">Không có sản phẩm nào sắp hết.</td></tr>'}
      </table>

      <p style="margin-top:24px">
        <button class="btn btn-danger btn-sm" id="btn-reset">Khôi phục dữ liệu mẫu ban đầu</button>
        <span class="muted">Xóa mọi thay đổi (sản phẩm, đơn hàng, tài khoản đăng ký) lưu trong trình duyệt này.</span>
      </p>`;

    document.getElementById('btn-reset').onclick = async () => {
      if (!confirm('Khôi phục toàn bộ dữ liệu mẫu? Mọi thay đổi sẽ mất.')) return;
      await Store.reset();
      flash('success', 'Đã khôi phục dữ liệu mẫu. Hãy đăng nhập lại.');
      location.href = 'login.html?next=admin.html';
    };
  }

  /* ---------- Danh mục ---------- */
  function viewCategories(editId) {
    const edit = editId ? Store.category(editId) : null;
    const rows = Store.db.categories.map((c) => {
      const total = Store.db.products.filter((p) => p.category_id === c.id).length;
      return `<tr>
        <td>${c.id}</td><td>${esc(c.name)}</td><td>${esc(c.description)}</td><td>${total}</td>
        <td><a class="btn btn-sm" href="#/categories/edit/${c.id}">Sửa</a>
            <button class="btn btn-sm btn-danger" data-del-cat="${c.id}">Xóa</button></td>
      </tr>`;
    }).join('');

    appEl().innerHTML = `
      <h2 class="section-title">Quản lý danh mục</h2>
      <form id="cat-form" class="form-box" style="margin-bottom:18px">
        <label>Tên danh mục <input type="text" name="name" value="${esc(edit ? edit.name : '')}" required></label>
        <label>Mô tả <input type="text" name="description" value="${esc(edit ? edit.description : '')}"></label>
        <button class="btn btn-primary" type="submit">${edit ? 'Cập nhật' : 'Thêm danh mục'}</button>
        ${edit ? '<a class="btn" href="#/categories">Hủy</a>' : ''}
      </form>
      <table class="table">
        <tr><th>ID</th><th>Tên</th><th>Mô tả</th><th>Số SP</th><th width="150"></th></tr>${rows}
      </table>`;

    document.getElementById('cat-form').onsubmit = (ev) => {
      ev.preventDefault();
      const f = ev.target;
      try {
        Store.saveCategory({ id: edit ? edit.id : 0, name: f.name.value, description: f.description.value });
        toast(edit ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục.');
        edit ? go('#/categories') : viewCategories(0);
      } catch (e) { toast(e.message, 'danger'); }
    };
    appEl().onclick = (ev) => {
      const b = ev.target.closest('[data-del-cat]');
      if (!b || !confirm('Xóa danh mục này?')) return;
      try { Store.deleteCategory(b.dataset.delCat); toast('Đã xóa danh mục.'); viewCategories(0); }
      catch (e) { toast(e.message, 'danger'); }
    };
  }

  /* ---------- Sản phẩm ---------- */
  function viewProducts() {
    appEl().innerHTML = `
      <h2 class="section-title">Quản lý sản phẩm</h2>
      <div class="toolbar">
        <input type="text" id="p-search" placeholder="Tìm tên / hãng" style="width:240px;padding:9px;border:1px solid #c5cbd6;border-radius:6px">
        <a class="btn btn-primary" href="#/product/new">+ Thêm sản phẩm</a>
      </div>
      <table class="table">
        <thead><tr><th>ID</th><th>Ảnh</th><th>Tên sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Tồn</th><th width="150"></th></tr></thead>
        <tbody id="p-body"></tbody>
      </table>`;

    const body = document.getElementById('p-body');
    const draw = () => {
      const kw = document.getElementById('p-search').value.trim().toLowerCase();
      const list = Store.db.products
        .filter((p) => !kw || p.name.toLowerCase().includes(kw) || (p.brand || '').toLowerCase().includes(kw))
        .sort((a, b) => b.id - a.id);
      body.innerHTML = list.map((p) => `<tr>
        <td>${p.id}</td>
        <td><img class="thumb" src="${esc(productImage(p))}" alt=""></td>
        <td>${esc(p.name)}<br><small class="muted">${esc(p.brand)}</small></td>
        <td>${esc(Store.categoryName(p.category_id))}</td>
        <td>${money(p.price)}</td><td>${p.stock}</td>
        <td><a class="btn btn-sm" href="#/product/${p.id}">Sửa</a>
            <button class="btn btn-sm btn-danger" data-del-prod="${p.id}">Xóa</button></td>
      </tr>`).join('') || '<tr><td colspan="7">Không có sản phẩm.</td></tr>';
    };
    document.getElementById('p-search').oninput = draw;
    appEl().onclick = (ev) => {
      const b = ev.target.closest('[data-del-prod]');
      if (!b || !confirm('Xóa sản phẩm này?')) return;
      try { Store.deleteProduct(b.dataset.delProd); toast('Đã xóa sản phẩm.'); draw(); }
      catch (e) { toast(e.message, 'danger'); }
    };
    draw();
  }

  // Đọc file ảnh, thu nhỏ rồi chuyển thành chuỗi (data URL) để lưu vào localStorage
  function imageToDataURL(file, maxW = 480) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) { reject(new Error('Chỉ chấp nhận file ảnh.')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh.')); };
      img.src = url;
    });
  }

  function viewProductForm(id) {
    const p = id ? Store.product(id) : null;
    if (id && !p) { toast('Sản phẩm không tồn tại.', 'danger'); go('#/products'); return; }
    pendingImage = undefined;
    const cur = p || { category_id: 0, name: '', brand: '', price: 0, stock: 0, image: null, description: '' };

    appEl().innerHTML = `
      <h2 class="section-title">${p ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
      <div id="errors"></div>
      <form id="prod-form" class="form-box" novalidate>
        <label>Danh mục
          <select name="category_id" required>
            <option value="">-- Chọn danh mục --</option>
            ${Store.db.categories.map((c) => `<option value="${c.id}" ${cur.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select></label>
        <label>Tên sản phẩm <input type="text" name="name" value="${esc(cur.name)}" required></label>
        <label>Thương hiệu <input type="text" name="brand" value="${esc(cur.brand)}"></label>
        <label>Giá bán (₫) <input type="number" name="price" min="0" step="1000" value="${cur.price}" required></label>
        <label>Tồn kho <input type="number" name="stock" min="0" value="${cur.stock}" required></label>
        <label>Mô tả <textarea name="description" rows="4">${esc(cur.description)}</textarea></label>
        <label>Ảnh sản phẩm <input type="file" name="image" accept="image/*"></label>
        <img id="img-preview" class="img-preview" src="${esc(productImage(cur))}" alt="">
        <button class="btn btn-primary" type="submit">Lưu</button>
        <a class="btn" href="#/products">Quay lại</a>
      </form>`;

    const f = document.getElementById('prod-form');
    f.image.onchange = async () => {
      if (!f.image.files[0]) return;
      try {
        pendingImage = await imageToDataURL(f.image.files[0]);
        document.getElementById('img-preview').src = pendingImage;
      } catch (e) { showAlert('errors', 'danger', e.message); f.image.value = ''; }
    };
    f.onsubmit = (ev) => {
      ev.preventDefault();
      try {
        Store.saveProduct({
          id: p ? p.id : 0,
          category_id: f.category_id.value,
          name: f.name.value,
          brand: f.brand.value,
          price: Number(f.price.value),
          stock: Number(f.stock.value),
          description: f.description.value,
          image: pendingImage !== undefined ? pendingImage : cur.image,
        });
        flash('success', p ? 'Đã cập nhật sản phẩm.' : 'Đã thêm sản phẩm.');
        go('#/products');
        showFlash();
      } catch (e) { showAlert('errors', 'danger', e.message); }
    };
  }

  /* ---------- Đơn hàng ---------- */
  function viewOrders(filter) {
    const statuses = Object.keys(STATUS);
    const list = Store.db.orders
      .filter((o) => !filter || o.status === filter)
      .sort((a, b) => b.id - a.id);

    appEl().innerHTML = `
      <h2 class="section-title">Quản lý đơn hàng</h2>
      <div class="filter-bar" style="flex-wrap:wrap">
        <a class="btn ${!filter ? 'btn-primary' : ''}" href="#/orders">Tất cả</a>
        ${statuses.map((s) => `<a class="btn ${filter === s ? 'btn-primary' : ''}" href="#/orders/${s}">${esc(statusLabel(s))}</a>`).join('')}
      </div>
      <table class="table">
        <tr><th>Mã</th><th>Khách hàng</th><th>Người nhận</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày đặt</th><th></th></tr>
        ${list.map((o) => `<tr>
          <td>#${o.id}</td>
          <td>${esc((Store.user(o.user_id) || {}).full_name || '')}</td>
          <td>${esc(o.receiver_name)}<br><small class="muted">${esc(o.phone)}</small></td>
          <td>${money(o.total)}</td><td>${statusBadge(o.status)}</td><td>${esc(fmtDate(o.created_at))}</td>
          <td><a class="btn btn-sm" href="#/order/${o.id}">Chi tiết</a></td>
        </tr>`).join('') || '<tr><td colspan="7">Không có đơn hàng.</td></tr>'}
      </table>`;
  }

  function viewOrderDetail(id) {
    const o = Store.order(id);
    if (!o) { toast('Đơn hàng không tồn tại.', 'danger'); go('#/orders'); return; }
    const u = Store.user(o.user_id) || {};

    appEl().innerHTML = `
      <h2 class="section-title">Đơn hàng #${o.id}</h2>
      <div class="order-box">
        <p><strong>Khách hàng:</strong> ${esc(u.full_name)} (${esc(u.email)})</p>
        <p><strong>Người nhận:</strong> ${esc(o.receiver_name)} – ${esc(o.phone)}</p>
        <p><strong>Địa chỉ:</strong> ${esc(o.address)}</p>
        <p><strong>Ghi chú:</strong> ${esc(o.note || '—')}</p>
        <p><strong>Ngày đặt:</strong> ${esc(fmtDate(o.created_at))}</p>
      </div>
      <table class="table">
        <tr><th>Sản phẩm</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th></tr>
        ${o.items.map((it) => `<tr><td>${esc(it.product_name)}</td><td>${money(it.price)}</td>
          <td>${it.quantity}</td><td>${money(it.price * it.quantity)}</td></tr>`).join('')}
        <tr><td colspan="3" class="right"><strong>Tổng cộng</strong></td><td><strong class="price">${money(o.total)}</strong></td></tr>
      </table>
      <form id="status-form" class="inline-form" style="margin-top:16px">
        <label>Trạng thái
          <select name="status" style="padding:9px;border:1px solid #c5cbd6;border-radius:6px">
            ${Object.keys(STATUS).map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${esc(statusLabel(s))}</option>`).join('')}
          </select></label>
        <button class="btn btn-primary" type="submit">Cập nhật</button>
        <a class="btn" href="#/orders">Quay lại</a>
      </form>`;

    document.getElementById('status-form').onsubmit = (ev) => {
      ev.preventDefault();
      try {
        Store.setOrderStatus(o.id, ev.target.status.value);
        toast('Đã cập nhật trạng thái đơn hàng.');
        viewOrderDetail(o.id);
      } catch (e) { toast(e.message, 'danger'); }
    };
  }

  window.addEventListener('hashchange', route);
  route();
}, { layout: false });
