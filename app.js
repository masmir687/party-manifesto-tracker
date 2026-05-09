let bjpPromises = [];
let aitmcPromises = [];
let config = null;

// Mapping for Group Headings
const GROUP_METADATA = {
    "2": { title: "Salary & Pay Commission", timeline: "Within 45 Days" },
    "3": { title: "Employment & Youth Support", timeline: "5 Years" },
    "4": { title: "Women's Safety & Empowerment", timeline: "On forming government" },
    "8": { title: "Legal Reform & Border Security", timeline: "6 Months" },
    "9": { title: "Industrial Revival (Tea & Jute)", timeline: "5 Years" },
    "10": { title: "Healthcare Infrastructure", timeline: "5 Years" },
    "14": { title: "Cultural Heritage & Religious Law", timeline: "5 Years" }
};

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
            const start = new Date(config.startDate);
            const now = new Date();
            if (now < start) {
                document.getElementById('global-status').textContent = "Starting Soon";
                document.getElementById('global-status').style.background = "#2d3436";
            } else {
                document.getElementById('global-status').textContent = "Tracking Active";
                document.getElementById('global-status').style.background = "#138808";
            }
            document.getElementById('bjp-stats').classList.remove('hidden');
            updateStats();
        }
        renderBJP('all');
        renderSankalp();
        renderAITMC();
    } catch (err) {
        console.error('Initialization error:', err);
    }
}

function renderSankalp() {
    const container = document.getElementById('big-promises-container');
    container.innerHTML = '';
    // Display all BJP promises without group headers
    bjpPromises.forEach(p => {
        container.appendChild(createPromiseCard(p));
    });
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
    
    // Normalize to midnight for accurate day counting
    const startMidnight = new Date(start).setHours(0, 0, 0, 0);
    const nowMidnight = new Date(now).setHours(0, 0, 0, 0);
    const diffDays = Math.max(0, Math.floor((nowMidnight - startMidnight) / (1000 * 60 * 60 * 24)));
    
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
                container.appendChild(createBigGroupCard(p.parentId, filtered));
                renderedGroups.add(p.parentId);
            }
        } else {
            container.appendChild(createPromiseCard(p));
        }
    });
}

function createBigGroupCard(parentId, allPromises) {
    const groupCard = document.createElement('div');
    groupCard.className = 'big-group-card';
    const subPromises = allPromises.filter(p => p.parentId === parentId);
    const meta = GROUP_METADATA[parentId] || { title: `Group ${parentId}`, timeline: "TBD" };
    
    let completedCount = 0;
    subPromises.forEach(p => { if (config.completedDates[p.id]) completedCount++; });
    const total = subPromises.length;
    const halfStep = Math.ceil(total / 2);
    let halfFilled = (completedCount >= halfStep) ? 'filled' : (completedCount > 0 ? 'active' : '');
    let fullFilled = (completedCount === total) ? 'filled' : '';

    groupCard.innerHTML = `
        <div class="group-header">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 10px;">
                <span class="promise-id-badge" style="background: var(--bjp-primary)">${parentId}</span>
                <span class="timeline-badge" style="background: #2d3436; color: white;">Target: ${meta.timeline}</span>
            </div>
            <h2 class="group-title">${meta.title}</h2>
            <div class="viz-steps">
                <div class="step filled">0</div>
                <div class="step ${halfFilled}">50%</div>
                <div class="step ${fullFilled}">100%</div>
            </div>
        </div>
        <div class="group-children"></div>
    `;

    const childrenContainer = groupCard.querySelector('.group-children');
    subPromises.forEach(p => { childrenContainer.appendChild(createPromiseCard(p)); });
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
        // Normalize for completion calculations
        const startMid = new Date(startDate).setHours(0, 0, 0, 0);
        const compMid = new Date(completed).setHours(0, 0, 0, 0);
        
        const deadline = new Date(startMid + (p.days * 24 * 60 * 60 * 1000));
        const daysToComplete = Math.floor((compMid - startMid) / (1000 * 60 * 60 * 24));
        
        if (compMid <= deadline.getTime()) {
            statusHTML = `<span class="status-label success">COMPLETED</span><p class="status-desc">Took ${daysToComplete} days</p>`;
            statusClass = 'completed-success';
        } else {
            const delay = daysToComplete - p.days;
            statusHTML = `<span class="status-label warning">LATE</span><p class="status-desc">${delay} days delay</p>`;
            statusClass = 'completed-late';
        }
    } else {
        const now = new Date();
        const startMid = new Date(startDate).setHours(0, 0, 0, 0);
        const nowMid = new Date(now).setHours(0, 0, 0, 0);
        
        const diffDays = Math.max(0, Math.floor((nowMid - startMid) / (1000 * 60 * 60 * 24)));
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
