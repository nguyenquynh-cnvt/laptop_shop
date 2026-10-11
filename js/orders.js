'use strict';
// Đơn hàng của tôi (xem + hủy đơn)
boot(() => {
  if (!requireLogin()) return;
  const user = Store.currentUser();

  function draw() {
    const orders = Store.db.orders.filter((o) => o.user_id === user.id).sort((a, b) => b.id - a.id);
    const html = orders.map((o) => `
      <div class="order-box">
        <div class="order-head">
          <strong>Đơn #${o.id}</strong>
          <span>${esc(fmtDate(o.created_at))}</span>
          ${statusBadge(o.status)}
        </div>
        <ul>
          ${o.items.map((it) => `<li>${esc(it.product_name)} × ${it.quantity}
            <span>${money(it.price * it.quantity)}</span></li>`).join('')}
        </ul>
        <p>Giao tới: ${esc(o.receiver_name)} – ${esc(o.phone)} – ${esc(o.address)}</p>
        <p class="total">Tổng tiền: <strong>${money(o.total)}</strong></p>
        ${o.status === 'pending'
          ? `<button class="btn btn-sm btn-danger" data-cancel="${o.id}">Hủy đơn</button>` : ''}
      </div>`).join('');

    appEl().innerHTML = `
      <h2 class="section-title">Đơn hàng của tôi</h2>
      ${html || '<p class="empty">Bạn chưa có đơn hàng nào.</p>'}`;
  }

  appEl().addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-cancel]');
    if (!btn) return;
    if (!confirm('Bạn chắc chắn muốn hủy đơn này?')) return;
    try {
      Store.cancelOrder(btn.dataset.cancel, user.id);
      toast('Đã hủy đơn hàng #' + btn.dataset.cancel + '.');
    } catch (e) { toast(e.message, 'danger'); }
    draw();
  });

  draw();
});
