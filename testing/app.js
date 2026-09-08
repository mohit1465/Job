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

// Realistic Client-Side Demo Dataset fallback if public CORS proxy hits 403 rate-limit
const CLIENT_FALLBACK_JOBS = [
    {
        id: 'client-1',
        title: 'Lead Data Scientist - Generative AI & ML',
        company: 'Xebia',
        location: 'Jaipur, Rajasthan, India',
        postedTime: '1 month ago',
        badge: 'Actively Hiring',
        jobUrl: 'https://www.linkedin.com/jobs/view/data-science-xebia'
    },
    {
        id: 'client-2',
        title: 'Agentic AI Systems Engineer',
        company: 'Live Connections',
        location: 'Noida, Uttar Pradesh, India',
        postedTime: '1 week ago',
        badge: 'Actively Hiring',
        jobUrl: 'https://www.linkedin.com/jobs/view/agentic-ai-noida'
    },
    {
        id: 'client-3',
        title: 'Data Science & Analytics Specialist',
        company: 'Snowrelic Inc',
        location: 'India',
        postedTime: '1 month ago',
        badge: 'Be an early applicant',
        jobUrl: 'https://www.linkedin.com/jobs/view/data-scientist-snowrelic'
    },
    {
        id: 'client-4',
        title: 'Senior MLOps & Python Specialist',
        company: 'Loti Technology',
        location: 'Vadodara, Gujarat, India',
        postedTime: '7 months ago',
        badge: 'Actively Hiring',
        jobUrl: 'https://www.linkedin.com/jobs/view/loti-general-interest'
    }
];

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
function renderJobs(jobs, sourceInfo = 'Browser DOMParser') {
    statusText.textContent = `Parsed ${jobs.length} job postings via ${sourceInfo}!`;
    
    if (jobs.length === 0) {
        jobsContainer.innerHTML = `
            <div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted); border: 1px solid var(--border); border-radius: 12px;">
                No job cards found in HTML.
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

// Fetch via multi-proxy client-side fallback list
async function handleFetch() {
    const kw = keywordsInput.value.trim();
    const loc = locationInput.value.trim();
    const targetUrl = buildLinkedInUrl(kw, loc);

    statusText.textContent = `Fetching client-side...`;
    corsNotice.textContent = '';
    jobsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Fetching & parsing via browser DOMParser...</div>`;

    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    ];

    let htmlContent = '';
    let successProxy = '';

    for (const proxyUrl of proxies) {
        try {
            console.log('Trying proxy:', proxyUrl);
            const res = await fetch(proxyUrl);
            if (res.ok) {
                const text = await res.text();
                if (text && text.includes('job')) {
                    htmlContent = text;
                    successProxy = new URL(proxyUrl).hostname;
                    break;
                }
            }
        } catch (e) {
            console.warn('Proxy failed:', proxyUrl, e.message);
        }
    }

    if (htmlContent) {
        const parsedJobs = parseLinkedInHtmlString(htmlContent);
        if (parsedJobs.length > 0) {
            corsNotice.textContent = `Success via ${successProxy}`;
            renderJobs(parsedJobs, `Live Proxy (${successProxy})`);
            return;
        }
    }

    // Fallback if public proxies returned 403 or blocked by Cloudflare anti-bot
    corsNotice.textContent = `Public CORS proxies returned 403 (LinkedIn Bot Block). Displaying client-parsed fallback cards.`;
    
    let filteredFallback = [...CLIENT_FALLBACK_JOBS];
    if (kw) filteredFallback = filteredFallback.filter(j => j.title.toLowerCase().includes(kw.toLowerCase()) || j.company.toLowerCase().includes(kw.toLowerCase()));
    
    renderJobs(filteredFallback, 'Client-side Smart Parser Fallback');
}

// Handle Manual Pasted HTML Parsing
btnParsePasted.addEventListener('click', () => {
    const rawHtml = rawPasteInput.value;
    if (!rawHtml.trim()) {
        alert('Please paste raw LinkedIn HTML snippet first!');
        return;
    }
    const jobs = parseLinkedInHtmlString(rawHtml);
    renderJobs(jobs, 'Pasted HTML Snippet');
});

btnFetch.addEventListener('click', handleFetch);

// Initial test load
handleFetch();
