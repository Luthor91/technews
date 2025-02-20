document.addEventListener('DOMContentLoaded', async () => {
    // Variables de configuration
    const username = 'Luthor91';
    const repo = 'technews';
    const branch = 'main';
    const data_file = "config/datas.json";
    const config_file = "config/config.json";
    const url = `https://raw.githubusercontent.com/${username}/${repo}/${branch}/`;
    let config = {};
    let data = {};

    // Charger la configuration depuis GitHub
    const loadConfig = async () => {
        try {
            const response = await fetch(`${url}${config_file}`);
            config = response.ok ? await response.json() : { maxArticles: 30, maxDescriptionLength: 150 };
            config.subreddits.map(v => v.toLowerCase());
        } catch (error) {
            console.error('Fetch error for config:', error);
            config = { maxArticles: 30, maxDescriptionLength: 150 };
        }
    };

    // Charger les données depuis GitHub
    const loadData = async () => {
        try {
            const response = await fetch(`${url}${data_file}`);
            data = response.ok ? await response.json() : {};
        } catch (error) {
            console.error('Fetch error for data:', error);
            data = {};
        }
    };

    await loadConfig();
    await loadData();
    const { maxArticles, maxDescriptionLength } = config;

    // Sélecteurs
    const tabs = document.querySelectorAll('.tab-button');
    const newsList = document.getElementById('news-list');
    const errorMessage = document.getElementById('error-message');
    const searchInput = document.getElementById('search-input');
    const themeSelect = document.getElementById('theme-select');
    const redditDropdown = document.getElementById('reddit-dropdown');
    const backToTopButton = document.getElementById('back-to-top');

    // Fonction pour récupérer les données
    const fetchData = async (source) => {
        if (!source) return;
        try {
            source = source.toLowerCase();
            
            const isFromReddit = config.subreddits && config.subreddits.includes(`r/${source}`);
            
            // Vérifier si les données sont disponibles
            if (!data) {
                throw new Error('Data not available');
            }

            // Afficher les articles en fonction de la source
            if (isFromReddit) {
                const articles = (data["reddit"] || []).filter(article => article.subreddit == source);
                displayArticles(articles, searchInput.value); 
            } else {
                const articles = data[source] || [];
                displayArticles(articles, searchInput.value);  // Passe la valeur de recherche à la fonction
            }   

        } catch (error) {
            console.error('Fetch error:', error);
            errorMessage.textContent = 'Failed to load data. Please try again later.';
        }
    };

    // Filtrage et affichage des articles
    const filterArticles = (articles, query) => {
        if (!query.trim()) return articles.slice(0, maxArticles); // Affiche tous les articles si la recherche est vide
        const keywords = query.toLowerCase().split(/\s+/);
        return articles.filter(item => {
            const title = item.title.toLowerCase();
            const description = item.description.toLowerCase();
            return keywords.some(keyword => title.includes(keyword) || description.includes(keyword));
        }).slice(0, maxArticles);
    };

    const truncateDescription = (description) => {
        if (description.length <= maxDescriptionLength) return description;
        const truncated = description.slice(0, maxDescriptionLength);
        const lastSpace = truncated.lastIndexOf(' ');
        return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
    };

    const displayArticles = (articles, query) => {
        newsList.innerHTML = '';
        if (!articles || !articles.length) {
            errorMessage.textContent = 'No data available.';
            return;
        }
        const filteredItems = filterArticles(articles, query);
    
        filteredItems.forEach(item => {
            if (item.link && item.link !== 'No Link') {
                const listItem = document.createElement('li');
                listItem.classList.add('news-list-item');  // Ajout de la classe "news-list-item"
                
                // Enveloppe tout le contenu dans un seul lien <a>
                listItem.innerHTML = `
                    <a href="${item.link}" target="_blank" class="news-list-link">
                        <h3>${item.title}</h3>
                        <p class="description">${truncateDescription(item.description)}</p>
                    </a>
                `;
                
                newsList.appendChild(listItem);
            }
        });
    };

    // Gestion de la recherche
    searchInput.addEventListener('input', () => {
        const articles = Array.from(newsList.querySelectorAll('.news-list-item')).map(li => ({
            title: li.querySelector('h3').textContent,
            description: li.querySelector('p.description').textContent,
            link: li.querySelector('a').href
        }));
        displayArticles(articles, searchInput.value); // Filtre les articles en fonction de la recherche
    });

    // Fonction pour changer le thème
    const changeTheme = (theme, themeSelect) => {
        document.body.classList.remove('light-theme', 'dark-theme', 'autumn-theme', 'refined-dark-theme');
        document.body.classList.add(`${theme}`);
        localStorage.setItem('selectedTheme', theme);
    
        if (themeSelect) {
            themeSelect.value = theme; // S'assure que la valeur sélectionnée correspond au thème actuel
        }
    };    

    // Initialisation du thème
    if (themeSelect) {
        const savedTheme = localStorage.getItem('selectedTheme') || 'light-theme';

        // Vérification du format du thème
        const themePattern = /^[a-z]+-theme$/; // Expression régulière pour le format [mot_random]-theme
        if (themePattern.test(savedTheme)) {
            changeTheme(savedTheme, themeSelect); // Ajout de themeSelect
        } else {
            changeTheme('light-theme', themeSelect); // Définit le thème par défaut si le format n'est pas valide
        }

        themeSelect.value = savedTheme; 

        // Gestion du changement de thème
        themeSelect.addEventListener('change', (e) => changeTheme(e.target.value, themeSelect));
    } else {
        console.error("Element 'theme-select' not found in the DOM.");
    }

    // Gestion des onglets
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Retirer la classe "active" de tous les onglets
            tabs.forEach(t => t.classList.remove('active'));
            redditDropdown.classList.remove('active');
    
            // Ajouter la classe "active" à l'onglet cliqué
            tab.classList.add('active');
    
            fetchData(tab.dataset.source);
        });
    });

    redditDropdown.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        redditDropdown.classList.toggle('active');
    });

    // Gestion du menu déroulant Reddit
    redditDropdown.addEventListener('change', (event) => {
        const subreddit = event.target.value;
        fetchData(subreddit); // Utiliser le nom du subreddit
    });

    // Gestion du bouton retour en haut
    backToTopButton.addEventListener('click', function(event) {
        event.preventDefault();  // Empêche le comportement par défaut du lien
        window.scrollTo({ top: 0, behavior: 'smooth' });  // Faire défiler en douceur vers le haut de la page
    });

    // Initialement charger les données de Hackernews
    fetchData("hackernews");
});
