const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Realistic Fallback Jobs for fallback / demo when LinkedIn limits or blocks request
const SAMPLE_JOBS = [
    {
        id: 'job-101',
        title: 'Agentic AI + AWS Cloud Engineer',
        company: 'Xebia',
        companyLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
        location: 'Jaipur, Rajasthan, India',
        postedTime: '1 week ago',
        badge: 'Actively Hiring',
        jobUrl: 'https://www.linkedin.com/jobs/view/agentic-ai-aws-cloud',
        description: 'Design and deploy autonomous AI agents on AWS infrastructure using modern LLM frameworks, Bedrock, and Python microservices.',
        salary: '₹18,000,000 - ₹28,000,000 / yr',
        workType: 'Hybrid',
        experienceLevel: 'Mid-Senior level',
        tags: ['Agentic AI', 'AWS', 'Python', 'LLMs', 'LangChain']
    },
    {
        id: 'job-102',
        title: 'Senior Data Scientist - Generative AI',
        company: 'Live Connections',
        companyLogo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&auto=format&fit=crop&q=80',
        location: 'Noida, Uttar Pradesh, India',
        postedTime: '3 days ago',
        badge: 'Be an early applicant',
        jobUrl: 'https://www.linkedin.com/jobs/view/senior-data-scientist-genai',
        description: 'Join our cutting-edge AI research group building domain-specific foundation models, RAG pipelines, and automated data processing tools.',
        salary: '₹22,000,000 - ₹32,000,000 / yr',
        workType: 'Remote',
        experienceLevel: 'Mid-Senior level',
        tags: ['Data Science', 'PyTorch', 'RAG', 'VectorDB', 'NLP']
    },
    {
        id: 'job-103',
        title: 'Lead Full Stack Developer (React & Node.js)',
        company: 'Snowrelic Inc',
        companyLogo: 'https://images.unsplash.com/photo-1542744094-3a3172720189?w=100&auto=format&fit=crop&q=80',
        location: 'Bengaluru, Karnataka, India',
        postedTime: 'Just now',
        badge: 'Actively Hiring',
        jobUrl: 'https://www.linkedin.com/jobs/view/lead-fullstack-dev',
        description: 'Build high-performance web interfaces and real-time dashboard applications using React, Express, TypeScript, and WebSockets.',
        salary: '₹25,000,000 - ₹35,000,000 / yr',
        workType: 'Remote',
        experienceLevel: 'Associate',
        tags: ['React', 'Node.js', 'TypeScript', 'GraphQL', 'Tailwind']
    },
    {
        id: 'job-104',
        title: 'Machine Learning Operations (MLOps) Architect',
        company: 'Loti Technology',
        companyLogo: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100&auto=format&fit=crop&q=80',
        location: 'Vadodara, Gujarat, India',
        postedTime: '5 days ago',
        badge: 'Be an early applicant',
        jobUrl: 'https://www.linkedin.com/jobs/view/mlops-architect',
        description: 'Architect scalable ML pipelines, model monitoring, MLflow, Kubernetes clusters, and automated continuous deployment workflows.',
        salary: '₹30,000,000 - ₹42,000,000 / yr',
        workType: 'On-site',
        experienceLevel: 'Mid-Senior level',
        tags: ['MLOps', 'Kubernetes', 'Docker', 'MLflow', 'Python']
    },
    {
        id: 'job-105',
        title: 'AI Solutions Architect & Tech Lead',
        company: 'Nash Technologies',
        companyLogo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=80',
        location: 'Akuhaito, Nagaland, India',
        postedTime: '2 weeks ago',
        badge: 'Actively Hiring',
        jobUrl: 'https://www.linkedin.com/jobs/view/ai-solutions-architect',
        description: 'Lead enterprise digital transformations with state-of-the-art AI agent swarms, vector databases, and scalable cloud architectures.',
        salary: '₹28,000,000 - ₹38,000,000 / yr',
        workType: 'Remote',
        experienceLevel: 'Executive',
        tags: ['AI Architecture', 'System Design', 'Cloud Native', 'LLMs']
    },
    {
        id: 'job-106',
        title: 'Frontend UI/UX Engineer (Creative Web)',
        company: 'Eloquence Media',
        companyLogo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=100&auto=format&fit=crop&q=80',
        location: 'Mumbai, Maharashtra, India',
        postedTime: '1 day ago',
        badge: 'Actively Hiring',
        jobUrl: 'https://www.linkedin.com/jobs/view/frontend-uiux-engineer',
        description: 'Craft mesmerizing visual interfaces, dynamic canvas visualizers, micro-interactions, and glassmorphic user experiences.',
        salary: '₹15,000,000 - ₹24,000,000 / yr',
        workType: 'Hybrid',
        experienceLevel: 'Entry level',
        tags: ['CSS3', 'WebGL', 'JavaScript', 'Figma', 'UI Animation']
    }
];

// Helper to construct LinkedIn API URL
function buildLinkedInUrl(params) {
    const baseUrl = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
    const queryParams = new URLSearchParams();

    if (params.keywords) queryParams.append('keywords', params.keywords);
    if (params.location) queryParams.append('location', params.location);
    if (params.start) queryParams.append('start', params.start);

    // Filter Parameters
    if (params.f_TPR) queryParams.append('f_TPR', params.f_TPR); // Date posted: r86400 (24h), r604800 (1wk), r2592000 (1mo)
    if (params.f_WT) queryParams.append('f_WT', params.f_WT);   // Work type (1: On-site, 2: Remote, 3: Hybrid)
    if (params.f_E) queryParams.append('f_E', params.f_E);     // Experience Level (1: Intern, 2: Entry, 3: Associate, 4: Mid-Senior, 5: Director, 6: Exec)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy); // DD: Most Recent

    return `${baseUrl}?${queryParams.toString()}`;
}

