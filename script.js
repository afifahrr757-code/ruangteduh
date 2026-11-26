// ================= PENYIMPANAN AMAN (LOCALSTORAGE + FALLBACK MEMORI) =================
const memoryStore = {};

function safeGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (err) {
        return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
    }
}

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (err) {
        memoryStore[key] = value;
    }
}

function safeRemoveItem(key) {
    try {
        localStorage.removeItem(key);
    } catch (err) {
        delete memoryStore[key];
    }
}

function safeJSONParse(raw, fallback) {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (err) {
        return fallback;
    }
}

function renderIconsSafely() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        try {
            window.lucide.createIcons();
        } catch (err) {
            // Abaikan jika ikon gagal dimuat saat offline
        }
    }
}

// ================= DATA AWAL & STATE =================
const defaultStories = [
    {
        id: 1,
        alias: "Beruang Kangen Ibu",
        avatar: "🐻",
        avatarBg: "#fef3c7",
        category: "homesick",
        categoryLabel: "🏡 Rindu Rumah",
        mood: "🥺 Kangen Masakan Rumah",
        time: "15 menit lalu",
        content: "Malam ini di asrama hujan deras banget, tiba-tiba keinget rumah dan masakan ibu. Kadang suka nahan nangis di kasur biar teman sekamar nggak khawatir. Ada yang lagi ngerasain hal sama nggak?",
        hugs: 24,
        advices: [
            {
                advisor: "Kakak Awan",
                time: "10 menit lalu",
                text: "Peluk jauh dari kamar sebelah! Wajar banget kok ngerasa kangen rumah, itu tandanya kamu sayang keluarga. Nggak apa-apa nangis sebentar biar lega ya 🤗"
            }
        ]
    },
    {
        id: 2,
        alias: "Pejuang Ujian",
        avatar: "🐱",
        avatarBg: "#e0f2fe",
        category: "akademik",
        categoryLabel: "📚 Tekanan Belajar",
        mood: "📚 Kepala Penuh Tugas",
        time: "1 jam lalu",
        content: "Minggu ini jadwal padat banget, tugas numpuk dan rasanya otak udah ngebul. Takut banget kalau nilaiku turun padahal udah usaha semaksimal mungkin.",
        hugs: 19,
        advices: [
            {
                advisor: "Panda Santuy",
                time: "40 menit lalu",
                text: "Usahamu udah keren banget kok! Nilai bukan satu-satunya penentu masa depanmu. Istirahat 15 menit dulu yuk biar pikiranmu segar lagi 🌱"
            }
        ]
    },
    {
        id: 3,
        alias: "Bintang Kecil",
        avatar: "🐰",
        avatarBg: "#d8f8e8",
        category: "pertemanan",
        categoryLabel: "🤝 Pertemanan",
        mood: "🌧️ Bingung Cari Teman Ngobrol",
        time: "3 jam lalu",
        content: "Sebagai anak baru di asrama, aku masih suka canggung kalau mau gabung obrolan teman-teman. Takut dikira sok akrab, jadinya sering diem sendiri.",
        hugs: 31,
        advices: []
    },
    {
        id: 4,
        alias: "Tunas Harapan",
        avatar: "🐥",
        avatarBg: "#ede9fe",
        category: "selflove",
        categoryLabel: "🌷 Pengembangan Diri",
        mood: "🌱 Lagi Belajar Percaya Diri",
        time: "5 jam lalu",
        content: "Hari ini aku berhasil beraniin diri maju presentasi di depan kelas tanpa gemetar berlebihan! Kecil sih, tapi buat aku ini pencapaian besar.",
        hugs: 42,
        advices: []
    }
];

const defaultUsers = [
    {
        name: "Naura",
        email: "naura@asrama.id",
        dorm: "Asrama Melati",
        avatar: "🐰",
        password: "123456"
    }
];

const judgmentalWords = [
    "lebay", "baper", "lemah", "cengeng", "bodoh", "tolol", "goblok",
    "salah sendiri", "makanya", "gitu aja", "norak", "drama", "alay"
];

