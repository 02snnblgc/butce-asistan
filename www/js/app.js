/* =========================================
   YARDIMCI FONKSİYONLAR VE VERİ YÖNETİMİ
   ========================================= */
function showToast(msg, type = 'info') {
  const box = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderLeftColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : 'var(--accent)';
  el.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i> ${msg}`;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

// İlk dosyadan gelen 30+ standart gider kalemi
const DEFAULT_CATS = [
  "ZİRAAT BANKASI TROY", "ZİRAAT BANKASI M.CARD", "HALK BANKASI TROY", "HALK BANKASI M.CARD", 
  "TÜRKİYE FİNANS", "ELEKTRİK FATURASI", "SU FATURASI", "DOĞALGAZ FATURASI", 
  "SICAK SU DOĞALGAZ FATURASI", "İNTERNET FATURASI", "SİTE AİDATI", "SABİHA TELEFON FATURASI", 
  "SİNAN TELEFON FATURASI", "HÜDA NUR TELEFON", "HÜDA NUR AYLIK", "SABİHAYA", "SİNANA", 
  "TRAŞ İÇİN", "İŞYERİ YEMEK", "İŞYERİ ÇAY", "İŞYERİ SU", "ARAÇ SİGORTASI", 
  "ARAÇ MUAYENESİ", "ARAÇ BAKIMI", "ARAÇ LASTİĞİ", "Kira / Konut", "Mutfak & Market", 
  "Eğitim & Kurs", "Sağlık & Bakım", "Diğer"
];

const DB = {
  get user() { return localStorage.getItem('butce_user'); },
  set user(val) { val ? localStorage.setItem('butce_user', val) : localStorage.removeItem('butce_user'); },
  get data() { return JSON.parse(localStorage.getItem('butce_data')) || {}; },
  set data(val) { localStorage.setItem('butce_data', JSON.stringify(val)); },
  
  getPeriod(period) {
    if (!this.user) return { transactions: [], notes: '', budgetLimit: 0 };
    const d = this.data;
    if (!d[this.user]) d[this.user] = {};
    if (!d[this.user][period]) d[this.user][period] = { transactions: [], notes: '', budgetLimit: 0 };
    return d[this.user][period];
  },
  savePeriod(period, periodData) {
    const d = this.data;
    if (!d[this.user]) d[this.user] = {};
    d[this.user][period] = periodData;
    this.data = d;
  },
  getCats() { return JSON.parse(localStorage.getItem('butce_cats')) || DEFAULT_CATS; },
  saveCats(cats) { localStorage.setItem('butce_cats', JSON.stringify(cats)); },
  getProfile() { return JSON.parse(localStorage.getItem('butce_profiles'))?.[this.user] || null; },
  saveProfile(profile) {
    const p = JSON.parse(localStorage.getItem('butce_profiles')) || {};
    p[this.user] = profile;
    localStorage.setItem('butce_profiles', JSON.stringify(p));
  },
  getPins() { return JSON.parse(localStorage.getItem('butce_pins')) || {}; },
  savePin(user, pin) {
    const p = this.getPins();
    p[user] = pin;
    localStorage.setItem('butce_pins', JSON.stringify(p));
  },
  getSettings() { return JSON.parse(localStorage.getItem('butce_settings')) || { currency: 'TRY' }; },
  saveSettings(s) { localStorage.setItem('butce_settings', JSON.stringify(s)); }
};

const AlarmSystem = {
  audio: null,
  init() { this.audio = document.getElementById('alarm-sound'); },
  start() {
    if (this.audio) { this.audio.volume = 1; this.audio.play().catch(e => console.warn("Ses engellendi.")); }
    document.getElementById('alarm-modal').classList.add('open');
  },
  stop() {
    if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; }
    document.getElementById('alarm-modal').classList.remove('open');
  }
};

/* =========================================
   UYGULAMA BAŞLANGICI VE OLAY DİNLEYİCİLERİ
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  AlarmSystem.init();
  
  // Tema Yükleme
  const savedTheme = localStorage.getItem('butce_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  // Oturum Kontrolü
  if (DB.user) {
    showApp();
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
  }

  // --- GİRİŞ İŞLEMLERİ ---
  let tempAvatar = null;
  document.getElementById('avatar-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      tempAvatar = ev.target.result;
      document.getElementById('avatar-preview').innerHTML = `<img src="${tempAvatar}">`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('username-input').addEventListener('input', function() {
    const exists = DB.getPins()[this.value.trim()];
    document.getElementById('pin-confirm-group').style.display = exists ? 'none' : 'block';
    document.getElementById('auth-hint').innerText = exists ? 'Mevcut hesap. PIN girin.' : 'Yeni hesap oluşturulacak. PIN belirleyin.';
  });

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('username-input').value.trim();
    const pin = document.getElementById('pin-input').value.trim();
    const pins = DB.getPins();
    
    if (pins[u]) {
      // Mevcut kullanıcı - PIN kontrolü
      if (pins[u] !== pin) {
        showToast("Hatalı PIN kodu!", "error");
        return;
      }
    } else {
      // Yeni kullanıcı - PIN onayı
      const pinConfirm = document.getElementById('pin-confirm').value.trim();
      if (pin !== pinConfirm) {
        showToast("PIN kodları eşleşmiyor!", "error");
        return;
      }
      if (pin.length < 4) {
        showToast("PIN en az 4 haneli olmalı!", "error");
        return;
      }
      DB.savePin(u, pin);
    }
    
    DB.user = u;
    if (tempAvatar) DB.saveProfile({ avatar: tempAvatar });
    showApp();
  });

  // --- ÜST MENÜ BUTONLARI ---
  document.querySelector('[data-action="logout"]').addEventListener('click', () => {
    DB.user = null;
    location.reload();
  });

  document.querySelector('[data-action="toggle-theme"]').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('butce_theme', next);
    updateThemeIcon(next);
  });

  function updateThemeIcon(theme) {
    document.getElementById('theme-icon').className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }

  document.querySelectorAll('.theme-circle').forEach(el => {
    el.addEventListener('click', () => {
      document.documentElement.setAttribute('data-accent', el.dataset.accent);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', function() {
      this.closest('.modal').classList.remove('open');
    });
  });

  document.querySelector('[data-action="open-settings"]').addEventListener('click', () => {
    document.getElementById('currency-select').value = DB.getSettings().currency;
    document.getElementById('budget-limit-input').value = DB.getPeriod(document.getElementById('active-period').value).budgetLimit || '';
    document.getElementById('settings-modal').classList.add('open');
  });

  // --- AYARLAR İÇİ İŞLEMLER ---
  document.getElementById('currency-select').addEventListener('change', function() {
    const s = DB.getSettings(); s.currency = this.value; DB.saveSettings(s); renderAll();
  });

  document.getElementById('btn-change-pin').addEventListener('click', () => {
    const p1 = document.getElementById('new-pin').value.trim();
    const p2 = document.getElementById('new-pin-confirm').value.trim();
    if (p1.length < 4) { showToast("PIN en az 4 haneli olmalı", "error"); return; }
    if (p1 !== p2) { showToast("PIN'ler eşleşmiyor", "error"); return; }
    DB.savePin(DB.user, p1);
    document.getElementById('new-pin').value = '';
    document.getElementById('new-pin-confirm').value = '';
    showToast("PIN güncellendi", "success");
  });

  window.saveBudgetLimit = function() {
    const val = Number(document.getElementById('budget-limit-input').value);
    const period = document.getElementById('active-period').value;
    const data = DB.getPeriod(period);
    data.budgetLimit = val;
    DB.savePeriod(period, data);
    renderAll();
    showToast("Bütçe limiti kaydedildi", "success");
  };

  document.getElementById('btn-test-alarm').addEventListener('click', () => AlarmSystem.start());
  document.getElementById('alarm-ack').addEventListener('click', () => AlarmSystem.stop());

  // --- DÖNEM İŞLEMLERİ ---
  const periodInput = document.getElementById('active-period');
  const today = new Date();
  periodInput.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  
  document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
  periodInput.addEventListener('change', () => { loadNotes(); renderAll(); });

  function changeMonth(dir) {
    const [y, m] = periodInput.value.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    periodInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    loadNotes();
    renderAll();
  }

  // --- FORM İŞLEMLERİ ---
  window.toggleCategory = function() {
    document.getElementById('expense-cat-group').style.display = document.getElementById('tx-type').value === 'expense' ? 'block' : 'none';
  };

  document.getElementById('transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const period = periodInput.value;
    const data = DB.getPeriod(period);
    const type = document.getElementById('tx-type').value;
    const editId = document.getElementById('edit-id').value;
    
    const txData = {
      id: editId || Date.now().toString(),
      type: type,
      title: document.getElementById('tx-title').value,
      category: type === 'expense' ? document.getElementById('expense-category').value : 'Gelir',
      amount: Number(document.getElementById('tx-amount').value),
      date: document.getElementById('tx-date').value,
      paid: document.getElementById('tx-paid').checked,
      recurring: document.getElementById('tx-recurring').checked
    };

    if (editId) {
      const idx = data.transactions.findIndex(t => t.id === editId);
      if (idx > -1) data.transactions[idx] = txData;
      showToast("İşlem güncellendi.", "success");
    } else {
      data.transactions.push(txData);
      showToast("İşlem kaydedildi.", "success");
    }
    
    DB.savePeriod(period, data);
    resetForm();
    renderAll();
  });

  window.resetForm = function() {
    document.getElementById('transaction-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('form-title').innerText = 'Yeni İşlem Ekle';
    document.getElementById('tx-submit-btn').innerText = 'Kaydet';
    document.getElementById('tx-cancel-edit').style.display = 'none';
    document.getElementById('tx-date').value = new Date().toISOString().slice(0,10);
    toggleCategory();
  };
  window.cancelEdit = resetForm;

  // --- FİLTRE VE LİSTE ETKİLEŞİMLERİ ---
  document.getElementById('filter-search').addEventListener('input', renderListOnly);
  document.getElementById('filter-type').addEventListener('change', renderListOnly);
  document.getElementById('filter-paid').addEventListener('change', renderListOnly);
  document.getElementById('filter-sort').addEventListener('change', renderListOnly);

  document.getElementById('btn-copy-prev-month').addEventListener('click', () => {
    const [y, m] = periodInput.value.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
    const prevData = DB.getPeriod(prevPeriod);
    
    if (!prevData.transactions.length) { showToast("Önceki ay verisi yok", "error"); return; }
    
    const curData = DB.getPeriod(periodInput.value);
    let count = 0;
    prevData.transactions.forEach(t => {
      if (t.recurring && !curData.transactions.find(x => x.title === t.title)) {
        curData.transactions.push({ ...t, id: Date.now().toString(), paid: false, date: periodInput.value + '-01' });
        count++;
      }
    });
    DB.savePeriod(periodInput.value, curData);
    renderAll();
    showToast(count ? `${count} işlem kopyalandı` : "Kopyalanacak yeni işlem yok", "info");
  });

  document.getElementById('transaction-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const period = periodInput.value;
    const data = DB.getPeriod(period);
    const id = btn.dataset.id;
    
    if (btn.classList.contains('del-btn')) {
      if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
        data.transactions = data.transactions.filter(t => t.id !== id);
        DB.savePeriod(period, data);
        renderAll();
        showToast("İşlem silindi.", "info");
      }
    } else if (btn.classList.contains('paid-btn')) {
      const tx = data.transactions.find(t => t.id === id);
      if (tx) { tx.paid = !tx.paid; DB.savePeriod(period, data); renderAll(); }
    } else if (btn.classList.contains('edit-btn')) {
      const tx = data.transactions.find(t => t.id === id);
      if (tx) {
        document.getElementById('edit-id').value = tx.id;
        document.getElementById('tx-type').value = tx.type;
        toggleCategory();
        if (tx.category) document.getElementById('expense-category').value = tx.category;
        document.getElementById('tx-title').value = tx.title;
        document.getElementById('tx-amount').value = tx.amount;
        document.getElementById('tx-date').value = tx.date;
        document.getElementById('tx-paid').checked = tx.paid;
        document.getElementById('tx-recurring').checked = tx.recurring || false;
        document.getElementById('form-title').innerText = 'İşlemi Düzenle';
        document.getElementById('tx-submit-btn').innerText = 'Güncelle';
        document.getElementById('tx-cancel-edit').style.display = 'block';
        window.scrollTo(0,0);
      }
    }
  });

  // --- NOT KAYDETME ---
  let noteTimer;
  document.getElementById('period-notes').addEventListener('input', function() {
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      const data = DB.getPeriod(periodInput.value);
      data.notes = this.value;
      DB.savePeriod(periodInput.value, data);
    }, 500);
  });

  // --- YEDEKLEME VE PDF ---
  document.querySelector('[data-action="export-pdf"]').addEventListener('click', () => {
    document.getElementById('print-period-info').innerText = `Dönem: ${periodInput.value} | Kullanıcı: ${DB.user}`;
    window.print();
  });

  document.querySelector('[data-action="export-json"]').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB.data));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `butce_yedek_${DB.user}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    showToast("Yedek indirildi", "success");
  });

  document.getElementById('import-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        if(confirm("Mevcut verilerin üzerine yazılacak. Onaylıyor musunuz?")) {
          DB.data = JSON.parse(ev.target.result);
          showToast("Veriler yüklendi. Yenileniyor...", "success");
          setTimeout(() => location.reload(), 1500);
        }
      } catch { showToast("Hatalı yedek dosyası", "error"); }
    };
    reader.readAsText(file);
  });

  // --- KATEGORİ İŞLEMLERİ ---
  window.openCategoryModal = function() { document.getElementById('category-modal').classList.add('open'); };
  window.addNewCategory = function() {
    const val = document.getElementById('new-cat-input').value.trim();
    if (!val) return;
    const cats = DB.getCats();
    if (!cats.includes(val)) { cats.push(val); DB.saveCats(cats); loadCategories(); showToast("Kategori eklendi", "success"); }
    document.getElementById('new-cat-input').value = '';
    document.getElementById('category-modal').classList.remove('open');
  };
});

