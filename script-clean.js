// V-ICAL Clean Version - Script
// Light and clean design with subtle animations

// ============= Task Data =============
// TASK_DATA is exported from repository records in assets/data/cases.js.

// ============= Player State =============
let currentTask = null;
let currentFrame = 0;
let isPlaying = false;
let playInterval = null;

// ============= Initialize =============
document.addEventListener('DOMContentLoaded', () => {
    // Animated stats counter
    animateStats();

    const categorySelect = document.getElementById('caseCategory');
    [...new Set(Object.values(TASK_DATA).map(task => task.category))].sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.append(option);
    });
    document.getElementById('caseSearch').addEventListener('input', renderCases);
    categorySelect.addEventListener('change', renderCases);
    renderCases();

    // Speed selector
    const speedSelect = document.getElementById('speedSelect');
    if (speedSelect) {
        speedSelect.addEventListener('change', () => {
            if (isPlaying) {
                togglePlay();
                togglePlay();
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Smooth scroll for nav links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});

function renderCases() {
    closePlayer();
    const grid = document.getElementById('caseGrid');
    const query = document.getElementById('caseSearch').value.trim().toLowerCase();
    const category = document.getElementById('caseCategory').value;
    const entries = Object.entries(TASK_DATA).filter(([, task]) =>
        (!category || task.category === category) &&
        `${task.name} ${task.gameId} ${task.model}`.toLowerCase().includes(query));
    const showTaxiGuide = entries[0]?.[1].name === 'Taxi';
    document.getElementById('taxiGuide').hidden = !showTaxiGuide;
    grid.replaceChildren();
    for (const [id, task] of entries) {
        const card = document.createElement('button');
        card.className = 'task-card';
        card.type = 'button';
        card.dataset.task = id;
        card.setAttribute('aria-label', `${task.name} case`);
        card.setAttribute('aria-expanded', 'false');
        card.setAttribute('aria-controls', 'playerContainer');
        if (showTaxiGuide && task.name === 'Taxi') {
            card.setAttribute('aria-describedby', 'taxiGuideText');
        }
        const image = document.createElement('img');
        image.src = task.poster;
        image.alt = task.name;
        image.loading = 'lazy';
        image.decoding = 'async';
        const info = document.createElement('span');
        info.className = 'task-info';
        const title = document.createElement('span');
        title.className = 'task-name';
        title.textContent = task.name;
        const detail = document.createElement('span');
        detail.className = 'task-detail';
        detail.textContent = `${task.category} / ${task.steps} steps`;
        info.append(title, detail);
        card.append(image, info);
        card.addEventListener('click', () => openPlayer(id));
        grid.append(card);
    }
    document.getElementById('caseCount').textContent = `${entries.length} / ${Object.keys(TASK_DATA).length} games`;
    document.getElementById('caseEmpty').hidden = entries.length > 0;
}

// ============= Stats Animation =============
function animateStats() {
    const stats = document.querySelectorAll('.stat');

    stats.forEach((stat, index) => {
        const targetCount = parseInt(stat.getAttribute('data-count'));
        const duration = 2000;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOutQuad = t => t * (2 - t);
            const current = Math.floor(easeOutQuad(progress) * targetCount);

            const unit = stat.textContent.split(' ').slice(-1)[0];
            stat.textContent = `${current} ${unit}`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        // Stagger animation
        setTimeout(() => {
            animate();
        }, index * 200);
    });
}

// ============= Player Functions =============
function openPlayer(taskId) {
    const task = TASK_DATA[taskId];
    if (!task) return;

    closePlayer();

    currentTask = taskId;
    currentFrame = 0;

    // Update active card
    document.querySelectorAll('.task-card').forEach(card => {
        card.classList.remove('active');
        card.setAttribute('aria-expanded', 'false');
    });
    document.querySelector(`[data-task="${taskId}"]`).classList.add('active');
    document.querySelector(`[data-task="${taskId}"]`).setAttribute('aria-expanded', 'true');

    // Update model badge
    const modelBadge = document.getElementById('modelBadge');
    const modelName = document.getElementById('modelName');
    modelBadge.style.background = task.modelColor;
    modelName.textContent = task.model;

    // Update demo video
    const demo = document.getElementById('demoVideo');
    demo.pause();
    demo.poster = task.demoImage;
    demo.src = task.demoVideo;
    demo.load();
    document.getElementById('caseTitle').textContent = task.name + ' / ' + task.ending;
    document.getElementById('demoCaption').textContent = task.demoLabels.join(' · ');

    // Update rules
    document.getElementById('rulesText').textContent = task.rules;

    // Update player frame
    document.getElementById('playerFrame').src = task.frames[0];
    document.getElementById('playerFrame').alt = task.name + ' agent trajectory';
    const seek = document.getElementById('frameSeek');
    seek.max = task.steps;
    seek.value = 0;

    // Reset state
    updateFrameDisplay();

    // Expand player
    const playerContainer = document.getElementById('playerContainer');
    const cards = [...document.querySelectorAll('#caseGrid .task-card')];
    const selected = document.querySelector(`[data-task="${taskId}"]`);
    const rowTop = selected.offsetTop;
    const rowEnd = cards.filter(card => card.offsetTop === rowTop).at(-1);
    (rowEnd || selected).insertAdjacentElement('afterend', playerContainer);
    playerContainer.hidden = false;
    playerContainer.classList.add('active');

    // Smooth scroll
    playerContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closePlayer() {
    if (isPlaying) {
        togglePlay();
    }

    const playerContainer = document.getElementById('playerContainer');
    playerContainer.classList.remove('active');
    playerContainer.hidden = true;
    document.getElementById('demoVideo').pause();
    document.getElementById('caseGrid').insertAdjacentElement('afterend', playerContainer);

    document.querySelectorAll('.task-card').forEach(card => {
        card.classList.remove('active');
        card.setAttribute('aria-expanded', 'false');
    });

    currentTask = null;
}

function togglePlay() {
    if (!currentTask) return;

    if (!isPlaying) {
        const task = TASK_DATA[currentTask];
        if (currentFrame === task.frames.length - 1) {
            currentFrame = 0;
            updateFrameDisplay();
        }
        isPlaying = true;
        const playBtn = document.getElementById('playBtn');
        playBtn.textContent = '⏸ Pause';
        playBtn.classList.add('playing');

        const speed = parseFloat(document.getElementById('speedSelect').value);
        const interval = 1000 / speed;

        playInterval = setInterval(() => {
            nextFrame();
        }, interval);
    } else {
        stopPlayback();
    }
}

function stopPlayback() {
    isPlaying = false;
    clearInterval(playInterval);
    playInterval = null;
    const playBtn = document.getElementById('playBtn');
    playBtn.textContent = '▶ Play';
    playBtn.classList.remove('playing');
}

function nextFrame() {
    if (!currentTask) return;

    const task = TASK_DATA[currentTask];
    const maxFrames = task.frames.length;

    if (currentFrame < maxFrames - 1) {
        currentFrame++;
    }

    updateFrameDisplay();
    if (isPlaying && currentFrame === maxFrames - 1) {
        stopPlayback();
    }
}

function prevFrame() {
    if (!currentTask) return;

    const task = TASK_DATA[currentTask];
    const maxFrames = task.frames.length;

    if (currentFrame > 0) {
        currentFrame--;
    }

    updateFrameDisplay();
}

function updateFrameDisplay() {
    if (!currentTask) return;

    const task = TASK_DATA[currentTask];

    // Update frame image
    const playerFrame = document.getElementById('playerFrame');
    playerFrame.src = task.frames[currentFrame];
    document.getElementById('frameSeek').value = currentFrame;

    // Update frame counter
    document.getElementById('frameDisplay').textContent =
        `${currentFrame + 1}/${task.frames.length}`;

    // Update action
    const action = task.actions[currentFrame] || '-';
    document.getElementById('actionDisplay').textContent = action;

    const isFinalFrame = currentFrame === task.frames.length - 1;
    const resultOverlay = document.getElementById('resultOverlay');
    const passed = task.ending === 'victory';
    resultOverlay.hidden = !isFinalFrame;
    resultOverlay.classList.toggle('is-pass', passed);
    document.getElementById('resultPass').textContent = passed ? 'Yes' : 'No';
    document.getElementById('resultScore').textContent = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2
    }).format(task.reward);
}

function handleKeyboard(e) {
    if (!currentTask) return;
    if (e.target.closest('button, select, input, video, [role="button"]')) return;

    switch(e.key) {
        case 'Escape':
            closePlayer();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            prevFrame();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextFrame();
            break;
        case ' ':
            e.preventDefault();
            togglePlay();
            break;
    }
}

// ============= Intersection Observer for Fade-in =============
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.section').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    observer.observe(el);
});