if (!safeGetItem('pelukkata_users')) {
    safeSetItem('pelukkata_users', JSON.stringify(defaultUsers));
}

let currentUser = safeJSONParse(safeGetItem('pelukkata_current_user'), null);
let stories = safeJSONParse(safeGetItem('pelukkata_stories'), defaultStories);
if (!Array.isArray(stories) || stories.length === 0) {
    stories = [...defaultStories];
}
let huggedIds = safeJSONParse(safeGetItem('pelukkata_hugs'), []);
if (!Array.isArray(huggedIds)) {
    huggedIds = [];
}

let currentCategory = 'all';
let searchQuery = '';
let sortOrder = 'newest';
let activeStoryId = null;

// ================= NGOBROL DENGAN TEMAN / SISTEM (MILO) =================
const initialChatMessages = [
    {
        sender: "bot",
        text: "Hai! Aku Milo 🧸 Teman ngobrol kamu di asrama. Di sini kamu nggak perlu jaim atau takut dihakimi ya. Lagi ada apa di pikiranmu hari ini?",
        time: "Baru saja"
    }
];

let chatHistory = safeJSONParse(safeGetItem('pelukkata_chat'), initialChatMessages);
if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
    chatHistory = [...initialChatMessages];
}

function saveChat() {
    safeSetItem('pelukkata_chat', JSON.stringify(chatHistory));
}

function renderChat() {
    const box = document.getElementById('chatMessages');
    if (!box) return;

    box.innerHTML = chatHistory.map(msg => `
        <div class="msg-row ${msg.sender}">
            <div class="msg-avatar">${msg.sender === 'bot' ? '🧸' : escapeHTML(currentUser?.avatar || '🌷')}</div>
            <div class="msg-bubble">
                <span>${escapeHTML(msg.text)}</span>
                <span class="msg-time">${escapeHTML(msg.time)}</span>
            </div>
        </div>
    `).join('');

    box.scrollTop = box.scrollHeight;
}

function showTypingIndicator() {
    const box = document.getElementById('chatMessages');
    if (!box) return;
    const tempId = 'typingTemp';
    if (document.getElementById(tempId)) return;

    const row = document.createElement('div');
    row.id = tempId;
    row.className = 'msg-row bot';
    row.innerHTML = `
        <div class="msg-avatar">🧸</div>
        <div class="msg-bubble">
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>
    `;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typingTemp');
    if (el) el.remove();
}

