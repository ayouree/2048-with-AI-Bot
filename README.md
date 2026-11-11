# 🎮 Web Game 2048 Modern + Auto Bot AI Solver

Game web **2048** interaktif dengan kontrol lengkap (WASD / Tombol Panah / Layar Sentuh) dilengkapi dengan **Sistem Auto Bot AI (Expectimax Algorithm)** cerdas yang dapat menyelesaikan game secara otomatis hingga mencapai tile **2048, 4096, dan seterusnya** dengan skor tertinggi!

---

## ✨ Fitur Utama

1. **Kontrol Fleksibel**:
   - **Keyboard**:
     - `W` / `↑` : Geser ke Atas
     - `A` / `←` : Geser ke Kiri
     - `S` / `↓` : Geser ke Bawah
     - `D` / `→` : Geser ke Kanan
   - **Layar Sentuh (Mobile)**: Mendukung gestur swipe dan tombol D-pad virtual.

2. **🤖 Sistem Auto Bot (Live AI Solver)**:
   - **Visualisasi Real-Time**: Anda dapat menyaksikan bot berpikir dan menggeser tile secara langsung di layar.
   - **Algoritma Expectimax**: Menganalisa probabilitas kemunculan tile (angka 2 atau 4) dengan heuristik *Monotonicity*, *Smoothness*, *Free Cells*, dan *Corner Locking*.
   - **Pilihan Strategi**:
     - *Expectimax AI*: Model paling cerdas (terbukti mencapai 2048+).
     - *Corner Priority Heuristic*: Strategi cepat mengunci sudut.
     - *Random*: Uji coba acak.
   - **Pengatur Kecepatan Bot**: Slider kecepatan dari *Kilat (10ms)* hingga *Santai (600ms)*.
   - **Live Analytics**: Menampilkan jumlah langkah, tile terbesar saat ini, arah langkah yang dipilih, dan waktu kalkulasi AI per langkah.
   - **Auto Keep-Going**: Saat bot mencapai tile 2048, bot akan otomatis melanjutkan permainan untuk meraih skor setinggi mungkin.

3. **Fitur Tambahan**:
   - **Undo**: Kembalikan hingga 10 langkah sebelumnya jika Anda melakukan kesalahan.
   - **Audio Synthesizer**: Efek suara dinamis untuk slide, merge chime, dan game over menggunakan Web Audio API murni (tanpa download asset luar).
   - **Penyimpanan Skor Tertinggi**: Skor tertinggi tersimpan secara otomatis di browser (`localStorage`).
   - **Desain Modern & Responsif**: Tampilan clean, elegan, dan nyaman dimainkan di layar desktop maupun ponsel.

---

## 🚀 Cara Menjalankan

Anda cukup membuka file **`index.html`** langsung di browser pilihan Anda (Google Chrome, Microsoft Edge, Firefox, Safari):

- Klik dua kali file `index.html`, atau
- Jalankan local server jika diinginkan:
  ```bash
  # Menggunakan Python
  python -m http.server 8080

  # Atau menggunakan Node.js (npx serve / http-server)
  npx serve .
  ```
- Buka alamat `http://localhost:8080` pada browser Anda.
