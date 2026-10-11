'use strict';
// Chi tiết sản phẩm (product.html?id=...)
boot(() => {
  const id = Number(new URLSearchParams(location.search).get('id'));
  const p = Store.product(id);
  if (!p) {
    appEl().innerHTML = '<p class="empty">Sản phẩm không tồn tại. <a href="products.html">Xem danh sách</a></p>';
    return;
  }
  document.title = p.name + ' | LaptopParts';

  const related = Store.db.products
    .filter((x) => x.category_id === p.category_id && x.id !== p.id)
    .slice(0, 4);

  const buyForm = p.stock > 0 ? `
    <form id="buy-form" class="inline-form">
      <label>Số lượng
        <input type="number" id="qty" value="1" min="1" max="${p.stock}">
      </label>
      <button class="btn btn-primary" type="submit">Thêm vào giỏ hàng</button>
    </form>` : '';

  appEl().innerHTML = `
    <p class="breadcrumb">
      <a href="index.html">Trang chủ</a> /
      <a href="products.html?cat=${p.category_id}">${esc(Store.categoryName(p.category_id))}</a> /
      ${esc(p.name)}
    </p>
    <div class="detail">
      <div class="detail-img"><img src="${esc(productImage(p))}" alt="${esc(p.name)}"></div>
      <div class="detail-info">
        <h1>${esc(p.name)}</h1>
        <p>Thương hiệu: <strong>${esc(p.brand)}</strong></p>
        <p class="price big">${money(p.price)}</p>
        <p>Tình trạng: ${p.stock > 0
          ? `<span class="ok">Còn ${p.stock} sản phẩm</span>` : '<span class="out">Hết hàng</span>'}</p>
        <p>${esc(p.description).replace(/\n/g, '<br>')}</p>
        ${buyForm}
      </div>
    </div>
    ${related.length ? `<h2 class="section-title">Sản phẩm cùng danh mục</h2>
      <div class="grid grid-4">${related.map(productCard).join('')}</div>` : ''}`;

  const form = document.getElementById('buy-form');
  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const qty = Math.max(1, parseInt(document.getElementById('qty').value, 10) || 1);
      try {
        Store.addToCart(p.id, qty);
        Layout.updateCartBadge();
        toast('Đã thêm ' + qty + ' sản phẩm vào giỏ hàng.');
      } catch (e) { toast(e.message, 'warning'); }
    });
  }
});