function generateSoothingFriendReply(userText) {
    const text = userText.toLowerCase();
    const sapaan = currentUser ? `${currentUser.name}, ` : "";

    if (text.includes("kangen rumah") || text.includes("homesick") || text.includes("rumah") || text.includes("ibu") || text.includes("ayah")) {
        return `Peluk hangat dulu ya buat kamu 🥺 ${sapaan}kangen rumah itu manusiawi banget kok, apalagi pas di asrama. Nggak berarti kamu lemah—justru karena rumah punya tempat hangat di hatimu. Coba tarik napas pelan, bayangin satu hal kecil yang bikin kamu senyum kalau ingat rumah. Kamu nggak sendirian di sini ya 🤍`;
    }

    if (text.includes("capek") || text.includes("lelah") || text.includes("tugas") || text.includes("belajar") || text.includes("ujian") || text.includes("pusing")) {
        return `Wajar banget kalau kepalamu penuh dan ngerasa capek ${sapaan}📚 Kamu udah berusaha jalanin hari ini, dan tubuhmu juga berhak rehat sebentar. Nggak harus selesai semua sekaligus malam ini. Coba minum air putih dulu, rebahan 5 menit, atau main game gelembung di bawah biar kepalanya agak lega 🌱`;
    }

    if (text.includes("overthinking") || text.includes("takut") || text.includes("cemas") || text.includes("khawatir") || text.includes("gelisah") || text.includes("malam")) {
        return `Sini, duduk santai dulu ya ${sapaan}🌙 Pikiran yang muter-muter sering bikin hal kecil kelihatan besar. Kamu nggak harus nemuin semua jawaban detik ini juga. Yuk coba fitur Awan Napas Lembut di bagian game penenang biar detak dan pikiranmu pelan-pelan melambat 🫧`;
    }

    if (text.includes("teman") || text.includes("kamar") || text.includes("sendiri") || text.includes("sepi") || text.includes("canggung")) {
        return `Aku ngerti kok rasanya ngerasa canggung atau sepi di lingkungan asrama 🤝 Setiap orang punya ritme adaptasi masing-masing, dan kamu nggak perlu maksa buat langsung nyambung sama semua orang. Perasaanmu valid banget. Kalau mau cerita lebih panjang, aku siap dengerin terus 🌷`;
    }

    if (text.includes("pede") || text.includes("kurang baik") || text.includes("minder") || text.includes("gagal") || text.includes("nyalahin")) {
        return `Stop nyalahin diri sendiri dulu ya ${sapaan}🤍 Nilai atau pencapaian sesaat nggak ngurangin nilai dirimu sebagai manusia. Kamu udah bertahan sampai titik ini aja udah patut dihargai. Pelan-pelan aja, satu langkah kecil setiap hari sudah cukup banget ✨`;
    }

    const generalSoothingReplies = [
        `Aku dengerin kamu kok ${sapaan}🧸 Terima kasih ya udah mau cerita. Apa pun yang lagi kamu rasain sekarang, perasaanmu valid dan nggak ada yang berhak ngehukum kamu karena ngerasa begitu. Mau cerita bagian mana lagi yang paling bikin mengganjal?`,
        `Peluk jauh buat kamu ya 🤍 ${sapaan}nggak apa-apa kalau hari ini rasanya belum sempurna. Tarik napas pelan-pelan... aku di sini nemenin kamu ngobrol santai tanpa buru-buru. Kamu juga bisa coba pecahin gelembung penenang kalau mau refreshing sebentar 🫧`,
        `Kadang cuma didengerin aja udah bikin dada agak longgar ya ${sapaan}🌷 Aku di sini sebagai teman yang selalu pengen lihat kamu lebih tenang. Ceritain aja pelan-pelan sesuai nyamanmu.`
    ];

    return generalSoothingReplies[Math.floor(Math.random() * generalSoothingReplies.length)];
}

function sendChatMessage(text) {
    const cleanText = text.trim();
    if (!cleanText) return;

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    chatHistory.push({
        sender: "user",
        text: cleanText,
        time: nowTime
    });
    saveChat();
    renderChat();

    showTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator();
        const replyTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const replyText = generateSoothingFriendReply(cleanText);
        chatHistory.push({
            sender: "bot",
            text: replyText,
            time: replyTime
        });
        saveChat();
        renderChat();
    }, 550);
}

function sendQuickChat(presetText) {
    const section = document.getElementById('ngobrol-teman');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
    sendChatMessage(presetText);
}

function resetChat() {
    chatHistory = [...initialChatMessages];
    saveChat();
    renderChat();
    showToast('🔄 Obrolan baru dimulai dengan Milo!');
}

const chatFormEl = document.getElementById('chatForm');
if (chatFormEl) {
    chatFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        if (!input) return;
        sendChatMessage(input.value);
        input.value = '';
    });
}

// ================= GAME PENENANG & REFRESHING =================
function switchGame(gameName) {
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.game === gameName);
    });
    document.querySelectorAll('.game-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const activePanel = document.getElementById(`panel-${gameName}`);
    if (activePanel) activePanel.classList.add('active');
}

const soothingAffirmations = [
    "🫧 \"Nggak apa-apa pelan-pelan, yang penting kamu tetap melangkah.\"",
    "🌷 \"Perasaanmu valid. Kamu nggak harus selalu kuat sepanjang waktu.\"",
    "☁️ \"Lepaskan hal-hal yang nggak bisa kamu kontrol malam ini.\"",
    "🧸 \"Kamu udah berjuang cukup keras hari ini. Boleh istirahat sebentar.\"",
    "🌈 \"Besok selalu punya kesempatan baru buat mulai lagi dengan tenang.\"",
    "🤍 \"Ada banyak hal baik tentang dirimu yang sering kamu lupain.\""
];

