'use strict';
// Giỏ hàng: xem, cập nhật số lượng, xóa
boot(() => {
  function draw() {
    const { rows, total } = Store.cartDetail();
    Layout.updateCartBadge();

    if (!rows.length) {
      appEl().innerHTML = `
        <h2 class="section-title">Giỏ hàng của bạn</h2>
        <p class="empty">Giỏ hàng đang trống. <a href="products.html">Tiếp tục mua sắm</a></p>`;
      return;
    }

    const body = rows.map((r) => `
      <tr>
        <td class="prod-cell">
          <img src="${esc(productImage(r.product))}" alt="">
          <a href="product.html?id=${r.product.id}">${esc(r.product.name)}</a>
        </td>
        <td>${money(r.product.price)}</td>
        <td><input type="number" data-qty="${r.product.id}" value="${r.qty}" min="0" max="${r.product.stock}"></td>
        <td>${money(r.subtotal)}</td>
        <td><button class="btn btn-sm btn-danger" type="button" data-remove="${r.product.id}">Xóa</button></td>
      </tr>`).join('');

    appEl().innerHTML = `
      <h2 class="section-title">Giỏ hàng của bạn</h2>
      <table class="table">
        <thead><tr><th>Sản phẩm</th><th>Đơn giá</th><th width="110">Số lượng</th><th>Thành tiền</th><th></th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr>
          <td colspan="3" class="right"><strong>Tổng cộng:</strong></td>
          <td colspan="2"><strong class="price">${money(total)}</strong></td>
        </tr></tfoot>
      </table>
      <div class="actions">
        <a class="btn" href="products.html">← Tiếp tục mua</a>
        <button class="btn" type="button" id="btn-update">Cập nhật giỏ</button>
        <button class="btn btn-danger" type="button" id="btn-clear">Xóa hết</button>
        <a class="btn btn-primary" href="checkout.html">Thanh toán →</a>
      </div>`;
  }

  appEl().addEventListener('click', (ev) => {
    const rm = ev.target.closest('[data-remove]');
    if (rm) {
      Store.setCartQty(rm.dataset.remove, 0);
      toast('Đã xóa sản phẩm khỏi giỏ.');
      draw();
    } else if (ev.target.closest('#btn-update')) {
      $$('[data-qty]').forEach((inp) => Store.setCartQty(inp.dataset.qty, parseInt(inp.value, 10) || 0));
      toast('Đã cập nhật giỏ hàng.');
      draw();
    } else if (ev.target.closest('#btn-clear')) {
      Store.clearCart();
      draw();
    }
  });

  draw();
});
