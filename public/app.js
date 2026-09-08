// State Management
let state = {
    jobs: [],
    savedJobIds: JSON.parse(localStorage.getItem('saved_jobs_ids') || '[]'),
    rawHtmlSnippet: '',
    currentView: 'grid', // 'grid' | 'list'
    showingSavedOnly: false,
    badgeFilter: null // null | 'actively' | 'early'
};

// DOM Elements
const searchForm = document.getElementById('searchForm');
const keywordsInput = document.getElementById('keywordsInput');
const locationInput = document.getElementById('locationInput');
const workTypeSelect = document.getElementById('workTypeSelect');
const datePostedSelect = document.getElementById('datePostedSelect');
const expLevelSelect = document.getElementById('expLevelSelect');
const sortSelect = document.getElementById('sortSelect');
const liveFilterInput = document.getElementById('liveFilterInput');

const jobsContainer = document.getElementById('jobsContainer');
const resultsCount = document.getElementById('resultsCount');
const dataSourceBadge = document.getElementById('dataSourceBadge');
const savedCount = document.getElementById('savedCount');

const btnGridView = document.getElementById('btnGridView');
const btnListView = document.getElementById('btnListView');
const btnSavedJobs = document.getElementById('btnSavedJobs');
const btnInspectRaw = document.getElementById('btnInspectRaw');

const filterBadgeHiring = document.getElementById('filterBadgeHiring');
const filterBadgeEarly = document.getElementById('filterBadgeEarly');

const rawModal = document.getElementById('rawModal');
const closeRawModal = document.getElementById('closeRawModal');
const rawCodeSnippet = document.getElementById('rawCodeSnippet');

const detailModal = document.getElementById('detailModal');
const closeDetailModal = document.getElementById('closeDetailModal');
const detailModalTitle = document.getElementById('detailModalTitle');
const detailModalBody = document.getElementById('detailModalBody');

// Update Saved Count UI
function updateSavedCountUI() {
    savedCount.textContent = state.savedJobIds.length;
}

// Fetch jobs from Express API Proxy
async function fetchJobs() {
    const keywords = keywordsInput.value.trim();
    const location = locationInput.value.trim();
    const f_WT = workTypeSelect.value;
    const f_TPR = datePostedSelect.value;
    const f_E = expLevelSelect.value;
    const sortBy = sortSelect.value;

    renderLoading();

    const queryParams = new URLSearchParams();
    if (keywords) queryParams.append('keywords', keywords);
    if (location) queryParams.append('location', location);
    if (f_WT) queryParams.append('f_WT', f_WT);
    if (f_TPR) queryParams.append('f_TPR', f_TPR);
    if (f_E) queryParams.append('f_E', f_E);
    if (sortBy) queryParams.append('sortBy', sortBy);

    try {
        const response = await fetch(`/api/jobs?${queryParams.toString()}`);
        const data = await response.json();

        if (data.success) {
            state.jobs = data.jobs;
            state.rawHtmlSnippet = data.rawHtmlSnippet || 'No raw snippet returned.';
            dataSourceBadge.textContent = data.source === 'live_linkedin_api' ? '⚡ Live LinkedIn Guest API' : '✨ Smart Customized Engine';
            renderJobs();
        } else {
            renderError('Failed to load customized job results.');
        }
    } catch (err) {
        console.error('Fetch error:', err);
        renderError('Unable to connect to job proxy server.');
    }
}

// Render Loading Skeleton
function renderLoading() {
    jobsContainer.innerHTML = `
        <div class="loading-spinner" style="grid-column: 1 / -1;">
            <div class="spinner"></div>
            <p>Fetching and parsing customized job postings...</p>
        </div>
    `;
}

// Render Error
function renderError(msg) {
    jobsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--accent-rose);">
            <i data-lucide="alert-triangle" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
            <h3>${msg}</h3>
            <p style="color: var(--text-muted); margin-top: 8px;">Please check your server connection and try again.</p>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