const bubbleColors = ["#bae6fd", "#fbcfe8", "#ddd6fe", "#bbf7d0", "#fef08a"];
let bubbleScore = 0;

function spawnBubbleBatch() {
    const arena = document.getElementById('bubbleArena');
    if (!arena) return;
    arena.innerHTML = '';

    for (let i = 0; i < 6; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'calm-bubble';
        btn.style.background = bubbleColors[i % bubbleColors.length];
        btn.innerHTML = `<span>🫧</span><small>Klik</small>`;
        btn.onclick = () => {
            bubbleScore += 1;
            const scoreEl = document.getElementById('bubbleScore');
            if (scoreEl) scoreEl.textContent = bubbleScore;
            const quote = soothingAffirmations[(bubbleScore - 1) % soothingAffirmations.length];
            const affEl = document.getElementById('affirmationDisplay');
            if (affEl) affEl.textContent = quote;
            btn.style.transform = 'scale(1.25)';
            btn.style.opacity = '0';
            setTimeout(() => {
                btn.remove();
                if (arena.children.length === 0) {
                    spawnBubbleBatch();
                }
            }, 220);
        };
        arena.appendChild(btn);
    }
}

const flowerEmojis = ["🌸", "🌼", "🌻", "🌷", "🌺", "🪷"];
const gardenNotes = [
    "🌱 Satu benih tenang ditanam. Tarik napas pelan ya...",
    "🌸 Bunga mekar! Pikiranmu pelan-pelan jadi lebih teduh.",
    "🌷 Hebat! Kamu lagi ngasih jeda damai buat dirimu sendiri.",
    "🌻 Taman makin cerah—sama seperti harapanmu pelan-pelan tumbuh."
];
let bloomedPlots = new Array(12).fill(false);

function renderGarden() {
    const grid = document.getElementById('gardenGrid');
    if (!grid) return;

    const count = bloomedPlots.filter(Boolean).length;
    const countEl = document.getElementById('flowerCount');
    if (countEl) countEl.textContent = count;

    grid.innerHTML = bloomedPlots.map((isBloomed, idx) => {
        const icon = isBloomed ? flowerEmojis[idx % flowerEmojis.length] : "🌱";
        const label = isBloomed ? "Mekar" : "Tanam";
        return `
            <button type="button" class="garden-plot ${isBloomed ? 'bloomed' : ''}" onclick="bloomPlot(${idx})">
                <span>${icon}</span>
                <small>${label}</small>
            </button>
        `;
    }).join('');
}

function bloomPlot(idx) {
    if (!bloomedPlots[idx]) {
        bloomedPlots[idx] = true;
        const count = bloomedPlots.filter(Boolean).length;
        const msgEl = document.getElementById('gardenMessage');
        if (msgEl) msgEl.textContent = gardenNotes[count % gardenNotes.length];
        renderGarden();
    }
}

function resetGarden() {
    bloomedPlots = new Array(12).fill(false);
    const msgEl = document.getElementById('gardenMessage');
    if (msgEl) {
        msgEl.textContent = "🌿 Taman disiapkan ulang. Klik petak mana saja untuk menanam bunga penenang.";
    }
    renderGarden();
}

let breathInterval = null;
let isBreathing = false;
let breathCycles = 0;

function toggleBreathing() {
    const btn = document.getElementById('breathToggleBtn');
    if (!btn) return;

    if (isBreathing) {
        clearInterval(breathInterval);
        isBreathing = false;
        btn.textContent = "▶️ Mulai Napas Tenang";
        document.getElementById('breathPhase').textContent = "Siap";
        document.getElementById('breathTimer').textContent = "4s";
        document.getElementById('breathCircle').classList.remove('expand');
        document.getElementById('breathGuide').textContent = "Napas dijeda. Kapan pun siap, kamu bisa mulai lagi.";
        return;
    }

    isBreathing = true;
    btn.textContent = "⏹️ Berhenti";
    runBreathPhase(0, 4);
}

