import requests
import json
import re
import os
import xml.etree.ElementTree as ET

# Chemin du fichier de configuration local
CONFIG_PATH = "config/config.json"

# Constantes pour les valeurs par défaut
NO_TITLE = 'No Title'
NO_LINK = 'No Link'

# Fonction pour charger la configuration depuis le fichier config.json
def load_config():
    try:
        with open(CONFIG_PATH, 'r') as file:
            config = json.load(file)
        return config
    except Exception as e:
        print(f"Erreur lors du chargement de la configuration: {e}")
        return {
            "maxArticles": 30,
            "maxWordsDescription": 50,
            "keywordsToSkip": ["paywall", "fermented"],
            "subreddits": ["r/java", "r/javascript", "r/rust", "r/golang", "r/Python", "r/C_Programming", "r/Haskell", "r/cobol", "r/fsharp", "r/csharp"],
            "urls": {
                "devto": "https://dev.to/api/articles",
                "hackernews": "https://hn.algolia.com/api/v1/search_by_date?query=programming&tags=story&page=",
                "slashdot": "https://slashdot.org/slashdot.rdf"
            }
        }

config = load_config()

# Constantes de configuration
MAX_ARTICLES = config["maxArticles"]
MAX_WORDS_DESCRIPTION = config["maxWordsDescription"]
KEYWORDS_TO_SKIP = config["keywordsToSkip"]

# Fonction pour limiter la description à un nombre maximum de mots
def limit_words(text, max_words):
    words = re.findall(r'\b\w+\b', text)
    if len(words) > max_words:
        return ' '.join(words[:max_words]) + '...'
    return text

# Fonction pour vérifier si un titre contient un des mots-clés à filtrer
def contains_keyword(title, keywords):
    return any(keyword.lower() in title.lower() for keyword in keywords)

# Fonction pour sauvegarder les données dans un fichier JSON
def save_data(data, json_path='config/datas.json'):
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=4)
    print(f"Les données ont été sauvegardées dans {json_path}")

# Fetch Dev.to Articles
def fetch_devto():
    URL = config["urls"]["devto"]
    response = requests.get(URL)
    data = response.json()
    
    items = []
    for item in data:
        title = item.get('title', NO_TITLE)
        link = item.get('url', NO_LINK)
        description = item.get('description', 'No Description')
        
        if link and not contains_keyword(title, KEYWORDS_TO_SKIP):
            if len(items) >= MAX_ARTICLES:
                break
            items.append({
                'title': title,
                'link': link,
                'description': limit_words(description, MAX_WORDS_DESCRIPTION)
            })
    return items

# Fetch Hackernews Articles
def fetch_hackernews():
    URL = f"{config['urls']['hackernews']}{MAX_ARTICLES}"
    response = requests.get(URL)
    data = response.json()
    
    # Extraire les articles
    items = []
    for hit in data['hits']:
        title = hit.get('title', NO_TITLE)
        link = hit.get('url', NO_LINK)
        
        if link and link != NO_LINK and not contains_keyword(title, KEYWORDS_TO_SKIP):
            if len(items) >= MAX_ARTICLES:
                break
            items.append({
                'title': title,
                'link': link,
                'description': limit_words(hit.get('story_text', 'No Description'), MAX_WORDS_DESCRIPTION)
            })

    return items

# Fetch Reddit Posts
def fetch_reddit():
    subreddits = config.get("subreddits", [])
    all_items = []

    for subreddit in subreddits:
        URL = f"https://www.reddit.com/{subreddit}/new.json?limit={MAX_ARTICLES}"
        response = requests.get(URL, headers={'User-agent': 'Mozilla/5.0'})
        data = response.json()

        items = []
        for post in data['data']['children']:
            post_data = post['data']
            title = post_data.get('title', NO_TITLE)
            link = post_data.get('url', NO_LINK)
            description = post_data.get('selftext', '')

            if link and not contains_keyword(title, KEYWORDS_TO_SKIP):
                if len(items) >= MAX_ARTICLES:
                    break
                items.append({
                    'subreddit': post_data.get('subreddit', 'No Subreddit').lower(),
                    'title': title,
                    'link': link,
                    'description': limit_words(description, MAX_WORDS_DESCRIPTION)
                })
        all_items.extend(items)
    
    return all_items

# Fetch Slashdot Articles
def fetch_slashdot():
    URL = config["urls"]["slashdot"]
    response = requests.get(URL)
    root = ET.fromstring(response.content)

    namespaces = {
        'rss': 'http://purl.org/rss/1.0/',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'dc': 'http://purl.org/dc/elements/1.1/',
        'slash': 'http://purl.org/rss/1.0/modules/slash/',
        'synd': 'http://purl.org/rss/1.0/modules/syndication/'
    }

    items = []
    for item in root.findall('rss:item', namespaces):
        title_elem = item.find('rss:title', namespaces)
        link_elem = item.find('rss:link', namespaces)
        description_elem = item.find('rss:description', namespaces)

        title = title_elem.text if title_elem is not None else NO_TITLE
        link = link_elem.text if link_elem is not None else NO_LINK
        description = description_elem.text if description_elem is not None else ''
        
        if link and link != NO_LINK and not contains_keyword(title, KEYWORDS_TO_SKIP):
            if len(items) >= MAX_ARTICLES:
                break
            items.append({
                'title': title,
                'link': link,
                'description': limit_words(description, MAX_WORDS_DESCRIPTION)
            })
    return items

# Fonction principale pour récupérer les données et les sauvegarder
def fetch_all_data():
    data = {
        "hackernews": fetch_hackernews(),
        "reddit": fetch_reddit(),
        "devto": fetch_devto(),
        "slashdot": fetch_slashdot()
    }
    save_data(data)

if __name__ == "__main__":
    fetch_all_data()
