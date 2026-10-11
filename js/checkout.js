'use strict';
// Thanh toán: cần đăng nhập, kiểm tra form, tạo đơn hàng
boot(() => {
  if (!requireLogin()) return;
  const user = Store.currentUser();
  const { rows, total } = Store.cartDetail();

  if (!rows.length) {
    flash('warning', 'Giỏ hàng đang trống.');
    location.href = 'cart.html';
    return;
  }

  const summary = rows.map((r) => `
    <li>${esc(r.product.name)} × ${r.qty} <span>${money(r.subtotal)}</span></li>`).join('');

  appEl().innerHTML = `
    <h2 class="section-title">Thông tin đặt hàng</h2>
    <div id="errors"></div>
    <div class="checkout">
      <form id="checkout-form" class="form-box" novalidate>
        <label>Họ tên người nhận
          <input type="text" name="receiver_name" value="${esc(user.full_name)}" required></label>
        <label>Số điện thoại
          <input type="text" name="phone" value="${esc(user.phone)}" required></label>
        <label>Địa chỉ giao hàng
          <input type="text" name="address" value="${esc(user.address)}" required></label>
        <label>Ghi chú
          <textarea name="note" rows="3"></textarea></label>
        <p class="muted">Hình thức thanh toán: thanh toán khi nhận hàng (COD).</p>
        <button class="btn btn-primary" type="submit">Xác nhận đặt hàng</button>
      </form>
      <div class="summary">
        <h3>Đơn hàng của bạn</h3>
        <ul>${summary}</ul>
        <p class="total">Tổng: <strong>${money(total)}</strong></p>
      </div>
    </div>`;

  document.getElementById('checkout-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const info = {
      receiver_name: f.receiver_name.value.trim(),
      phone: f.phone.value.trim(),
      address: f.address.value.trim(),
      note: f.note.value.trim(),
    };
    const errors = [];
    if (!info.receiver_name) errors.push('Vui lòng nhập tên người nhận.');
    if (!/^0\d{9,10}$/.test(info.phone)) errors.push('Số điện thoại không hợp lệ.');
    if (!info.address) errors.push('Vui lòng nhập địa chỉ giao hàng.');
    if (errors.length) { showAlert('errors', 'danger', errors); return; }

    try {
      const order = Store.placeOrder(info);
      flash('success', 'Đặt hàng thành công! Mã đơn hàng của bạn: #' + order.id);
      location.href = 'orders.html';
    } catch (e) {
      showAlert('errors', 'danger', e.message);
    }
  });
});
