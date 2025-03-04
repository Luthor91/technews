# Définir la version de Python à utiliser
PYTHON := python
PACKAGE := requests

# Définir le port sur lequel le serveur sera lancé
PORT := 8000

# Définir l'URL du dépôt Git
GIT_REPO := https://github.com/Luthor91/technews.git

# Détection du système (Windows ou Unix)
OS := $(shell uname -s 2>/dev/null || echo Windows)
VENV_PATH := venv/bin
ifeq ($(OS), Windows)
    ACTIVATE := .\venv\Scripts\activate
    PIP := .\venv\Scripts\pip.exe
    PYTHON_BIN := .\venv\Scripts\python.exe
else
    ACTIVATE := . venv/bin/activate
    PIP := ./venv/bin/pip
    PYTHON_BIN := ./venv/bin/python
endif

# Cibles principales
.PHONY: serve freeze install update deploy run

# Commande pour démarrer un serveur HTTP simple
serve:
	@echo "Starting server on http://127.0.0.1:$(PORT)"
	$(PYTHON) -m http.server $(PORT)

# Sauvegarde des dépendances installées
freeze:
	@$(ACTIVATE) && $(PIP) install $(PACKAGE)
	@$(ACTIVATE) && $(PIP) freeze > requirements.txt

# Installation de l'environnement virtuel et des dépendances
install:
	@echo "Setting up virtual environment..."
	@$(PYTHON) -m venv venv
	@$(PIP) install -r requirements.txt

# Mise à jour des dépendances
update: install
	@$(ACTIVATE) && $(PYTHON_BIN) scripts/fetch_datas.py

# Déploiement de l'application
deploy:
	@git add .
	@git commit -m "Update news data"
	@git push

# Exécuter l'environnement, le script et déployer en une seule commande
run: install
	@$(ACTIVATE) && $(PYTHON_BIN) scripts/fetch_datas.py
	@$(MAKE) deploy