/* =========================================
   ARAYÜZ ÇİZİM FONKSİYONLARI
   ========================================= */
function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  document.getElementById('display-username').innerText = DB.user;
  
  const profile = DB.getProfile();
  if (profile && profile.avatar) {
    document.getElementById('user-avatar').innerHTML = `<img src="${profile.avatar}">`;
  } else {
    document.getElementById('user-avatar').innerText = DB.user.charAt(0).toUpperCase();
  }

  document.getElementById('tx-date').value = new Date().toISOString().slice(0,10);
  loadCategories();
  loadNotes();
  renderAll();
  setTimeout(checkDuePayments, 1500);
}

function loadCategories() {
  const sel = document.getElementById('expense-category');
  sel.innerHTML = DB.getCats().map(c => `<option value="${c}">${c}</option>`).join('');
}

function loadNotes() {
  const period = document.getElementById('active-period').value;
  const data = DB.getPeriod(period);
  document.getElementById('period-notes').value = data.notes || '';
}

function getCurrencySymbol() {
  const c = DB.getSettings().currency;
  return c === 'USD' ? '$' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : '₺';
}

function formatMoney(amount) {
  return Number(amount).toLocaleString('tr-TR') + ' ' + getCurrencySymbol();
}

function renderAll() {
  const period = document.getElementById('active-period').value;
  const data = DB.getPeriod(period);
  
  let income = 0, expense = 0;
  const cats = {};

  data.transactions.forEach(tx => {
    if (tx.type === 'income') income += tx.amount;
    else expense += tx.amount;

    const key = tx.type + '|' + (tx.category || 'Diğer');
    if (!cats[key]) cats[key] = { type: tx.type, name: tx.category || 'Diğer', total: 0 };
    cats[key].total += tx.amount;
  });

  document.getElementById('total-income').innerText = formatMoney(income);
  document.getElementById('total-expense').innerText = formatMoney(expense);
  document.getElementById('net-balance').innerText = formatMoney(income - expense);

  // Kategori Özeti Çizimi
  const catSummary = document.getElementById('category-summary');
  catSummary.innerHTML = '';
  if (Object.keys(cats).length === 0) {
    catSummary.innerHTML = '<p style="color:var(--text-muted);font-size: .85rem;">Veri yok.</p>';
  } else {
    Object.values(cats).sort((a,b) => b.total - a.total).forEach(c => {
      catSummary.innerHTML += `
        <div class="cat-row">
          <span class="cat-name">${c.type === 'income' ? '↑' : '↓'} ${c.name}</span>
          <span class="cat-amount" style="color: ${c.type === 'income' ? '#10b981' : '#ef4444'}">${formatMoney(c.total)}</span>
        </div>
      `;
    });
  }

  // Bütçe Limiti Kontrolü
  const budgetBanner = document.getElementById('budget-banner');
  if (data.budgetLimit > 0) {
    if (expense > data.budgetLimit) {
      budgetBanner.style.display = 'flex';
      budgetBanner.innerText = `Bütçe Aşıldı! Limit: ${formatMoney(data.budgetLimit)} - Gider: ${formatMoney(expense)}`;
    } else {
      budgetBanner.style.display = 'none';
    }
  } else {
    budgetBanner.style.display = 'none';
  }

  renderListOnly();
}

