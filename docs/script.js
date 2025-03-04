document.addEventListener('DOMContentLoaded', async () => {
    // Configuration
    const username = 'Luthor91';
    const repo = 'technews';
    const branch = 'main';
    const data_file = "config/datas.json";
    const config_file = "config/config.json";
    const url = `https://raw.githubusercontent.com/${username}/${repo}/${branch}/`;
    
    let config = { maxArticles: 30, maxDescriptionLength: 150 };
    let data = {};

    // DOM Elements
    const sourceBtns = document.querySelectorAll('.source-btn');
    const programmingSources = document.getElementById('programming-sources');
    const techSources = document.getElementById('tech-sources');
    const newsList = document.getElementById('news-list');
    const errorMessage = document.getElementById('error-message');
    const searchInput = document.getElementById('search-input');
    const backToTopButton = document.getElementById('back-to-top');
    
    // Fetch configuration and data
    const loadConfig = async () => {
        try {
            const response = await fetch(`${url}${config_file}`);
            config = response.ok ? await response.json() : config;
        } catch (error) {
            console.error('Fetch error for config:', error);
        }
    };

    const loadData = async () => {
        try {
            const response = await fetch(`${url}${data_file}`);
            data = response.ok ? await response.json() : {};
        } catch (error) {
            console.error('Fetch error for data:', error);
        }
    };

    await loadConfig();
    await loadData();

    // Utility Functions
    const truncateDescription = (description) => {
        if (description.length <= config.maxDescriptionLength) return description;
        return description.slice(0, config.maxDescriptionLength) + '...';
    };

    const filterArticles = (articles, query) => {
        if (!query.trim()) return articles.slice(0, config.maxArticles);
        const keywords = query.toLowerCase().split(/\s+/);
        return articles.filter(item => {
            const title = item.title.toLowerCase();
            const description = item.description.toLowerCase();
            return keywords.some(keyword => 
                title.includes(keyword) || description.includes(keyword)
            );
        }).slice(0, config.maxArticles);
    };

    const displayArticles = (articles, query = '') => {
        newsList.innerHTML = '';
        if (!articles || !articles.length) {
            errorMessage.textContent = 'No articles found.';
            return;
        }

        const filteredArticles = filterArticles(articles, query);

        filteredArticles.forEach(article => {
            if (article.link && article.link !== 'No Link') {
                const listItem = document.createElement('li');
                listItem.classList.add('news-list-item');
                listItem.innerHTML = `
                    <a href="${article.link}" target="_blank" class="news-list-link">
                        <h3>${article.title}</h3>
                        <p>${truncateDescription(article.description)}</p>
                    </a>
                `;
                newsList.appendChild(listItem);
            }
        });
    };

    // Data Fetching
    const fetchData = (source, searchQuery = '') => {
        if (!source) return;

        try {
            source = source.toLowerCase();
            const isFromReddit = config.subreddits?.includes(`r/${source}`);

            let articles = [];
            if (isFromReddit) {
                articles = (data["reddit"] || []).filter(article => article.subreddit === source);
            } else {
                articles = data[source] || [];
            }

            displayArticles(articles, searchQuery);
        } catch (error) {
            console.error('Data fetch error:', error);
            errorMessage.textContent = 'Failed to load data. Please try again later.';
        }
    };

        
    // Modified Event Listeners
    sourceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            sourceBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Reset Reddit source dropdowns
            programmingSources.selectedIndex = 0;
            techSources.selectedIndex = 0;
            
            // Fetch and display articles
            const source = btn.dataset.source;
            fetchData(source);
        });
    });

    programmingSources.addEventListener('change', (event) => {
        const subreddit = event.target.value;
        // Reset tech sources dropdown
        techSources.selectedIndex = 0;
        fetchData(subreddit);
    });

    techSources.addEventListener('change', (event) => {
        const subreddit = event.target.value;
        // Reset programming sources dropdown
        programmingSources.selectedIndex = 0;
        fetchData(subreddit);
    });

    searchInput.addEventListener('input', () => {
        const currentSource = 
            document.querySelector('.source-btn.active')?.dataset.source 
            || programmingSources.value 
            || techSources.value;
        fetchData(currentSource, searchInput.value);
    });

    backToTopButton.addEventListener('click', (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });


    // Initial load
    fetchData("hackernews");
});