// Render Job Cards
function renderJobs() {
    let jobsToDisplay = [...state.jobs];

    // Filter Saved Only
    if (state.showingSavedOnly) {
        jobsToDisplay = jobsToDisplay.filter(j => state.savedJobIds.includes(j.id));
    }

    // Badge Filter
    if (state.badgeFilter === 'actively') {
        jobsToDisplay = jobsToDisplay.filter(j => j.badge.toLowerCase().includes('actively'));
    } else if (state.badgeFilter === 'early') {
        jobsToDisplay = jobsToDisplay.filter(j => j.badge.toLowerCase().includes('early'));
    }

    // Live Instant Search Filter
    const liveQuery = liveFilterInput.value.trim().toLowerCase();
    if (liveQuery) {
        jobsToDisplay = jobsToDisplay.filter(j => 
            j.title.toLowerCase().includes(liveQuery) ||
            j.company.toLowerCase().includes(liveQuery) ||
            j.location.toLowerCase().includes(liveQuery) ||
            j.tags.some(t => t.toLowerCase().includes(liveQuery))
        );
    }

    resultsCount.textContent = `Showing ${jobsToDisplay.length} Customized Job Posting${jobsToDisplay.length === 1 ? '' : 's'}`;

    if (jobsToDisplay.length === 0) {
        jobsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                <i data-lucide="search-x" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 1rem;"></i>
                <h3 style="font-size: 1.2rem; margin-bottom: 0.5rem;">No jobs matched your filter criteria</h3>
                <p style="color: var(--text-muted);">Try adjusting your keyword, location, or badge filters above.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    jobsContainer.innerHTML = jobsToDisplay.map(job => {
        const isBookmarked = state.savedJobIds.includes(job.id);
        const badgeClass = job.badge.toLowerCase().includes('actively') ? 'badge-hiring' : 'badge-early';

        return `
            <div class="job-card" data-id="${job.id}">
                <div>
                    <div class="job-header">
                        <img src="${job.companyLogo}" alt="${job.company}" class="company-logo" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=0a66c2&color=fff'">
                        <div class="job-info">
                            <h3 class="job-title">${job.title}</h3>
                            <div class="job-company">${job.company}</div>
                        </div>
                        <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${job.id}')" title="${isBookmarked ? 'Remove Bookmark' : 'Save Job'}">
                            <i data-lucide="bookmark" style="${isBookmarked ? 'fill: var(--accent-amber);' : ''}"></i>
                        </button>
                    </div>

                    ${job.badge ? `<span class="badge-pill ${badgeClass}">${job.badge}</span>` : ''}

                    <div class="job-details">
                        <div class="detail-item">
                            <i data-lucide="map-pin" style="width: 14px; height: 14px;"></i>
                            <span>${job.location}</span>
                        </div>
                        <div class="detail-item">
                            <i data-lucide="briefcase" style="width: 14px; height: 14px;"></i>
                            <span>${job.workType || 'On-site'}</span>
                        </div>
                        <div class="detail-item">
                            <i data-lucide="award" style="width: 14px; height: 14px;"></i>
                            <span>${job.experienceLevel || 'Mid-Senior'}</span>
                        </div>
                    </div>

                    <div class="job-tags">
                        ${job.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>

                <div class="job-footer">
                    <span class="posted-date">
                        <i data-lucide="clock" style="width: 13px; height: 13px; vertical-align: middle; margin-right: 4px;"></i>
                        ${job.postedTime}
                    </span>

                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" onclick="openJobDetail('${job.id}')" style="padding: 6px 12px; font-size: 0.8rem;">
                            View Details
                        </button>
                        <a href="${job.jobUrl}" target="_blank" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.8rem; text-decoration: none;">
                            Apply <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

// Toggle Saved Bookmark
function toggleBookmark(jobId) {
    if (state.savedJobIds.includes(jobId)) {
        state.savedJobIds = state.savedJobIds.filter(id => id !== jobId);
    } else {
        state.savedJobIds.push(jobId);
    }
    localStorage.setItem('saved_jobs_ids', JSON.stringify(state.savedJobIds));
    updateSavedCountUI();
    renderJobs();
}

// Open Detail Modal
function openJobDetail(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    detailModalTitle.textContent = job.title;
    detailModalBody.innerHTML = `
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 1.5rem;">
            <img src="${job.companyLogo}" style="width: 56px; height: 56px; border-radius: 12px; border: 1px solid var(--border-color);">
            <div>
                <h4 style="font-size: 1.1rem; color: var(--accent-cyan);">${job.company}</h4>
                <p style="color: var(--text-muted); font-size: 0.9rem;">${job.location} &bull; ${job.workType} &bull; ${job.experienceLevel || 'Mid-Senior'}</p>
            </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
            <h5 style="margin-bottom: 0.5rem; font-size: 0.95rem; color: var(--text-main);">Job Overview</h5>
            <p style="color: var(--text-muted); line-height: 1.6; font-size: 0.9rem;">${job.description}</p>
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="detailModal.classList.remove('active')">Close</button>
            <a href="${job.jobUrl}" target="_blank" class="btn btn-primary">
                Apply on LinkedIn <i data-lucide="external-link"></i>
            </a>
        </div>
    `;
    detailModal.classList.add('active');
    if (window.lucide) lucide.createIcons();
}

// Event Listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.showingSavedOnly = false;
    btnSavedJobs.classList.remove('btn-primary');
    btnSavedJobs.classList.add('btn-secondary');
    fetchJobs();
});

// Instant live filtering as user types
liveFilterInput.addEventListener('input', () => {
    renderJobs();
});

// Preset Chips Click
document.querySelectorAll('.chip[data-kw]').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip[data-kw]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        keywordsInput.value = chip.getAttribute('data-kw');
        state.showingSavedOnly = false;
        fetchJobs();
    });
});

// Badge Filter Toggles
filterBadgeHiring.addEventListener('click', () => {
    if (state.badgeFilter === 'actively') {
        state.badgeFilter = null;
        filterBadgeHiring.classList.remove('active');
    } else {
        state.badgeFilter = 'actively';
        filterBadgeHiring.classList.add('active');
        filterBadgeEarly.classList.remove('active');
    }
    renderJobs();
});

filterBadgeEarly.addEventListener('click', () => {
    if (state.badgeFilter === 'early') {
        state.badgeFilter = null;
        filterBadgeEarly.classList.remove('active');
    } else {
        state.badgeFilter = 'early';
        filterBadgeEarly.classList.add('active');
        filterBadgeHiring.classList.remove('active');
    }
    renderJobs();
});

// View mode toggles
btnGridView.addEventListener('click', () => {
    btnGridView.classList.add('active');
    btnListView.classList.remove('active');
    jobsContainer.classList.remove('jobs-list-view');
});

btnListView.addEventListener('click', () => {
    btnListView.classList.add('active');
    btnGridView.classList.remove('active');
    jobsContainer.classList.add('jobs-list-view');
});

// Saved Filter Toggle
btnSavedJobs.addEventListener('click', () => {
    state.showingSavedOnly = !state.showingSavedOnly;
    if (state.showingSavedOnly) {
        btnSavedJobs.classList.remove('btn-secondary');
        btnSavedJobs.classList.add('btn-primary');
    } else {
        btnSavedJobs.classList.remove('btn-primary');
        btnSavedJobs.classList.add('btn-secondary');
    }
    renderJobs();
});

// Raw Modal Inspector Toggle
btnInspectRaw.addEventListener('click', () => {
    rawCodeSnippet.textContent = state.rawHtmlSnippet || 'No API payload loaded yet.';
    rawModal.classList.add('active');
});

closeRawModal.addEventListener('click', () => {
    rawModal.classList.remove('active');
});

closeDetailModal.addEventListener('click', () => {
    detailModal.classList.remove('active');
});

// Close modals when clicking outside box
window.addEventListener('click', (e) => {
    if (e.target === rawModal) rawModal.classList.remove('active');
    if (e.target === detailModal) detailModal.classList.remove('active');
});

// Initial Startup
updateSavedCountUI();
fetchJobs();