function runBreathPhase(phaseIndex, secondsLeft) {
    if (!isBreathing) return;

    const phases = [
        { name: "Tarik Napas", guide: "Tarik napas pelan lewat hidung... biarkan bahu turun.", expand: true },
        { name: "Tahan Lembut", guide: "Tahan sebentar dengan santai, tanpa tegang ya.", expand: true },
        { name: "Hembuskan", guide: "Hembuskan perlahan lewat mulut... lepaskan beban pelan-pelan.", expand: false }
    ];

    const current = phases[phaseIndex];
    document.getElementById('breathPhase').textContent = current.name;
    document.getElementById('breathGuide').textContent = current.guide;
    document.getElementById('breathTimer').textContent = `${secondsLeft}s`;
    document.getElementById('breathCircle').classList.toggle('expand', current.expand);

    clearInterval(breathInterval);
    let rem = secondsLeft;

    breathInterval = setInterval(() => {
        if (!isBreathing) {
            clearInterval(breathInterval);
            return;
        }
        rem -= 1;
        if (rem > 0) {
            document.getElementById('breathTimer').textContent = `${rem}s`;
        } else {
            clearInterval(breathInterval);
            const nextIndex = (phaseIndex + 1) % phases.length;
            if (nextIndex === 0) {
                breathCycles += 1;
                document.getElementById('breathCycles').textContent = breathCycles;
            }
            runBreathPhase(nextIndex, 4);
        }
    }, 1000);
}

// ================= LOGIN & DAFTAR AKUN =================
function getRegisteredUsers() {
    const parsed = safeJSONParse(safeGetItem('pelukkata_users'), defaultUsers);
    if (!Array.isArray(parsed) || parsed.length === 0) {
        return [...defaultUsers];
    }
    return parsed;
}

function fillDemoLogin() {
    const idInput = document.getElementById('loginIdentifier');
    const pwInput = document.getElementById('loginPassword');
    if (idInput) idInput.value = "naura@asrama.id";
    if (pwInput) pwInput.value = "123456";
    showToast('⚡ Data akun contoh Naura sudah terisi. Klik Masuk Sekarang!');
}

function updateAuthUI() {
    const authArea = document.getElementById('authArea');
    if (!authArea) return;

    if (currentUser && currentUser.name) {
        authArea.innerHTML = `
            <div class="user-pill">
                <span>${escapeHTML(currentUser.avatar || '🧸')} Hai, ${escapeHTML(currentUser.name)}</span>
                <button type="button" class="logout-mini-btn" onclick="logoutUser()">Keluar</button>
            </div>
        `;
    } else {
        authArea.innerHTML = `
            <button type="button" class="btn btn-outline-primary" onclick="openAuthModal('login')">
                <i data-lucide="log-in"></i> <span>Masuk / Daftar</span>
            </button>
        `;
        renderIconsSafely();
    }
}

function openAuthModal(tab = 'login') {
    closeAllModals();
    switchAuthTab(tab);
    const modal = document.getElementById('authModal');
    const overlay = document.getElementById('overlay');
    if (modal) modal.classList.add('open');
    if (overlay) overlay.classList.add('active');
    renderIconsSafely();
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    if (tab === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabRegister) tabRegister.classList.add('active');
    }
}

const loginFormEl = document.getElementById('loginForm');
if (loginFormEl) {
    loginFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const identifierInput = document.getElementById('loginIdentifier');
        const passwordInput = document.getElementById('loginPassword');
        const identifier = (identifierInput ? identifierInput.value : '').trim().toLowerCase();
        const password = passwordInput ? passwordInput.value : '';

        if (!identifier || !password) {
            showToast('⚠️ Isi email/nama panggilan dan kata sandi dulu ya.');
            return;
        }

        const users = getRegisteredUsers();
        const foundUser = users.find(u =>
            ((u.email && u.email.toLowerCase() === identifier) ||
             (u.name && u.name.toLowerCase() === identifier)) &&
            u.password === password
        );

        if (!foundUser) {
            showToast('❌ Email/nama atau kata sandi belum sesuai! Coba akun contoh: naura@asrama.id / 123456');
            return;
        }

        currentUser = foundUser;
        safeSetItem('pelukkata_current_user', JSON.stringify(currentUser));
        updateAuthUI();
        renderChat();
        closeAllModals();
        showToast(`🌈 Selamat datang kembali, ${currentUser.name}!`);
    });
}