function renderListOnly() {
  const period = document.getElementById('active-period').value;
  const data = DB.getPeriod(period);
  const list = document.getElementById('transaction-list');
  list.innerHTML = '';
  
  let filtered = [...data.transactions];
  const search = document.getElementById('filter-search').value.toLowerCase();
  const type = document.getElementById('filter-type').value;
  const paid = document.getElementById('filter-paid').value;
  const sort = document.getElementById('filter-sort').value;

  if (search) filtered = filtered.filter(t => (t.title || '').toLowerCase().includes(search) || (t.category || '').toLowerCase().includes(search));
  if (type) filtered = filtered.filter(t => t.type === type);
  if (paid === 'paid') filtered = filtered.filter(t => t.paid);
  if (paid === 'unpaid') filtered = filtered.filter(t => !t.paid);

  filtered.sort((a, b) => {
    if (sort === 'date-asc') return (a.date || '').localeCompare(b.date || '');
    if (sort === 'date-desc') return (b.date || '').localeCompare(a.date || '');
    if (sort === 'amount-asc') return a.amount - b.amount;
    if (sort === 'amount-desc') return b.amount - a.amount;
    return 0;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Kayıt bulunamadı.</p>';
    return;
  }

  const today = new Date(); today.setHours(0,0,0,0);

  filtered.forEach(tx => {
    const isOverdue = tx.type === 'expense' && !tx.paid && new Date(tx.date) <= today;
    const badge = tx.type === 'income' 
      ? '<span class="badge success">Gelir</span>' 
      : (tx.paid ? '<span class="badge success">Ödendi</span>' : (isOverdue ? '<span class="badge danger">Gecikti</span>' : '<span class="badge normal">Bekliyor</span>'));

    list.innerHTML += `
      <div class="transaction-item">
        <div class="transaction-info">
          <h5>${tx.category && tx.type === 'expense' ? `[${tx.category}] ` : ''}${tx.title}</h5>
          <p>Tarih: ${tx.date} ${tx.recurring ? '🔁' : ''} ${badge}</p>
        </div>
        <div style="display: flex; align-items: center;">
          <span style="font-weight:bold; color:${tx.type === 'income' ? '#10b981' : '#ef4444'}; margin-right: 10px;">
            ${tx.type === 'income' ? '+' : '-'}${formatMoney(tx.amount)}
          </span>
          <div class="tx-actions">
            ${tx.type === 'expense' ? `<button class="paid-btn" data-id="${tx.id}" title="Ödendi"><i class="fa-solid fa-check"></i></button>` : ''}
            <button class="edit-btn" data-id="${tx.id}" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
            <button class="del-btn" data-id="${tx.id}" title="Sil"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `;
  });
}

function checkDuePayments() {
  const period = document.getElementById('active-period').value;
  const data = DB.getPeriod(period);
  const today = new Date(); today.setHours(0,0,0,0);
  
  const due = data.transactions.filter(tx => tx.type === 'expense' && !tx.paid && new Date(tx.date) <= today);

  if (due.length > 0) {
    document.getElementById('alert-banner').style.display = 'flex';
    document.getElementById('alert-banner').innerText = `⚠️ ${due.length} adet ödeme tarihi geldi/geçti!`;
    
    setTimeout(() => {
      document.getElementById('alarm-body').innerHTML = due.map(tx => `<p style="padding-bottom: 5px; border-bottom: 1px solid var(--border-color);"><strong>${tx.title}</strong> - ${formatMoney(tx.amount)}</p>`).join('');
      AlarmSystem.start();
    }, 1000);
  } else {
    document.getElementById('alert-banner').style.display = 'none';
  }
}
