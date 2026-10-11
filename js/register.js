'use strict';
// Đăng ký tài khoản
boot(() => {
  if (Store.currentUser()) { location.href = 'index.html'; return; }

  appEl().innerHTML = `
    <h2 class="section-title">Đăng ký tài khoản</h2>
    <div id="errors"></div>
    <form id="register-form" class="form-box narrow" novalidate>
      <label>Họ tên <input type="text" name="full_name" required></label>
      <label>Email <input type="email" name="email" required></label>
      <label>Số điện thoại <input type="text" name="phone"></label>
      <label>Địa chỉ <input type="text" name="address"></label>
      <label>Mật khẩu <input type="password" name="password" required></label>
      <label>Nhập lại mật khẩu <input type="password" name="password2" required></label>
      <button class="btn btn-primary" type="submit">Đăng ký</button>
      <p>Đã có tài khoản? <a href="login.html">Đăng nhập</a></p>
    </form>`;

  document.getElementById('register-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const errors = [];
    if (!f.full_name.value.trim()) errors.push('Vui lòng nhập họ tên.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) errors.push('Email không hợp lệ.');
    if (f.password.value.length < 6) errors.push('Mật khẩu tối thiểu 6 ký tự.');
    if (f.password.value !== f.password2.value) errors.push('Mật khẩu nhập lại không khớp.');
    if (errors.length) { showAlert('errors', 'danger', errors); return; }

    try {
      await Store.register({
        full_name: f.full_name.value, email: f.email.value, phone: f.phone.value,
        address: f.address.value, password: f.password.value,
      });
      flash('success', 'Đăng ký thành công! Hãy đăng nhập.');
      location.href = 'login.html';
    } catch (e) {
      showAlert('errors', 'danger', e.message);
    }
  });
});