const registerFormEl = document.getElementById('registerForm');
if (registerFormEl) {
    registerFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = (document.getElementById('regName')?.value || '').trim();
        const email = (document.getElementById('regEmail')?.value || '').trim().toLowerCase();
        const dorm = (document.getElementById('regDorm')?.value || '').trim();
        const avatar = document.getElementById('regAvatar')?.value || '🐻';
        const password = document.getElementById('regPassword')?.value || '';

        if (!name || !email || password.length < 6) {
            showToast('⚠️ Lengkapi nama, email, dan kata sandi minimal 6 karakter.');
            return;
        }

        const users = getRegisteredUsers();
        if (users.some(u => u.email && u.email.toLowerCase() === email)) {
            showToast('⚠️ Email ini sudah terdaftar. Silakan masuk!');
            switchAuthTab('login');
            return;
        }

        const newUser = { name, email, dorm, avatar, password };
        users.push(newUser);
        safeSetItem('pelukkata_users', JSON.stringify(users));

        currentUser = newUser;
        safeSetItem('pelukkata_current_user', JSON.stringify(currentUser));
        updateAuthUI();
        renderChat();
        registerFormEl.reset();
        closeAllModals();
        showToast(`🎉 Akun berhasil dibuat! Halo, ${name}!`);
    });
}

function logoutUser() {
    currentUser = null;
    safeRemoveItem('pelukkata_current_user');
    updateAuthUI();
    renderChat();
    showToast('👋 Kamu sudah keluar dari akun.');
}

// ================= DINDING CERITA & NASIHAT =================
function saveStories() {
    safeSetItem('pelukkata_stories', JSON.stringify(stories));
}

