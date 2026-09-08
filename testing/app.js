// Pure Client-Side HTML/CSS/JS LinkedIn Search & Parsing Test

const keywordsInput = document.getElementById('keywordsInput');
const locationInput = document.getElementById('locationInput');
const proxySelect = document.getElementById('proxySelect');
const btnFetch = document.getElementById('btnFetch');

const togglePasteBtn = document.getElementById('togglePasteBtn');
const pasteContainer = document.getElementById('pasteContainer');
const rawPasteInput = document.getElementById('rawPasteInput');
const btnParsePasted = document.getElementById('btnParsePasted');

const statusText = document.getElementById('statusText');
const corsNotice = document.getElementById('corsNotice');
const jobsContainer = document.getElementById('jobsContainer');

// Toggle Raw Paste Box
togglePasteBtn.addEventListener('click', () => {
    pasteContainer.classList.toggle('hidden');
});

// Build direct target URL
function buildLinkedInUrl(keywords, location) {
    const base = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
    const params = new URLSearchParams();
    if (keywords) params.append('keywords', keywords);
    if (location) params.append('location', location);
    return `${base}?${params.toString()}`;
}

// Client-Side DOMParser HTML String Parser
function parseLinkedInHtmlString(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const jobs = [];

    // Find card containers in HTML tree
    const cards = doc.querySelectorAll('li, div.job-search-card, div.base-search-card, .base-card');

    cards.forEach((card, idx) => {
        const titleElem = card.querySelector('.base-search-card__title, .job-search-card__title, h3');
        if (!titleElem) return;

        const title = titleElem.textContent.trim();
        const companyElem = card.querySelector('.base-search-card__subtitle, .job-search-card__subtitle, .hidden-nested-link, h4');
        const company = companyElem ? companyElem.textContent.trim() : 'Company Confidential';
        
        const locationElem = card.querySelector('.job-search-card__location, .base-search-card__metadata span');
        const location = locationElem ? locationElem.textContent.trim() : 'Not specified';

        const timeElem = card.querySelector('time, .job-search-card__listdate');
        const postedTime = timeElem ? timeElem.textContent.trim() : 'Recently';

        const badgeElem = card.querySelector('.result-benefits__text, .job-search-card__benefits');
        const badge = badgeElem ? badgeElem.textContent.trim() : '';

        const linkElem = card.querySelector('a.base-card__full-link, a[href*="/jobs/view/"]');
        let jobUrl = linkElem ? linkElem.getAttribute('href') : '#';
        if (jobUrl.includes('?')) jobUrl = jobUrl.split('?')[0];

        jobs.push({ id: `client-${idx}`, title, company, location, postedTime, badge, jobUrl });
    });

    return jobs;
}

// Render Job Cards into DOM
function renderJobs(jobs) {
    statusText.textContent = `Successfully parsed ${jobs.length} job postings directly in browser!`;
    
    if (jobs.length === 0) {
        jobsContainer.innerHTML = `
            <div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted); border: 1px solid var(--border); border-radius: 12px;">
                No job cards found in the HTML response.
            </div>
        `;
        return;
    }

    jobsContainer.innerHTML = jobs.map(job => `
        <div class="job-card">
            <h3>${job.title}</h3>
            <h4>${job.company}</h4>
            <div class="job-meta">📍 ${job.location} &bull; 🕒 ${job.postedTime}</div>
            ${job.badge ? `<div class="badge">🔥 ${job.badge}</div>` : ''}
            <div>
                <a href="${job.jobUrl}" target="_blank" class="apply-link">
                    Apply on LinkedIn &rarr;
                </a>
            </div>
        </div>
    `).join('');
}

// Fetch via client-side strategies
async function handleFetch() {
    const kw = keywordsInput.value.trim();
    const loc = locationInput.value.trim();
    const targetUrl = buildLinkedInUrl(kw, loc);
    const proxyChoice = proxySelect.value;

    statusText.textContent = `Fetching via ${proxyChoice}...`;
    corsNotice.textContent = '';
    jobsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading...</div>`;

    try {
        let requestUrl = targetUrl;
        let responseHtml = '';

        if (proxyChoice === 'corsproxy') {
            requestUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
            const res = await fetch(requestUrl);
            responseHtml = await res.text();
        } else if (proxyChoice === 'allorigins') {
            requestUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
            const res = await fetch(requestUrl);
            const json = await res.json();
            responseHtml = json.contents || '';
        } else {
            // Direct Browser Fetch (Will trigger CORS unless user has a CORS Unblock extension enabled)
            corsNotice.textContent = 'Note: Direct fetch will fail if browser blocks CORS!';
            const res = await fetch(targetUrl);
            responseHtml = await res.text();
        }

        const parsedJobs = parseLinkedInHtmlString(responseHtml);
        renderJobs(parsedJobs);

    } catch (err) {
        console.error('Client Fetch Error:', err);
        statusText.textContent = `Fetch Failed: ${err.message}`;
        corsNotice.textContent = 'CORS Policy blocked direct request. Try CorsProxy.io or paste HTML snippet below.';
    }
}

// Handle Manual Pasted HTML Parsing
btnParsePasted.addEventListener('click', () => {
    const rawHtml = rawPasteInput.value;
    if (!rawHtml.trim()) {
        alert('Please paste HTML content first!');
        return;
    }
    const jobs = parseLinkedInHtmlString(rawHtml);
    renderJobs(jobs);
});

btnFetch.addEventListener('click', handleFetch);

// Auto-run initial test
handleFetch();
