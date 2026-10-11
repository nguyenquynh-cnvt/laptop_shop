'use strict';
// Trang chủ: giới thiệu, danh mục (kèm số sản phẩm), sản phẩm mới
boot(() => {
  const { categories, products } = Store.db;
  const newest = [...products].sort((a, b) => b.id - a.id).slice(0, 8);

  const catBoxes = categories.map((c) => {
    const total = products.filter((p) => p.category_id === c.id).length;
    return `
      <a class="cat-box" href="products.html?cat=${c.id}">
        <strong>${esc(c.name)}</strong>
        <span>${esc(c.description)}</span>
        <em>${total} sản phẩm</em>
      </a>`;
  }).join('');

  appEl().innerHTML = `
    <section class="hero">
      <h1>Linh kiện laptop chính hãng – Giá tốt mỗi ngày</h1>
      <p>RAM, SSD, pin, sạc, bàn phím, màn hình cho mọi dòng laptop. Bảo hành rõ ràng, giao hàng toàn quốc.</p>
      <a class="btn btn-primary" href="products.html">Mua ngay</a>
    </section>

    <h2 class="section-title">Danh mục sản phẩm</h2>
    <div class="grid grid-3">${catBoxes}</div>

    <h2 class="section-title">Sản phẩm mới</h2>
    <div class="grid grid-4">${newest.map(productCard).join('')}</div>`;
});
