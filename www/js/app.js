/* =========================================
   BASİT LOCALSTORAGE VERİ YÖNETİMİ
   ========================================= */
const DB = {
  get user() { return localStorage.getItem('butce_user'); },
  set user(val) { val ? localStorage.setItem('butce_user', val) : localStorage.removeItem('butce_user'); },
  get data() { return JSON.parse(localStorage.getItem('butce_data')) || {}; },
  set data(val) { localStorage.setItem('butce_data', JSON.stringify(val)); },
  
  getPeriod(period) {
    if (!this.user) return null;
    if (!this.data[this.user]) this.data[this.user] = {};
    if (!this.data[this.user][period]) this.data[this.user][period] = { transactions: [], notes: '' };
    return this.data[this.user][period];
  },
  savePeriod(period, periodData) {
    if (!this.data[this.user]) this.data[this.user] = {};
    this.data[this.user][period] = periodData;
    this.data = this.data;
  },
  getUserProfile() {
    return JSON.parse(localStorage.getItem('butce_profiles'))?.[this.user] || null;
  },
  saveUserProfile(profile) {
    const profiles = JSON.parse(localStorage.getItem('butce_profiles')) || {};
    profiles[this.user] = profile;
    localStorage.setItem('butce_profiles', JSON.stringify(profiles));
  }
};

/* =========================================
   SESLİ VE GÖRÜNTÜLÜ ALARM YÖNETİMİ
   ========================================= */
const Alarm = {
  audioEl: null,
  interval: null,
  
  init() {
    this.audioEl = document.getElementById('alarm-sound');
  },
  
  start() {
    if (this.interval) return;
    // Sesi döngüye al
    if (this.audioEl) {
      this.audioEl.volume = 1;
      this.audioEl.play().catch(e => console.warn("Ses çalınamadı:", e));
      
      // Ekranda görüntülü alarm modalını aç
      document.getElementById('alarm-modal').classList.add('open');
      
      // 1.5 saniyede bir sesi tekrar çal (loop efekti)
      this.interval = setInterval(() => {
        if (this.audioEl) {
          this.audioEl.currentTime = 0;
          this.audioEl.play().catch(e => {});
        }
      }, 1500);
    }
  },
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    document.getElementById('alarm-modal').classList.remove('open');
  }
};

/* =========================================
   ANA UYGULAMA MANTIĞI
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  Alarm.init();
  
  // Tema Yükleme
  const savedTheme = localStorage.getItem('butce_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Giriş Kontrolü
  if (DB.user) {
    showApp();
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
  }

  // Avatar Seçimi
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

  // Kullanıcı Adı Kontrolü (Yeni mi?)
  document.getElementById('username-input').addEventListener('input', function() {
    const exists = DB.data[this.value.trim()];
    document.getElementById('pin-confirm-group').style.display = exists ? 'none' : 'block';
    document.getElementById('auth-hint').innerText = exists ? 'Mevcut hesap.' : 'Yeni hesap oluşturulacak.';
  });

  // Giriş Formu
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('username-input').value.trim();
    if (!u) return;
    
    DB.user = u;
    if (tempAvatar) DB.saveUserProfile({ avatar: tempAvatar });
    
    showApp();
  });

  // Çıkış
  document.querySelector('[data-action="logout"]').addEventListener('click', () => {
    DB.user = null;
    location.reload();
  });

  // Tema Değiştir
  document.querySelector('[data-action="toggle-theme"]').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('butce_theme', next);
  });

  // Ayarlar Modalı Aç/Kapa (Düzeltilen Kısım)
  document.querySelectorAll('[data-action="open-settings"]').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById('settings-modal').classList.add('open'));
  });
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', function() {
      this.closest('.modal').classList.remove('open');
    });
  });

  // Test Alarmı
  document.getElementById('btn-test-alarm').addEventListener('click', () => {
    Alarm.start();
  });
  document.getElementById('alarm-ack').addEventListener('click', () => {
    Alarm.stop();
  });

  // Ayarlar - Renk Seçimi
  document.querySelectorAll('.theme-circle').forEach(el => {
    el.addEventListener('click', () => {
      document.documentElement.setAttribute('data-accent', el.dataset.accent);
    });
  });

  // Dönem Değiştirme
  const periodInput = document.getElementById('active-period');
  const today = new Date();
  periodInput.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  
  document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
  periodInput.addEventListener('change', renderTransactions);

  function changeMonth(dir) {
    const [y, m] = periodInput.value.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    periodInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    renderTransactions();
  }

  // İşlem Ekleme
  document.getElementById('transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const period = periodInput.value;
    const data = DB.getPeriod(period);
    
    data.transactions.push({
      id: Date.now().toString(),
      type: document.getElementById('tx-type').value,
      title: document.getElementById('tx-title').value,
      amount: Number(document.getElementById('tx-amount').value),
      date: document.getElementById('tx-date').value,
      paid: document.getElementById('tx-paid').checked
    });
    
    DB.savePeriod(period, data);
    renderTransactions();
    e.target.reset();
    document.getElementById('tx-date').value = new Date().toISOString().slice(0,10);
  });

  function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    document.getElementById('display-username').innerText = DB.user;
    
    const profile = DB.getUserProfile();
    if (profile && profile.avatar) {
      document.getElementById('user-avatar').innerHTML = `<img src="${profile.avatar}">`;
    } else {
      document.getElementById('user-avatar').innerText = DB.user.charAt(0).toUpperCase();
    }

    document.getElementById('tx-date').value = new Date().toISOString().slice(0,10);
    renderTransactions();
    checkDuePayments();
  }

  function renderTransactions() {
    const period = periodInput.value;
    const data = DB.getPeriod(period);
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    
    let income = 0, expense = 0;
    
    if (data.transactions.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Kayıt yok.</p>';
    }

    data.transactions.forEach(tx => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
      
      list.innerHTML += `
        <div class="transaction-item">
          <div>
            <strong>${tx.title}</strong><br>
            <small>${tx.date} ${tx.paid ? '✅' : ''}</small>
          </div>
          <span style="color:${tx.type === 'income' ? '#10b981' : '#ef4444'}; font-weight:bold;">
            ${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('tr-TR')} ₺
          </span>
        </div>
      `;
    });

    document.getElementById('total-income').innerText = income.toLocaleString('tr-TR') + ' ₺';
    document.getElementById('total-expense').innerText = expense.toLocaleString('tr-TR') + ' ₺';
    document.getElementById('net-balance').innerText = (income - expense).toLocaleString('tr-TR') + ' ₺';
  }

  function checkDuePayments() {
    const period = periodInput.value;
    const data = DB.getPeriod(period);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const due = data.transactions.filter(tx => {
      if (tx.type !== 'expense' || tx.paid) return false;
      const txDate = new Date(tx.date);
      return txDate <= today;
    });

    if (due.length > 0) {
      document.getElementById('alert-banner').style.display = 'block';
      document.getElementById('alert-banner').innerText = `⚠️ ${due.length} adet ödeme tarihi geçmiş/gelecek var!`;
      
      // Görüntülü ve sesli alarmı tetikle
      setTimeout(() => {
        document.getElementById('alarm-body').innerHTML = due.map(tx => `<p>${tx.title} - ${tx.amount} ₺</p>`).join('');
        Alarm.start();
      }, 1000);
    } else {
      document.getElementById('alert-banner').style.display = 'none';
    }
  }
});