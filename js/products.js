'use strict';
// Danh sách sản phẩm: tìm kiếm, lọc theo danh mục, sắp xếp, phân trang (đọc tham số từ URL)
boot(() => {
  const params = new URLSearchParams(location.search);
  const q = (params.get('q') || '').trim();
  const cat = Number(params.get('cat') || 0);
  const sort = params.get('sort') || 'new';
  let page = Math.max(1, Number(params.get('page') || 1));
  const LIMIT = 8;

  // 1. Lọc
  const kw = q.toLowerCase();
  let list = Store.db.products.filter((p) => {
    if (cat && p.category_id !== cat) return false;
    if (kw && !(p.name.toLowerCase().includes(kw) || (p.brand || '').toLowerCase().includes(kw))) return false;
    return true;
  });

  // 2. Sắp xếp
  const sorters = {
    new: (a, b) => b.id - a.id,
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    name: (a, b) => a.name.localeCompare(b.name, 'vi'),
  };
  list.sort(sorters[sort] || sorters.new);

  // 3. Phân trang
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  page = Math.min(page, pages);
  const items = list.slice((page - 1) * LIMIT, page * LIMIT);

  const pageLink = (n) => {
    const p = new URLSearchParams(location.search);
    p.set('page', n);
    return 'products.html?' + p.toString();
  };

  const catOptions = Store.db.categories
    .map((c) => `<option value="${c.id}" ${cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const sortOptions = [
    ['new', 'Mới nhất'], ['price_asc', 'Giá tăng dần'], ['price_desc', 'Giá giảm dần'], ['name', 'Tên A-Z'],
  ].map(([v, t]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${t}</option>`).join('');

  let pagination = '';
  if (pages > 1) {
    let links = '';
    for (let i = 1; i <= pages; i++) {
      links += `<a class="${i === page ? 'active' : ''}" href="${esc(pageLink(i))}">${i}</a>`;
    }
    pagination = `<div class="pagination">${links}</div>`;
  }

  document.title = (q ? 'Tìm: ' + q : 'Sản phẩm') + ' | LaptopParts';
  appEl().innerHTML = `
    <h2 class="section-title">
      ${q ? 'Kết quả tìm kiếm: "' + esc(q) + '"' : 'Danh sách sản phẩm'}
      <small>(${total} sản phẩm)</small>
    </h2>
    <form class="filter-bar" method="get" action="products.html">
      <input type="hidden" name="q" value="${esc(q)}">
      <select name="cat" onchange="this.form.submit()">
        <option value="0">Tất cả danh mục</option>${catOptions}
      </select>
      <select name="sort" onchange="this.form.submit()">${sortOptions}</select>
    </form>
    ${items.length
      ? `<div class="grid grid-4">${items.map(productCard).join('')}</div>`
      : '<p class="empty">Không tìm thấy sản phẩm phù hợp.</p>'}
    ${pagination}`;
});
