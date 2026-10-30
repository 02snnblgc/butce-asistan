function showToast(msg, type = 'info') {
  const box = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderLeftColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : 'var(--accent)';
  el.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i> ${msg}`;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

const DEFAULT_EXPENSE_CATS = [
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
    if (!this.user) return { transactions: [] };
    const d = this.data;
    if (!d[this.user]) d[this.user] = {};
    if (!d[this.user][period]) d[this.user][period] = { transactions: [] };
    return d[this.user][period];
  },
  savePeriod(period, periodData) {
    const d = this.data;
    if (!d[this.user]) d[this.user] = {};
    d[this.user][period] = periodData;
    this.data = d;
  },
  getCats() { return JSON.parse(localStorage.getItem('butce_cats')) || DEFAULT_EXPENSE_CATS; },
  saveCats(cats) { localStorage.setItem('butce_cats', JSON.stringify(cats)); }
};

const AlarmSystem = {
  audio: null,
  init() { this.audio = document.getElementById('alarm-sound'); },
  start() {
    if (this.audio) { this.audio.volume = 1; this.audio.play().catch(e => console.warn("Ses çalınamadı.")); }
    document.getElementById('alarm-modal').classList.add('open');
  },
  stop() {
    if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; }
    document.getElementById('alarm-modal').classList.remove('open');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AlarmSystem.init();
  
  if (DB.user) {
    showApp();
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
  }

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    DB.user = document.getElementById('username-input').value.trim();
    showApp();
  });

  document.querySelector('[data-action="logout"]').addEventListener('click', () => {
    DB.user = null; location.reload();
  });

  document.querySelector('[data-action="toggle-theme"]').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', function() { this.closest('.modal').classList.remove('open'); });
  });

  document.querySelector('[data-action="open-settings"]').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('open');
  });

  document.getElementById('btn-test-alarm').addEventListener('click', () => AlarmSystem.start());
  document.getElementById('alarm-ack').addEventListener('click', () => AlarmSystem.stop());

  const periodInput = document.getElementById('active-period');
  const today = new Date();
  periodInput.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  
  document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
  periodInput.addEventListener('change', renderAll);

  function changeMonth(dir) {
    const [y, m] = periodInput.value.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    periodInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    renderAll();
  }

  document.getElementById('transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const period = periodInput.value;
    const data = DB.getPeriod(period);
    const type = document.getElementById('tx-type').value;
    
    data.transactions.push({
      id: Date.now().toString(),
      type: type,
      title: document.getElementById('tx-title').value,
      category: type === 'expense' ? document.getElementById('expense-category').value : 'Gelir',
      amount: Number(document.getElementById('tx-amount').value),
      date: document.getElementById('tx-date').value,
      paid: document.getElementById('tx-paid').checked
    });
    
    DB.savePeriod(period, data);
    renderAll();
    showToast("İşlem kaydedildi.", "success");
    document.getElementById('tx-title').value = '';
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-paid').checked = false;
  });

  document.getElementById('tx-type').addEventListener('change', function() {
    document.getElementById('expense-cat-group').style.display = this.value === 'expense' ? 'block' : 'none';
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
      }
    } else if (btn.classList.contains('paid-btn')) {
      const tx = data.transactions.find(t => t.id === id);
      if (tx) { tx.paid = !tx.paid; DB.savePeriod(period, data); renderAll(); }
    }
  });

  function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    document.getElementById('display-username').innerText = DB.user;
    document.getElementById('user-avatar').innerText = DB.user.charAt(0).toUpperCase();
    document.getElementById('tx-date').value = new Date().toISOString().slice(0,10);
    
    loadCategories();
    renderAll();
    setTimeout(checkDuePayments, 1500);
  }

  function loadCategories() {
    const sel = document.getElementById('expense-category');
    const cats = DB.getCats();
    sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  window.openCategoryModal = function() {
    document.getElementById('category-modal').classList.add('open');
  };

  window.addNewCategory = function() {
    const newCat = document.getElementById('new-cat-input').value.trim();
    if (!newCat) return;
    const cats = DB.getCats();
    if (!cats.includes(newCat)) {
      cats.push(newCat);
      DB.saveCats(cats);
      loadCategories();
      showToast("Kategori eklendi", "success");
    }
    document.getElementById('new-cat-input').value = '';
    document.getElementById('category-modal').classList.remove('open');
  };

  function renderAll() {
    const period = periodInput.value;
    const data = DB.getPeriod(period);
    const list = document.getElementById('transaction-list');
    const catSummary = document.getElementById('category-summary');
    
    list.innerHTML = ''; catSummary.innerHTML = '';
    let income = 0, expense = 0;
    const cats = {};

    if (data.transactions.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Kayıt yok.</p>';
      catSummary.innerHTML = '<p style="color:var(--text-muted);font-size: .85rem;">Veri yok.</p>';
    }

    const sorted = [...data.transactions].sort((a,b) => b.date.localeCompare(a.date));

    sorted.forEach(tx => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;

      const key = tx.type + '|' + (tx.category || 'Diğer');
      if (!cats[key]) cats[key] = { type: tx.type, name: tx.category || 'Diğer', total: 0 };
      cats[key].total += tx.amount;

      const isOverdue = tx.type === 'expense' && !tx.paid && new Date(tx.date) <= new Date();
      const badge = tx.type === 'income' 
        ? '<span class="badge success">Gelir</span>' 
        : (tx.paid ? '<span class="badge success">Ödendi</span>' : (isOverdue ? '<span class="badge danger">Gecikti</span>' : '<span class="badge normal">Bekliyor</span>'));

      list.innerHTML += `
        <div class="transaction-item">
          <div class="transaction-info">
            <h5>${tx.title}</h5>
            <p>${tx.date} | ${tx.category || '-'} ${badge}</p>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="font-weight:bold; color:${tx.type === 'income' ? '#10b981' : '#ef4444'}; margin-right: 10px;">
              ${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('tr-TR')} ₺
            </span>
            <div class="tx-actions">
              ${tx.type === 'expense' ? `<button class="paid-btn" data-id="${tx.id}"><i class="fa-solid fa-check"></i></button>` : ''}
              <button class="del-btn" data-id="${tx.id}"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      `;
    });

    document.getElementById('total-income').innerText = income.toLocaleString('tr-TR') + ' ₺';
    document.getElementById('total-expense').innerText = expense.toLocaleString('tr-TR') + ' ₺';
    document.getElementById('net-balance').innerText = (income - expense).toLocaleString('tr-TR') + ' ₺';

    Object.values(cats).sort((a,b) => b.total - a.total).forEach(c => {
      catSummary.innerHTML += `
        <div class="cat-row">
          <span>${c.type === 'income' ? '↑' : '↓'} ${c.name}</span>
          <span style="color: ${c.type === 'income' ? '#10b981' : '#ef4444'}">${c.total.toLocaleString('tr-TR')} ₺</span>
        </div>
      `;
    });
  }

  function checkDuePayments() {
    const period = periodInput.value;
    const data = DB.getPeriod(period);
    const today = new Date(); today.setHours(0,0,0,0);
    
    const due = data.transactions.filter(tx => tx.type === 'expense' && !tx.paid && new Date(tx.date) <= today);

    if (due.length > 0) {
      document.getElementById('alert-banner').style.display = 'block';
      document.getElementById('alert-banner').innerText = `⚠️ ${due.length} adet gecikmiş ödemeniz var!`;
      setTimeout(() => {
        document.getElementById('alarm-body').innerHTML = due.map(tx => `<p><strong>${tx.title}</strong> - ${tx.amount} ₺</p>`).join('');
        AlarmSystem.start();
      }, 1000);
    } else {
      document.getElementById('alert-banner').style.display = 'none';
    }
  }
});