function renderStories() {
    const grid = document.getElementById('storiesGrid');
    if (!grid) return;

    let filtered = stories.filter(s => {
        const matchCat = currentCategory === 'all' || s.category === currentCategory;
        const q = searchQuery.toLowerCase();
        const matchSearch = (s.content || '').toLowerCase().includes(q) ||
                            (s.alias || '').toLowerCase().includes(q) ||
                            (s.mood || '').toLowerCase().includes(q);
        return matchCat && matchSearch;
    });

    if (sortOrder === 'most-hugged') {
        filtered.sort((a, b) => (b.hugs || 0) - (a.hugs || 0));
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 50px 20px; background: white; border-radius: 24px; border: 2px dashed #f3e4ec;">
            <div style="font-size: 3rem; margin-bottom: 10px;">🧸</div>
            <p style="color: #6c667a;">Belum ada cerita di kategori atau pencarian ini. Yuk jadi yang pertama berbagi cerita!</p>
        </div>`;
        return;
    }

    grid.innerHTML = filtered.map(story => {
        const isHugged = huggedIds.includes(story.id);
        return `
            <article class="story-card">
                <div class="story-top">
                    <div class="author-box">
                        <div class="avatar-circle" style="background-color: ${story.avatarBg || '#fef3c7'}">
                            ${escapeHTML(story.avatar || '🐻')}
                        </div>
                        <div class="author-meta">
                            <h4>${escapeHTML(story.alias || 'Anonim')}</h4>
                            <span>${escapeHTML(story.time || 'Baru saja')}</span>
                        </div>
                    </div>
                    <span class="cat-badge cat-${story.category}">${escapeHTML(story.categoryLabel)}</span>
                </div>

                <span class="mood-pill">${escapeHTML(story.mood)}</span>
                <p class="story-body">${escapeHTML(story.content)}</p>

                <div class="story-footer">
                    <button type="button" class="hug-btn ${isHugged ? 'hugged' : ''}" onclick="toggleHug(${story.id})">
                        🤗 Peluk (${story.hugs || 0})
                    </button>
                    <button type="button" class="reply-btn" onclick="openAdviceModal(${story.id})">
                        💌 ${(story.advices || []).length} Nasihat
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

function toggleHug(id) {
    const story = stories.find(s => s.id === id);
    if (!story) return;

    if (huggedIds.includes(id)) {
        huggedIds = huggedIds.filter(item => item !== id);
        story.hugs = Math.max(0, (story.hugs || 0) - 1);
    } else {
        huggedIds.push(id);
        story.hugs = (story.hugs || 0) + 1;
        showToast('🤗 Pelukan virtual terkirim untuk pencerita!');
    }

    safeSetItem('pelukkata_hugs', JSON.stringify(huggedIds));
    saveStories();
    renderStories();
}

function openStoryModal(prefillMood = '') {
    closeAllModals();
    if (prefillMood) {
        const moodInput = document.getElementById('storyMood');
        if (moodInput) moodInput.value = prefillMood;
    }
    if (currentUser) {
        const aliasInput = document.getElementById('authorAlias');
        const avatarSelect = document.getElementById('authorAvatar');
        if (aliasInput) aliasInput.value = currentUser.name;
        if (avatarSelect) avatarSelect.value = currentUser.avatar || '🐻';
    }
    const modal = document.getElementById('storyModal');
    const overlay = document.getElementById('overlay');
    if (modal) modal.classList.add('open');
    if (overlay) overlay.classList.add('active');
    renderIconsSafely();
}

const storyFormEl = document.getElementById('storyForm');
if (storyFormEl) {
    storyFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const isAnon = document.getElementById('postAnonymously')?.checked || false;
        const aliasInput = (document.getElementById('authorAlias')?.value || '').trim();
        const avatar = document.getElementById('authorAvatar')?.value || '🐻';
        const category = document.getElementById('storyCategory')?.value || 'homesick';
        const mood = (document.getElementById('storyMood')?.value || '').trim() || '🥺 Lagi Butuh Teman';
        const content = (document.getElementById('storyContent')?.value || '').trim();

        if (!content) {
            showToast('⚠️ Tulis dulu isi ceritamu ya.');
            return;
        }

        const categoryMap = {
            homesick: { label: "🏡 Rindu Rumah", bg: "#fef3c7" },
            akademik: { label: "📚 Tekanan Belajar", bg: "#e0f2fe" },
            pertemanan: { label: "🤝 Pertemanan", bg: "#d8f8e8" },
            selflove: { label: "🌷 Pengembangan Diri", bg: "#ede9fe" }
        };

        const displayAlias = isAnon
            ? "Anonim"
            : (aliasInput || (currentUser ? currentUser.name : "Penghuni Asrama"));

        const newStory = {
            id: Date.now(),
            alias: displayAlias,
            avatar: avatar,
            avatarBg: (categoryMap[category] || categoryMap.homesick).bg,
            category: category,
            categoryLabel: (categoryMap[category] || categoryMap.homesick).label,
            mood: mood,
            time: "Baru saja",
            content: content,
            hugs: 1,
            advices: []
        };

        stories.unshift(newStory);
        saveStories();
        renderStories();
        storyFormEl.reset();
        closeAllModals();
        showToast('✨ Ceritamu berhasil diposting dengan aman!');
    });
}

