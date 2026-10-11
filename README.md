# Website bán linh kiện laptop – bản tĩnh (HTML + CSS + JavaScript)

Phiên bản chạy được trên **GitHub Pages (github.io)** của ví dụ "Bán linh kiện laptop".
Không cần PHP hay MySQL: dữ liệu gốc nằm trong `data/data.json`, phần còn lại
(giỏ hàng, tài khoản, đơn hàng, chỉnh sửa của quản trị) lưu trong **localStorage** của trình duyệt.

## 1. Chạy thử trên máy
Trang dùng `fetch()` để đọc JSON nên **không mở bằng cách nhấp đúp file** (địa chỉ `file://` sẽ báo lỗi).
Hãy chạy một máy chủ web đơn giản trong thư mục này:

```
python -m http.server 8000
```
rồi mở http://localhost:8000/ (hoặc dùng XAMPP: chép thư mục vào `htdocs`, mở http://localhost/<tên-thư-mục>/;
hoặc tiện ích Live Server của VS Code).

Với Eclipse: `File > Import > General > Existing Projects into Workspace` (hoặc New > Static Web Project),
sửa mã trong Eclipse, còn việc chạy thử dùng một trong các cách trên.

## 2. Đưa lên github.io
1. Tạo repo mới trên GitHub (ví dụ `laptop-shop`), Public.
2. Đẩy **toàn bộ nội dung thư mục này** lên nhánh `main` (file `index.html` phải nằm ở thư mục gốc của repo):
   ```
   git init
   git add .
   git commit -m "Website ban linh kien laptop (ban tinh)"
   git branch -M main
   git remote add origin https://github.com/<ten-tai-khoan>/laptop-shop.git
   git push -u origin main
   ```
3. Vào **Settings > Pages**, ở **Build and deployment** chọn **Deploy from a branch**,
   Branch = `main`, thư mục = `/ (root)`, bấm **Save**.
4. Chờ 1–2 phút, truy cập `https://<ten-tai-khoan>.github.io/laptop-shop/`.

Tất cả đường dẫn trong mã là **đường dẫn tương đối** nên chạy đúng ở địa chỉ có thư mục con như trên.
File `.nojekyll` báo cho GitHub Pages không xử lý bằng Jekyll (giữ nguyên mọi file).

## 3. Tài khoản demo
| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị | admin@laptopshop.vn | admin123 |
| Khách hàng | khach@example.com | 123456 |

Có thể tự đăng ký tài khoản mới. Trong trang quản trị có nút **Khôi phục dữ liệu mẫu ban đầu**.

## 4. Cấu trúc thư mục
```
├── index.html, products.html, product.html, cart.html,
│   checkout.html, orders.html, login.html, register.html   Các trang khách hàng
├── admin.html                    Trang quản trị (một trang, chuyển màn hình bằng #hash)
├── css/style.css
├── data/data.json                Dữ liệu gốc: danh mục, sản phẩm, người dùng, đơn hàng mẫu
├── images/                       Ảnh sản phẩm (SVG minh họa)
└── js/
    ├── common.js                 Tiện ích, Store (CSDL giả lập), Layout, boot()
    ├── home.js, products.js, product.js, cart.js,
    │   checkout.js, orders.js, login.js, register.js     Mã riêng của từng trang
    └── admin.js                  Quản trị: tổng quan, danh mục, sản phẩm, đơn hàng
```

## 5. Đối chiếu với bản PHP/MySQL
| Bản PHP/MySQL | Bản tĩnh |
|---|---|
| Bảng MySQL (`users`, `products`...) | Mảng trong `data.json`, lưu ở localStorage |
| PDO + SQL (SELECT/INSERT/UPDATE) | Hàm của `Store` (`filter`, `push`, gán thuộc tính) |
| `$_SESSION` (đăng nhập, giỏ hàng) | localStorage (`lp_session_v1`, `lp_cart_v1`) |
| `password_hash` | SHA-256 bằng `crypto.subtle` |
| `htmlspecialchars` (hàm `e()`) | Hàm `esc()` khi chèn vào `innerHTML` |
| Transaction khi đặt hàng | Kiểm tra tồn kho hết rồi mới trừ kho |
| `header.php`, `footer.php` | `Layout.render()` |
| Upload ảnh vào `uploads/` | Thu nhỏ ảnh bằng canvas, lưu dạng chuỗi data URL |

## 6. Giới hạn cần biết
- **Dữ liệu chỉ nằm trong trình duyệt của từng người.** Đơn hàng khách đặt trên máy A không hiện ở trang quản trị mở trên máy B.
  Xóa dữ liệu duyệt web (hoặc dùng cửa sổ ẩn danh) thì dữ liệu quay về bản mẫu.
- **Không bảo mật thật sự.** Mọi mã JavaScript đều xem được, nên đăng nhập và phân quyền admin chỉ để minh họa.
  Ứng dụng thật phải xử lý ở máy chủ (PHP, Node.js...) với cơ sở dữ liệu.
- localStorage có dung lượng khoảng 5 MB; ảnh tải lên trong trang quản trị được thu nhỏ để tiết kiệm chỗ.

## 7. Gợi ý bài tập mở rộng
Mã giảm giá, đánh giá sản phẩm, đổi mật khẩu, xuất đơn hàng ra CSV, lọc theo khoảng giá,
hoặc thay `Store` bằng lời gọi API (Firebase, Supabase) để dữ liệu dùng chung giữa nhiều người.
