let bjpPromises = [];
let aitmcPromises = [];
let config = null;

async function init() {
    try {
        const configRes = await fetch('config.json');
        config = await configRes.json();

        const bjpRes = await fetch('promises.json');
        bjpPromises = await bjpRes.json();

        const aitmcRes = await fetch('aitmc_promises.json');
        aitmcPromises = await aitmcRes.json();

        setupTabs();
        
        if (config.startDate) {
            document.getElementById('global-status').textContent = "Tracking Active";
            document.getElementById('global-status').style.background = "#138808";
            document.getElementById('bjp-stats').classList.remove('hidden');
            updateStats();
        } else {
            document.getElementById('global-status').textContent = "Not Yet Started";
        }

        renderBJP('all');
        renderAITMC();
    } catch (err) {
        console.error('Initialization error:', err);
    }
}

function setupTabs() {
    document.querySelectorAll('.party-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const party = e.target.dataset.party;
            document.querySelectorAll('.party-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            document.querySelectorAll('.party-section').forEach(s => s.classList.add('hidden'));
            document.getElementById(`${party}-section`).classList.remove('hidden');
        });
    });
}

function updateStats() {
    const start = new Date(config.startDate);
    const now = new Date();
    const diffDays = Math.floor(Math.abs(now - start) / (1000 * 60 * 60 * 24));
    
    let completedCount = 0;
    Object.values(config.completedDates).forEach(val => { if(val) completedCount++; });

    document.getElementById('days-elapsed').textContent = diffDays;
    document.getElementById('promises-done').textContent = completedCount;
    document.getElementById('display-start-date').textContent = start.toLocaleDateString();
}

function renderBJP(category) {
    const container = document.getElementById('bjp-promises-container');
    container.innerHTML = '';
    const filtered = category === 'all' ? bjpPromises : bjpPromises.filter(p => p.category === category);
    
    filtered.forEach(p => {
        const card = createPromiseCard(p);
        container.appendChild(card);
    });
}

function createPromiseCard(p) {
    const card = document.createElement('div');
    card.className = 'promise-card';
    
    const completionDateStr = config.completedDates[p.id];
    const startDate = config.startDate ? new Date(config.startDate) : null;
    
    let statusHTML = '';
    let statusClass = '';

    if (!startDate) {
        statusHTML = '<span class="status-label">NOT STARTED</span>';
        statusClass = 'not-started';
    } else if (completionDateStr) {
        // COMPLETED CASE
        const completed = new Date(completionDateStr);
        const deadline = new Date(startDate.getTime() + (p.days * 24 * 60 * 60 * 1000));
        const daysToComplete = Math.floor((completed - startDate) / (1000 * 60 * 60 * 24));
        
        if (completed <= deadline) {
            statusHTML = `<span class="status-label success">COMPLETED EARLY/ON-TIME</span>
                          <p class="status-desc">Fulfilled in ${daysToComplete} days (Target: ${p.days} days)</p>`;
            statusClass = 'completed-success';
        } else {
            const delay = daysToComplete - p.days;
            statusHTML = `<span class="status-label warning">COMPLETED LATE</span>
                          <p class="status-desc">Fulfilled in ${daysToComplete} days (${delay} days delay)</p>`;
            statusClass = 'completed-late';
        }
    } else {
        // IN PROGRESS CASE
        const now = new Date();
        const deadline = new Date(startDate.getTime() + (p.days * 24 * 60 * 60 * 1000));
        const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        const remaining = p.days - diffDays;
        const progress = Math.min(100, Math.max(0, (diffDays / p.days) * 100));

        if (remaining >= 0) {
            statusHTML = `
                <div class="progress-container"><div class="progress-bar" style="width: ${progress}%"></div></div>
                <div class="progress-label"><span>${Math.round(progress)}% progress</span><span>${remaining} days left</span></div>
            `;
            statusClass = remaining < 30 ? 'urgent' : 'in-progress';
        } else {
            statusHTML = `<span class="status-label danger">OVERDUE</span>
                          <p class="status-desc">${Math.abs(remaining)} days past deadline</p>`;
            statusClass = 'overdue';
        }
    }

    card.classList.add(statusClass);
    card.innerHTML = `
        <div class="card-header">
            <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="promise-id-badge">${p.id}</span>
                    <span class="category-tag">${p.category}</span>
                </div>
                <h3 class="promise-title">${p.title}</h3>
            </div>
            <span class="timeline-badge">${p.timeline_text}</span>
        </div>
        <p class="promise-desc">${p.desc}</p>
        <div class="status-area">${statusHTML}</div>
    `;
    return card;
}

function renderAITMC() {
    const container = document.getElementById('aitmc-promises-container');
    container.innerHTML = '';
    aitmcPromises.forEach(p => {
        const card = document.createElement('div');
        card.className = 'promise-card aitmc-card';
        card.innerHTML = `
            <div class="card-header">
                <div><span class="category-tag">${p.category}</span><h3 class="promise-title">${p.title}</h3></div>
                <span class="timeline-badge">${p.timeline_text}</span>
            </div>
            <p class="promise-desc">${p.desc}</p>
        `;
        container.appendChild(card);
    });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderBJP(e.target.dataset.category);
    });
});

init();
