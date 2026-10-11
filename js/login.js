'use strict';
// Đăng nhập
boot(() => {
  if (Store.currentUser()) { location.href = 'index.html'; return; }

  appEl().innerHTML = `
    <h2 class="section-title">Đăng nhập</h2>
    <div id="errors"></div>
    <form id="login-form" class="form-box narrow">
      <label>Email <input type="email" name="email" required></label>
      <label>Mật khẩu <input type="password" name="password" required></label>
      <button class="btn btn-primary" type="submit">Đăng nhập</button>
      <p>Chưa có tài khoản? <a href="register.html">Đăng ký</a></p>
      <p class="muted">Demo: admin@laptopshop.vn / admin123 &nbsp;|&nbsp; khach@example.com / 123456</p>
    </form>`;

  document.getElementById('login-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    try {
      const u = await Store.login(f.email.value, f.password.value);
      // Chỉ cho quay lại các trang .html cùng thư mục (tránh chuyển hướng ra ngoài)
      const next = new URLSearchParams(location.search).get('next') || '';
      const safe = /^[A-Za-z0-9_\-]+\.html(\?[^\s]*)?$/.test(next) ? next : '';
      location.href = safe || (u.role === 'admin' ? 'admin.html' : 'index.html');
    } catch (e) {
      showAlert('errors', 'danger', e.message);
    }
  });
});
