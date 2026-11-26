// Nama kunci untuk menyimpan data pinjaman dan stok di browser.
const STORAGE_KEY = 'loanData';
const INVENTORY_KEY = 'inventoryData';

// Data inventaris awal yang dipakai jika browser belum memiliki data stok tersimpan.
const defaultInventory = [
  { id: 1, name: 'Laptop', category: 'Elektronik', stock: 8 },
  { id: 2, name: 'Proyektor', category: 'Elektronik', stock: 4 },
  { id: 3, name: 'Speaker', category: 'Audio', stock: 6 },
  { id: 4, name: 'Kamera', category: 'Elektronik', stock: 3 },
  { id: 5, name: 'Meja', category: 'Furniture', stock: 12 },
  { id: 6, name: 'Kursi', category: 'Furniture', stock: 20 }
];

// Mengambil elemen HTML yang akan digunakan untuk menampilkan dan mengubah data.
const tabButtons = document.querySelectorAll('.nav-item');
const tabPanels = document.querySelectorAll('.tab-panel');
const quickAddBtn = document.getElementById('quickAddBtn');
const form = document.getElementById('loanForm');
const tbody = document.getElementById('loanTableBody');
const inventoryBody = document.getElementById('inventoryList');
const reportBody = document.getElementById('reportTableBody');
const totalBorrowCount = document.getElementById('totalBorrowCount');
const totalItemCount = document.getElementById('totalItemCount');
const returnedCount = document.getElementById('returnedCount');
const inventoryStockCount = document.getElementById('inventoryStockCount');
const recordBadge = document.getElementById('recordBadge');

// Memuat data dari localStorage agar tetap ada setelah halaman dimuat ulang.
let loans = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY) || 'null');

// Jika belum ada stok tersimpan, gunakan inventaris awal lalu simpan ke browser.
if (!inventory) {
  inventory = defaultInventory;
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
}

function saveLoans() {
  // Mengubah daftar pinjaman menjadi teks JSON sebelum disimpan.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
}

function saveInventory() {
  // Menyimpan perubahan jumlah stok ke browser.
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
}

function formatDate(dateString) {
  // Mengubah tanggal menjadi format yang mudah dibaca dalam bahasa Indonesia.
  if (!dateString) return '-';
  const date = new Date(dateString + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function updateSummary() {
  // Menghitung ulang angka ringkasan dan jumlah stok untuk ditampilkan.
  const total = loans.length;
  const totalItems = loans.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const done = loans.filter((item) => item.status === 'Dikembalikan').length;
  const stockTotal = inventory.reduce((sum, item) => sum + Number(item.stock || 0), 0);

  totalBorrowCount.textContent = total;
  totalItemCount.textContent = totalItems;
  returnedCount.textContent = done;
  inventoryStockCount.textContent = stockTotal;
  recordBadge.textContent = `${total} data`;
}

function renderInventory() {
  // Membuat ulang daftar barang berdasarkan data inventaris saat ini.
  inventoryBody.innerHTML = '';

  inventory.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'inventory-item';
    row.innerHTML = `
      <div>
        <p class="inventory-name">${item.name}</p>
        <span>${item.category}</span>
      </div>
      <div class="inventory-stock">
        <strong>${item.stock}</strong>
        <small>unit</small>
      </div>
    `;
    inventoryBody.appendChild(row);
  });
}

function renderLoanTable() {
  // Membuat ulang tabel transaksi; tampilkan pesan jika belum ada pinjaman.
  tbody.innerHTML = '';

  if (!loans.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">Belum ada data peminjaman.</td>
      </tr>
    `;
    updateSummary();
    return;
  }

  loans.forEach((loan) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${loan.borrower}</td>
      <td>${loan.item}</td>
      <td>${loan.quantity}</td>
      <td>${formatDate(loan.borrowDate)} - ${formatDate(loan.returnDate)}</td>
      <td><span class="status ${loan.status === 'Dikembalikan' ? 'done' : 'active'}">${loan.status}</span></td>
      <td><button class="delete-btn" data-id="${loan.id}" type="button">Hapus</button></td>
    `;
    tbody.appendChild(row);
  });

  updateSummary();
}

