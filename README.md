# Sitewatch — Dashboard Telemetry & Revenue

**Sitewatch** adalah aplikasi web dashboard interaktif yang digunakan untuk memantau *realtime revenue*, telemetry pengguna, dan status sistem (*uptime* & *memory usage*) secara terpusat dari berbagai *site*.

---

## 🚀 Fitur Utama

- **Authentication System**: Layar login aman menggunakan JWT token (`user` / `pass`).
- **Realtime Dashboard Analytics**:
  - Stat cards: Total Pendapatan, Total Records, Memori (Alloc/Sys), Uptime API.
  - Interactive Charts (Chart.js): Visualisasi pendapatan per situs dan distribusi record per pengguna.
- **Record Management (CRUD)**:
  - Melihat daftar record telemetry.
  - Pencarian *realtime* berdasarkan nama *site* atau *user*.
  - Menambah record baru melalui modal form.
  - Menghapus record dengan konfirmasi modal.
  - **Seed Data**: Fitur generate data contoh secara otomatis untuk keperluan testing.
- **Responsive & Modern UI**: Tampilan bertema gelap (*cyberpunk/terminal style*) dengan navigasi sidebar dan sistem toast notification.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+), Chart.js
- **Backend / Web Server**: Go (Golang) / Nginx
- **Containerization**: Docker & Docker Compose

---

## ⚙️ Cara Menjalankan Aplikasi (Local / Docker)

### Prasyarat
- Docker & Docker Compose terinstal di komputer.

### Langkah Instalasi

1. **Clone repository ini:**
```bash
   git clone https://github.com/sariidwi/Aplikasi-Dashboard-Frontend-y.git
   cd Aplikasi-Dashboard-Frontend-y
2. **Jalankan container dengan Docker Compose:**
   ```Bash
      docker compose up -d --build


3. Buka aplikasi di browser:
    Akses http://localhost:7005 (atau port yang terkonfigurasi pada Nginx/Frontend).

4. Kredensial Login Default:

Username: user

Password: pass

📁 Struktur Folder Project
Plaintext
├── css/
│   └── style.css       # Styling visual & tata letak aplikasi
├── js/
│   ├── api.js          # Service layer untuk komunikasi ke Backend API
│   ├── charts.js       # Konfigurasi & render Chart.js
│   └── app.js          # Logic utama aplikasi (Auth, DOM, Events)
├── Dockerfile          # Konfigurasi Docker container
├── docker-compose.yml  # Orchestration service frontend & API
├── index.html          # Shell utama HTML dashboard & modal
└── nginx.conf          # Konfigurasi Nginx rever