function openAdviceModal(id) {
    closeAllModals();
    activeStoryId = id;
    const story = stories.find(s => s.id === id);
    if (!story) return;

    const advisorInput = document.getElementById('advisorName');
    if (currentUser && advisorInput && !advisorInput.value) {
        advisorInput.value = currentUser.name;
    }

    const detailEl = document.getElementById('selectedStoryDetail');
    if (detailEl) {
        detailEl.innerHTML = `
            <div class="selected-story-box">
                <div class="story-top">
                    <div class="author-box">
                        <div class="avatar-circle" style="background-color: ${story.avatarBg || '#fef3c7'}">${escapeHTML(story.avatar || '🐻')}</div>
                        <div class="author-meta">
                            <h4>${escapeHTML(story.alias)}</h4>
                            <span>${escapeHTML(story.time)} • ${escapeHTML(story.categoryLabel)}</span>
                        </div>
                    </div>
                    <span class="mood-pill" style="margin-bottom:0;">${escapeHTML(story.mood)}</span>
                </div>
                <p style="margin-top: 10px; font-size: 0.96rem; white-space: pre-line;">${escapeHTML(story.content)}</p>
            </div>
        `;
    }

    renderAdviceList(story);
    const modal = document.getElementById('adviceModal');
    const overlay = document.getElementById('overlay');
    if (modal) modal.classList.add('open');
    if (overlay) overlay.classList.add('active');
    renderIconsSafely();
}

function renderAdviceList(story) {
    const advices = story.advices || [];
    const countEl = document.getElementById('adviceCount');
    const listEl = document.getElementById('adviceList');
    if (countEl) countEl.textContent = advices.length;
    if (!listEl) return;

    if (advices.length === 0) {
        listEl.innerHTML = `<p style="text-align:center; color:#6c667a; font-size:0.88rem; padding:16px;">Belum ada balasan. Jadilah teman pertama yang memberi dukungan hangat! 🤍</p>`;
        return;
    }

    listEl.innerHTML = advices.map(adv => `
        <div class="advice-item">
            <div class="advice-item-head">
                <strong>🌷 ${escapeHTML(adv.advisor)}</strong>
                <span>${escapeHTML(adv.time)}</span>
            </div>
            <p>${escapeHTML(adv.text)}</p>
        </div>
    `).join('');
}

function insertTemplate(text) {
    const textarea = document.getElementById('adviceText');
    if (!textarea) return;
    textarea.value = text;
    textarea.focus();
}

const adviceFormEl = document.getElementById('adviceForm');
if (adviceFormEl) {
    adviceFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const story = stories.find(s => s.id === activeStoryId);
        if (!story) return;

        const advisor = (document.getElementById('advisorName')?.value || '').trim() ||
                        (currentUser ? currentUser.name : "Teman Asrama Baik");
        const text = (document.getElementById('adviceText')?.value || '').trim();

        if (!text) {
            showToast('⚠️ Tulis dukungan hangatnya dulu ya.');
            return;
        }

        const lowerText = text.toLowerCase();
        const foundBadWord = judgmentalWords.find(word => lowerText.includes(word));

        if (foundBadWord) {
            showToast(`🛡️ Yuk perhalus bahasamu! Hindari kata "${foundBadWord}" agar tetap suportif.`);
            return;
        }

        story.advices = story.advices || [];
        story.advices.unshift({
            advisor: advisor,
            time: "Baru saja",
            text: text
        });

        saveStories();
        renderAdviceList(story);
        renderStories();
        adviceFormEl.reset();
        showToast('💌 Nasihat hangatmu telah terkirim!');
    });
}

function openGuidelinesModal() {
    closeAllModals();
    const modal = document.getElementById('guidelinesModal');
    const overlay = document.getElementById('overlay');
    if (modal) modal.classList.add('open');
    if (overlay) overlay.classList.add('active');
    renderIconsSafely();
}

function closeAllModals() {
    ['authModal', 'storyModal', 'adviceModal', 'guidelinesModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('open');
    });
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('active');
}

document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category || 'all';
        renderStories();
    });
});

const searchInputEl = document.getElementById('searchInput');
if (searchInputEl) {
    searchInputEl.addEventListener('input', (e) => {
        searchQuery = e.target.value || '';
        renderStories();
    });
}

const sortSelectEl = document.getElementById('sortSelect');
if (sortSelectEl) {
    sortSelectEl.addEventListener('change', (e) => {
        sortOrder = e.target.value || 'newest';
        renderStories();
    });
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function initApp() {
    renderIconsSafely();
    updateAuthUI();
    renderChat();
    spawnBubbleBatch();
    renderGarden();
    renderStories();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