function renderReport() {
  // Menampilkan data pinjaman dalam format tabel laporan.
  reportBody.innerHTML = '';

  const rowMap = loans.map((loan) => ({
    name: loan.borrower,
    item: loan.item,
    qty: loan.quantity,
    status: loan.status,
    date: `${formatDate(loan.borrowDate)} - ${formatDate(loan.returnDate)}`
  }));

  if (!rowMap.length) {
    reportBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">Belum ada laporan.</td>
      </tr>
    `;
    return;
  }

  rowMap.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.item}</td>
      <td>${row.qty}</td>
      <td>${row.status}</td>
      <td>${row.date}</td>
    `;
    reportBody.appendChild(tr);
  });
}

function renderAll() {
  // Memperbarui semua bagian tampilan setelah data berubah.
  renderInventory();
  renderLoanTable();
  renderReport();
  updateSummary();
}

function switchTab(targetTab) {
  // Menampilkan panel yang dipilih dan menandai tombol menu yang aktif.
  tabButtons.forEach((button) => {
    const active = button.dataset.tab === targetTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });

  tabPanels.forEach((panel) => {
    const active = panel.dataset.panel === targetTab;
    panel.classList.toggle('active', active);
  });
}

function addLoan(event) {
  // Memproses formulir, memeriksa stok, lalu menyimpan transaksi baru.
  event.preventDefault();

  const formData = new FormData(form);
  const borrower = formData.get('borrower').toString().trim();
  const item = formData.get('item').toString().trim();
  const quantity = Number(formData.get('quantity')) || 1;
  const status = formData.get('status').toString();
  const borrowDate = formData.get('borrowDate').toString();
  const returnDate = formData.get('returnDate').toString();

  if (!borrower || !item || !borrowDate || !returnDate) {
    alert('Semua field wajib diisi!');
    return;
  }

  const inventoryItem = inventory.find((entry) => entry.name.toLowerCase() === item.toLowerCase());

  if (status === 'Dipinjam') {
    // Pinjaman aktif hanya bisa dicatat jika barang ada dan stok mencukupi.
    if (!inventoryItem) {
      alert('Barang tidak ada di daftar inventaris.');
      return;
    }

    if (inventoryItem.stock < quantity) {
      alert('Stok barang tidak cukup untuk dipinjam.');
      return;
    }

    inventoryItem.stock -= quantity;
  } else if (inventoryItem) {
    inventoryItem.stock += quantity;
  }

  loans.unshift({
    id: Date.now(),
    borrower,
    item,
    quantity,
    status,
    borrowDate,
    returnDate
  });

  saveLoans();
  saveInventory();
  form.reset();
  renderAll();
  switchTab('peminjaman');
}

function deleteLoan(id) {
  // Menghapus transaksi; stok dikembalikan jika barang masih berstatus dipinjam.
  const target = loans.find((loan) => loan.id === Number(id));
  if (!target) return;

  if (target.status === 'Dipinjam') {
    const inventoryItem = inventory.find((item) => item.name.toLowerCase() === target.item.toLowerCase());
    if (inventoryItem) {
      inventoryItem.stock += Number(target.quantity || 0);
    }
  }

  loans = loans.filter((loan) => loan.id !== Number(id));
  saveLoans();
  saveInventory();
  renderAll();
}

// Menghubungkan klik menu, tombol tambah cepat, formulir, dan tombol hapus ke fungsinya.
tabButtons.forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

quickAddBtn.addEventListener('click', () => {
  switchTab('peminjaman');
  document.querySelector('input[name="borrower"]').focus();
});

form.addEventListener('submit', addLoan);

tbody.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('.delete-btn');
  if (!deleteButton) return;
  deleteLoan(deleteButton.dataset.id);
});

// Saat aplikasi dibuka, tampilkan menu Barang dan gambar semua data.
switchTab('barang');
renderAll();