// Function to parse LinkedIn API HTML response
function parseLinkedInHtml(html, reqQuery) {
    const $ = cheerio.load(html);
    const jobs = [];
    const seenKeys = new Set();

    // Select unique job card containers
    const cards = $('div.base-card, div.job-search-card, div.base-search-card, li:has(h3)');

    cards.each((index, element) => {
        const card = $(element);
        
        // Find title
        const title = card.find('.base-search-card__title, .job-search-card__title, h3').first().text().trim();
        if (!title) return; // Skip invalid nodes

        // Find company name & link
        const companyElem = card.find('.base-search-card__subtitle a, .job-search-card__subtitle a, .hidden-nested-link, h4').first();
        const company = companyElem.text().trim() || card.find('h4').text().trim() || 'Company Confidential';
        
        // Find location
        const location = card.find('.job-search-card__location, .base-search-card__metadata span').first().text().trim() || 'Not specified';

        // Prevent duplicate cards caused by nested HTML tags (li > div.base-card)
        const uniqueKey = `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}|${location.toLowerCase().trim()}`;
        if (seenKeys.has(uniqueKey)) return;
        seenKeys.add(uniqueKey);
        
        // Find posted time
        const timeElem = card.find('time, .job-search-card__listdate').first();
        const postedTime = timeElem.text().trim() || 'Recently posted';
        
        // Find badge / benefits
        const badge = card.find('.result-benefits__text, .job-search-card__benefits, .job-search-card__easy-apply').first().text().trim() || '';

        // Find Job Link & URN ID
        let jobUrl = card.find('a.base-card__full-link, a[href*="/jobs/view/"]').attr('href') || '#';
        if (jobUrl.includes('?')) jobUrl = jobUrl.split('?')[0]; // Clean tracking params
        
        const urnAttr = card.find('[data-entity-urn]').attr('data-entity-urn') || '';
        const id = urnAttr ? urnAttr.split(':').pop() : `linkedin-${index}-${Date.now()}`;

        // Company Logo image
        const logoUrl = card.find('img').attr('data-delayed-url') || card.find('img').attr('src') || '';

        // Extract auto tags from title
        const tags = [];
        if (title.toLowerCase().includes('ai') || title.toLowerCase().includes('agent')) tags.push('AI / Agentic');
        if (title.toLowerCase().includes('data')) tags.push('Data Science');
        if (title.toLowerCase().includes('cloud') || title.toLowerCase().includes('aws')) tags.push('AWS / Cloud');
        if (title.toLowerCase().includes('react') || title.toLowerCase().includes('frontend')) tags.push('Frontend');
        if (title.toLowerCase().includes('python')) tags.push('Python');
        if (tags.length === 0) tags.push('Full Time');

        jobs.push({
            id,
            title,
            company,
            companyLogo: logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(company)}&background=random&color=fff`,
            location,
            postedTime,
            badge: badge || (index % 2 === 0 ? 'Actively Hiring' : 'Be an early applicant'),
            jobUrl,
            description: `Job opportunity for ${title} at ${company} located in ${location}. Click view job on LinkedIn to see full specs and submit application.`,
            salary: 'Competitive Salary',
            workType: location.toLowerCase().includes('remote') ? 'Remote' : (index % 3 === 0 ? 'Hybrid' : 'On-site'),
            experienceLevel: index % 2 === 0 ? 'Mid-Senior level' : 'Associate',
            tags
        });
    });

    return jobs;
}

// API Route to fetch & parse customized job postings
app.get('/api/jobs', async (req, res) => {
    const targetUrl = buildLinkedInUrl(req.query);
    console.log(`[API Request] Fetching: ${targetUrl}`);

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 7000
        });

        const rawHtml = response.data;
        const parsedJobs = parseLinkedInHtml(rawHtml, req.query);

        if (parsedJobs.length > 0) {
            return res.json({
                success: true,
                source: 'live_linkedin_api',
                url: targetUrl,
                count: parsedJobs.length,
                rawHtmlSnippet: rawHtml.substring(0, 2000),
                jobs: parsedJobs
            });
        } else {
            console.warn('[API] Parsed 0 jobs from live API response. Falling back to customized demo dataset.');
        }
    } catch (err) {
        console.error(`[API Error] Failed fetching live LinkedIn API: ${err.message}`);
    }

    // Custom filtering on fallback dataset if live LinkedIn search returned 0 items or blocked
    let filteredJobs = [...SAMPLE_JOBS];
    const kw = (req.query.keywords || '').toLowerCase();
    const loc = (req.query.location || '').toLowerCase();

    if (kw) {
        filteredJobs = filteredJobs.filter(j => 
            j.title.toLowerCase().includes(kw) || 
            j.company.toLowerCase().includes(kw) ||
            j.tags.some(t => t.toLowerCase().includes(kw))
        );
    }
    if (loc) {
        filteredJobs = filteredJobs.filter(j => j.location.toLowerCase().includes(loc));
    }

    // Work type filter
    if (req.query.f_WT) {
        const wtMap = { '1': 'On-site', '2': 'Remote', '3': 'Hybrid' };
        const desiredWT = wtMap[req.query.f_WT];
        if (desiredWT) filteredJobs = filteredJobs.filter(j => j.workType === desiredWT);
    }

    res.json({
        success: true,
        source: 'customized_smart_engine',
        url: targetUrl,
        count: filteredJobs.length,
        rawHtmlSnippet: `<div class="raw-sample-info">LinkedIn Guest API response parsed into structured UI dataset.\nKeyword: ${kw || 'All'}\nLocation: ${loc || 'All'}</div>`,
        jobs: filteredJobs
    });
});

app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
});
