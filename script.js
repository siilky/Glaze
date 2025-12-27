document.addEventListener('DOMContentLoaded', () => {
    // Navigation Logic
    const tabs = document.querySelectorAll('.tab-btn');
    const views = document.querySelectorAll('.view');
    const headerTitle = document.getElementById('header-title');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all views
            views.forEach(v => v.classList.remove('active-view'));
            
            // Show target view
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active-view');

            // Update Header Title
            headerTitle.textContent = tab.getAttribute('data-title');
        });
    });

    // Ripple Effect Logic
    const tabbar = document.querySelector('.tabbar');
    if (tabbar) {
        tabbar.addEventListener('click', function(e) {
            const circle = document.createElement('span');
            const diameter = Math.max(this.clientWidth, this.clientHeight);
            const radius = diameter / 2;
            
            const rect = this.getBoundingClientRect();
            
            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - rect.left - radius}px`;
            circle.style.top = `${e.clientY - rect.top - radius}px`;
            circle.classList.add('ripple');
            
            const ripple = this.getElementsByClassName('ripple')[0];
            if (ripple) {
                ripple.remove();
            }
            
            this.appendChild(circle);
        });
    }

    // Dark Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
        });
    }

    // Mock Data Generation
    renderDialogs();
    renderCharacters();
});

function renderDialogs() {
    const list = document.getElementById('dialogs-list');
    if (!list) return;
    
    const mockData = [
        { name: "Aqua", msg: "Kazuma! Kazuma! Can I have some money?", time: "14:20", color: "#66ccff" },
        { name: "Megumin", msg: "Explosion magic is the only true magic.", time: "13:15", color: "#ff4444" },
        { name: "Darkness", msg: "Please hit me harder!", time: "Вчера", color: "#ffcc00" },
        { name: "Geralt", msg: "Hmm. Winds howling.", time: "Вчера", color: "#cccccc" },
        { name: "2B", msg: "Emotions are prohibited.", time: "10.05", color: "#333333" },
    ];

    mockData.forEach(chat => {
        const el = document.createElement('div');
        el.className = 'list-item';
        el.innerHTML = `
            <div class="avatar" style="background-color: ${chat.color}">${chat.name[0]}</div>
            <div class="item-content">
                <div class="item-header">
                    <span class="item-title">${chat.name}</span>
                    <span class="item-meta">${chat.time}</span>
                </div>
                <div class="item-subtitle">${chat.msg}</div>
            </div>
        `;
        list.appendChild(el);
    });
}

function renderCharacters() {
    const list = document.getElementById('characters-list');
    if (!list) return;

    const mockChars = [
        { name: "Aqua", desc: "Useless Goddess", color: "#66ccff" },
        { name: "Megumin", desc: "Archwizard of the Crimson Magic Clan", color: "#ff4444" },
        { name: "Darkness", desc: "Crusader with weird fetishes", color: "#ffcc00" },
        { name: "Geralt of Rivia", desc: "Witcher, monster slayer", color: "#cccccc" },
        { name: "2B", desc: "YoRHa No.2 Type B", color: "#333333" },
        { name: "Holo", desc: "The Wise Wolf", color: "#d2691e" },
        { name: "Makise Kurisu", desc: "Christina, Assistant", color: "#b22222" },
    ];

    mockChars.forEach(char => {
        const el = document.createElement('div');
        el.className = 'list-item';
        el.innerHTML = `
            <div class="avatar" style="background-color: ${char.color}">${char.name[0]}</div>
            <div class="item-content">
                <div class="item-header">
                    <span class="item-title">${char.name}</span>
                </div>
                <div class="item-subtitle">${char.desc}</div>
            </div>
        `;
        list.appendChild(el);
    });
}