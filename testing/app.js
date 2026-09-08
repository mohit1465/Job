// Direct Client-Side Browser Fetch Test for graphic keyword

const keywordsInput = document.getElementById('keywordsInput');
const locationInput = document.getElementById('locationInput');
const btnDirectFetch = document.getElementById('btnDirectFetch');

const statusText = document.getElementById('statusText');
const httpStatus = document.getElementById('httpStatus');
const rawDiagnosticLogs = document.getElementById('rawDiagnosticLogs');
const jobsContainer = document.getElementById('jobsContainer');

// Build URL
function getTargetUrl() {
    const kw = keywordsInput.value.trim() || 'graphic';
    const loc = locationInput.value.trim() || 'India';
    return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(kw)}&location=${encodeURIComponent(loc)}`;
}

// Client-Side DOMParser
function parseLinkedInHtml(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const jobs = [];

    const cards = doc.querySelectorAll('li, div.job-search-card, div.base-search-card, .base-card');

    cards.forEach((card, idx) => {
        const titleElem = card.querySelector('.base-search-card__title, .job-search-card__title, h3');
        if (!titleElem) return;

        const title = titleElem.textContent.trim();
        const companyElem = card.querySelector('.base-search-card__subtitle, .job-search-card__subtitle, .hidden-nested-link, h4');
        const company = companyElem ? companyElem.textContent.trim() : 'Company';

        const locationElem = card.querySelector('.job-search-card__location, .base-search-card__metadata span');
        const location = locationElem ? locationElem.textContent.trim() : 'Location';

        const timeElem = card.querySelector('time, .job-search-card__listdate');
        const postedTime = timeElem ? timeElem.textContent.trim() : 'Recently';

        const badgeElem = card.querySelector('.result-benefits__text, .job-search-card__benefits');
        const badge = badgeElem ? badgeElem.textContent.trim() : '';

        const linkElem = card.querySelector('a.base-card__full-link, a[href*="/jobs/view/"]');
        let jobUrl = linkElem ? linkElem.getAttribute('href') : '#';
        if (jobUrl.includes('?')) jobUrl = jobUrl.split('?')[0];

        jobs.push({ id: `graphic-${idx}`, title, company, location, postedTime, badge, jobUrl });
    });

    return jobs;
}

// Direct Browser Fetch Function (No Server, No Proxy)
async function testDirectFetch() {
    const targetUrl = getTargetUrl();
    
    statusText.textContent = `Attempting Direct Browser fetch to: ${targetUrl}`;
    httpStatus.textContent = 'Connecting...';
    rawDiagnosticLogs.style.display = 'block';
    rawDiagnosticLogs.textContent = `[FETCH INITIATED]\nURL: ${targetUrl}\nMode: Direct Browser Fetch (No Backend Proxy)`;
    jobsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Connecting to LinkedIn directly from browser...</div>`;

    try {
        // Direct browser fetch without server proxy
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        httpStatus.textContent = `Status: ${response.status} ${response.statusText}`;
        rawDiagnosticLogs.textContent += `\n[RESPONSE RECEIVED]\nStatus Code: ${response.status}\nOK: ${response.ok}`;

        if (!response.ok) {
            throw new Error(`HTTP Error Status ${response.status}`);
        }

        const htmlText = await response.data;
        const parsedJobs = parseLinkedInHtml(htmlText);

        rawDiagnosticLogs.textContent += `\n[PARSED RESULT]\nExtracted ${parsedJobs.length} job cards directly from HTML payload.`;
        
        if (parsedJobs.length > 0) {
            jobsContainer.innerHTML = parsedJobs.map(job => `
                <div class="job-card">
                    <h3>${job.title}</h3>
                    <h4>${job.company}</h4>
                    <div class="job-meta">📍 ${job.location} &bull; 🕒 ${job.postedTime}</div>
                    ${job.badge ? `<div class="badge">🔥 ${job.badge}</div>` : ''}
                    <div>
                        <a href="${job.jobUrl}" target="_blank" class="apply-link">Apply on LinkedIn &rarr;</a>
                    </div>
                </div>
            `).join('');
        } else {
            jobsContainer.innerHTML = `<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #f87171;">Received response, but 0 job cards matched HTML structure.</div>`;
        }

    } catch (err) {
        console.error('Direct fetch error:', err);
        httpStatus.textContent = 'FAILED (CORS / Network Error)';
        httpStatus.style.color = '#f87171';
        
        rawDiagnosticLogs.textContent += `\n\n[DIAGNOSTIC ERROR DETAILS]\nType: ${err.name}\nMessage: ${err.message}\n` +
            `Cause: Modern browsers block direct client-side fetch() to LinkedIn endpoints due to CORS (Cross-Origin Resource Sharing) security policy when called without a backend proxy server.`;
            
        jobsContainer.innerHTML = `
            <div style="grid-column: 1/-1; padding: 2rem; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 12px; color: #fda4af;">
                <h3 style="margin-bottom: 8px;">❌ Direct Browser Fetch Blocked by Browser CORS</h3>
                <p style="font-size: 0.9rem; line-height: 1.5;">
                    The browser prevented front-end JavaScript from reading raw LinkedIn HTML directly because LinkedIn's server does not output the <code>Access-Control-Allow-Origin: *</code> header for cross-origin browser requests.
                </p>
            </div>
        `;
    }
}

btnDirectFetch.addEventListener('click', testDirectFetch);

// Auto run on load
testDirectFetch();
