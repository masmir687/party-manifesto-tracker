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
    
    const renderedGroups = new Set();

    filtered.forEach(p => {
        if (p.parentId) {
            if (!renderedGroups.has(p.parentId)) {
                // Create Big Group Card
                const groupCard = createBigGroupCard(p.parentId, filtered);
                container.appendChild(groupCard);
                renderedGroups.add(p.parentId);
            }
        } else {
            // Render standalone promise
            container.appendChild(createPromiseCard(p));
        }
    });
}

function createBigGroupCard(parentId, allPromises) {
    const groupCard = document.createElement('div');
    groupCard.className = 'big-group-card';
    
    const subPromises = allPromises.filter(p => p.parentId === parentId);
    
    // Group Status Calculation
    let completedCount = 0;
    subPromises.forEach(p => { if (config.completedDates[p.id]) completedCount++; });
    
    const total = subPromises.length;
    const halfStep = Math.ceil(total / 2);
    let halfFilled = '';
    let fullFilled = '';
    if (completedCount >= halfStep) halfFilled = 'filled';
    else if (completedCount > 0) halfFilled = 'active';
    if (completedCount === total) fullFilled = 'filled';

    groupCard.innerHTML = `
        <div class="group-header">
            <span class="promise-id-badge">${parentId}</span>
            <h2 class="group-title">Combined Promise Group</h2>
            <div class="viz-steps">
                <div class="step filled">0</div>
                <div class="step ${halfFilled}">50%</div>
                <div class="step ${fullFilled}">100%</div>
            </div>
        </div>
        <div class="group-children"></div>
    `;

    const childrenContainer = groupCard.querySelector('.group-children');
    subPromises.forEach(p => {
        childrenContainer.appendChild(createPromiseCard(p));
    });

    return groupCard;
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
        const completed = new Date(completionDateStr);
        const deadline = new Date(startDate.getTime() + (p.days * 24 * 60 * 60 * 1000));
        const daysToComplete = Math.floor((completed - startDate) / (1000 * 60 * 60 * 24));
        if (completed <= deadline) {
            statusHTML = `<span class="status-label success">COMPLETED</span><p class="status-desc">Took ${daysToComplete} days</p>`;
            statusClass = 'completed-success';
        } else {
            const delay = daysToComplete - p.days;
            statusHTML = `<span class="status-label warning">LATE</span><p class="status-desc">${delay} days delay</p>`;
            statusClass = 'completed-late';
        }
    } else {
        const now = new Date();
        const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        const remaining = p.days - diffDays;
        const progress = Math.min(100, Math.max(0, (diffDays / p.days) * 100));
        if (remaining >= 0) {
            statusHTML = `<div class="progress-container"><div class="progress-bar" style="width: ${progress}%"></div></div><div class="progress-label"><span>${Math.round(progress)}%</span><span>${remaining}d left</span></div>`;
            statusClass = remaining < 30 ? 'urgent' : 'in-progress';
        } else {
            statusHTML = `<span class="status-label danger">OVERDUE</span><p class="status-desc">${Math.abs(remaining)}d late</p>`;
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
                <h3 class="promise-title" style="font-size: 1.05rem;">${p.title}</h3>
            </div>
            <span class="timeline-badge">${p.timeline_text}</span>
        </div>
        <p class="promise-desc" style="font-size: 0.85rem;">${p.desc}</p>
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
