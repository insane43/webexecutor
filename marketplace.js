import { database, ref, push, set, get, onValue, update } from './firebase-config.js';

let allScripts = [];
let currentScriptId = null;

const scriptsRef = ref(database, 'scripts');

function initializeMarketplace() {
    loadScripts();
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('uploadBtn').addEventListener('click', openUploadModal);
    document.getElementById('closeUploadModal').addEventListener('click', closeUploadModal);
    document.getElementById('cancelUpload').addEventListener('click', closeUploadModal);
    document.getElementById('uploadForm').addEventListener('submit', handleUploadScript);
    
    document.getElementById('closeViewModal').addEventListener('click', closeViewModal);
    document.getElementById('closeViewBtn').addEventListener('click', closeViewModal);
    document.getElementById('copyCodeBtn').addEventListener('click', copyScriptCode);
    document.getElementById('loadToEditorBtn').addEventListener('click', loadToEditor);
    
    setupRatingStars();
    setupLeaderboardTabs();
    
    document.getElementById('searchInput').addEventListener('input', filterScripts);
    document.getElementById('sortSelect').addEventListener('change', filterScripts);
    document.getElementById('categoryFilter').addEventListener('change', filterScripts);
    
    window.addEventListener('click', (e) => {
        const uploadModal = document.getElementById('uploadModal');
        const viewModal = document.getElementById('viewModal');
        if (e.target === uploadModal) closeUploadModal();
        if (e.target === viewModal) closeViewModal();
    });
}

function loadScripts() {
    onValue(scriptsRef, (snapshot) => {
        const data = snapshot.val();
        allScripts = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                allScripts.push({
                    id: key,
                    ...data[key]
                });
            });
        }
        
        updateStatistics();
        filterScripts();
    });
}

function updateStatistics() {
    const totalScripts = allScripts.length;
    const totalDownloads = allScripts.reduce((sum, script) => sum + (script.downloads || 0), 0);
    
    document.getElementById('totalScripts').textContent = totalScripts;
    document.getElementById('totalDownloads').textContent = totalDownloads;
    
    updateLeaderboard('downloads');
}

function setupLeaderboardTabs() {
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const type = tab.getAttribute('data-type');
            updateLeaderboard(type);
        });
    });
}

function updateLeaderboard(type) {
    const content = document.getElementById('leaderboardContent');
    
    if (type === 'downloads') {
        // Top Scripts by downloads
        const topScripts = [...allScripts]
            .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
            .slice(0, 5);
        
        if (topScripts.length === 0) {
            content.innerHTML = '<div class="empty-state"><p>No scripts yet</p></div>';
            return;
        }
        
        content.innerHTML = topScripts.map((script, index) => `
            <div class="leaderboard-item" data-id="${script.id}">
                <div class="leaderboard-rank">${index + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${escapeHtml(script.name)}</div>
                    <div class="leaderboard-meta">
                        <i class="fas fa-download"></i>
                        ${script.downloads || 0} downloads
                    </div>
                </div>
            </div>
        `).join('');
        
    } else if (type === 'contributors') {
        // Top Contributors by total downloads
        const authorStats = {};
        
        allScripts.forEach(script => {
            const author = script.author;
            if (!authorStats[author]) {
                authorStats[author] = {
                    name: author,
                    totalDownloads: 0,
                    scriptCount: 0
                };
            }
            authorStats[author].totalDownloads += (script.downloads || 0);
            authorStats[author].scriptCount++;
        });
        
        const topAuthors = Object.values(authorStats)
            .sort((a, b) => b.totalDownloads - a.totalDownloads)
            .slice(0, 5);
        
        if (topAuthors.length === 0) {
            content.innerHTML = '<div class="empty-state"><p>No authors yet</p></div>';
            return;
        }
        
        content.innerHTML = topAuthors.map((author, index) => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank">${index + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${escapeHtml(author.name)}</div>
                    <div class="leaderboard-meta">
                        <i class="fas fa-code"></i>
                        ${author.scriptCount} scripts · ${author.totalDownloads} downloads
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Add click handlers for script items
    document.querySelectorAll('.leaderboard-item[data-id]').forEach(item => {
        item.addEventListener('click', () => {
            const scriptId = item.getAttribute('data-id');
            viewScript(scriptId);
        });
    });
}

function filterScripts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const sortBy = document.getElementById('sortSelect').value;
    const category = document.getElementById('categoryFilter').value;
    
    let filtered = [...allScripts];
    
    if (searchTerm) {
        filtered = filtered.filter(script => 
            script.name.toLowerCase().includes(searchTerm) ||
            script.description.toLowerCase().includes(searchTerm) ||
            script.author.toLowerCase().includes(searchTerm)
        );
    }
    
    if (category !== 'all') {
        filtered = filtered.filter(script => script.category === category);
    }
    
    filtered.sort((a, b) => {
        switch(sortBy) {
            case 'newest':
                return b.timestamp - a.timestamp;
            case 'oldest':
                return a.timestamp - b.timestamp;
            case 'popular':
                return (b.downloads || 0) - (a.downloads || 0);
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });
    
    displayScripts(filtered);
}

function displayScripts(scripts) {
    const grid = document.getElementById('scriptsGrid');
    
    if (scripts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Scripts Found</h3>
                <p>No scripts match your search criteria</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = scripts.map(script => `
        <div class="script-card" data-id="${script.id}">
            <div class="script-card-header">
                <h3>${escapeHtml(script.name)}</h3>
                <span class="category-badge">${escapeHtml(script.category)}</span>
            </div>
            <div class="script-card-body">
                <p class="script-description">${escapeHtml(script.description)}</p>
                <div class="script-meta">
                    <span class="meta-item">
                        <i class="fas fa-user"></i>
                        ${escapeHtml(script.author)}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-download"></i>
                        ${script.downloads || 0}
                    </span>
                </div>
            </div>
            <div class="script-card-footer">
                <span class="script-date">${formatDate(script.timestamp)}</span>
                <button class="btn btn-primary btn-sm view-script-btn" data-id="${script.id}">
                    <i class="fas fa-eye"></i>
                    View
                </button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.view-script-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const scriptId = e.currentTarget.getAttribute('data-id');
            viewScript(scriptId);
        });
    });
}

function openUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.getElementById('uploadForm').reset();
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
    currentScriptId = null;
}

async function handleUploadScript(e) {
    e.preventDefault();
    
    const name = document.getElementById('scriptName').value.trim();
    const author = document.getElementById('scriptAuthor').value.trim();
    const category = document.getElementById('scriptCategory').value;
    const description = document.getElementById('scriptDescription').value.trim();
    const code = document.getElementById('scriptCode').value.trim();
    
    if (!name || !author || !category || !description || !code) {
        alert('Please fill in all required fields');
        return;
    }
    
    const scriptData = {
        name,
        author,
        category,
        description,
        code,
        timestamp: Date.now(),
        downloads: 0,
        ratings: { placeholder: true },
        averageRating: 0,
        ratingCount: 0
    };
    
    try {
        const newScriptRef = push(scriptsRef);
        await set(newScriptRef, scriptData);
        
        document.getElementById('uploadForm').reset();
        closeUploadModal();
        showNotification('Script uploaded successfully!', 'success');
    } catch (error) {
        console.error('Error uploading script:', error);
        console.error('Error details:', error.message);
        showNotification('Failed to upload script: ' + error.message, 'error');
    }
}

function viewScript(scriptId) {
    const script = allScripts.find(s => s.id === scriptId);
    if (!script) return;
    
    currentScriptId = scriptId;
    
    document.getElementById('viewScriptName').textContent = script.name;
    document.getElementById('viewScriptAuthor').textContent = script.author;
    document.getElementById('viewScriptCategory').textContent = script.category;
    document.getElementById('viewScriptDate').textContent = formatDate(script.timestamp);
    document.getElementById('viewScriptDownloads').textContent = `${script.downloads || 0} downloads`;
    document.getElementById('viewScriptDescription').textContent = script.description;
    document.getElementById('viewScriptCode').textContent = script.code;
    
    updateRatingDisplay(script);
    loadUserRating(scriptId);
    
    document.getElementById('viewModal').classList.add('active');
    
    incrementDownloads(scriptId);
}

async function incrementDownloads(scriptId) {
    const script = allScripts.find(s => s.id === scriptId);
    if (!script) return;
    
    const newDownloads = (script.downloads || 0) + 1;
    const scriptRef = ref(database, `scripts/${scriptId}`);
    
    try {
        await update(scriptRef, { downloads: newDownloads });
    } catch (error) {
        console.error('Error updating downloads:', error);
    }
}

function copyScriptCode() {
    const code = document.getElementById('viewScriptCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Code copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy code', 'error');
    });
}

function loadToEditor() {
    const code = document.getElementById('viewScriptCode').textContent;
    localStorage.setItem('pendingScript', code);
    window.location.href = 'index';
}

function setupRatingStars() {
    const ratingStarsInput = document.getElementById('ratingStarsInput');
    const stars = ratingStarsInput.querySelectorAll('i');
    
    stars.forEach((star, index) => {
        star.addEventListener('mouseenter', () => {
            highlightStars(index + 1);
        });
        
        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            submitRating(rating);
        });
    });
    
    ratingStarsInput.addEventListener('mouseleave', () => {
        const userRating = getUserRating();
        if (userRating) {
            highlightStars(userRating);
        } else {
            highlightStars(0);
        }
    });
}

function highlightStars(count) {
    const stars = document.querySelectorAll('#ratingStarsInput i');
    stars.forEach((star, index) => {
        if (index < count) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

function getUserRating() {
    if (!currentScriptId) return null;
    const userRatings = JSON.parse(localStorage.getItem('userRatings') || '{}');
    return userRatings[currentScriptId] || null;
}

function loadUserRating(scriptId) {
    const userRatings = JSON.parse(localStorage.getItem('userRatings') || '{}');
    const userRating = userRatings[scriptId];
    
    if (userRating) {
        highlightStars(userRating);
    } else {
        highlightStars(0);
    }
}

async function submitRating(rating) {
    if (!currentScriptId) return;
    
    const script = allScripts.find(s => s.id === currentScriptId);
    if (!script) return;
    
    const userId = getUserId();
    const scriptRef = ref(database, `scripts/${currentScriptId}`);
    
    try {
        const ratings = script.ratings || {};
        ratings[userId] = rating;
        
        const ratingValues = Object.values(ratings);
        const averageRating = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
        const ratingCount = ratingValues.length;
        
        await update(scriptRef, {
            ratings: ratings,
            averageRating: parseFloat(averageRating.toFixed(1)),
            ratingCount: ratingCount
        });
        
        const userRatings = JSON.parse(localStorage.getItem('userRatings') || '{}');
        userRatings[currentScriptId] = rating;
        localStorage.setItem('userRatings', JSON.stringify(userRatings));
        
        highlightStars(rating);
        showNotification(`Rated ${rating} stars!`, 'success');
        
    } catch (error) {
        console.error('Error submitting rating:', error);
        showNotification('Failed to submit rating', 'error');
    }
}

function updateRatingDisplay(script) {
    const averageRating = script.averageRating || 0;
    const ratingCount = script.ratingCount || 0;
    
    document.getElementById('viewRatingAverage').textContent = averageRating.toFixed(1);
    document.getElementById('viewRatingCount').textContent = ratingCount;
    
    const displayStars = document.querySelectorAll('#viewRatingStars i');
    const fullStars = Math.floor(averageRating);
    const hasHalfStar = averageRating % 1 >= 0.5;
    
    displayStars.forEach((star, index) => {
        star.classList.remove('fas', 'far', 'fa-star', 'fa-star-half-alt');
        
        if (index < fullStars) {
            star.classList.add('fas', 'fa-star');
        } else if (index === fullStars && hasHalfStar) {
            star.classList.add('fas', 'fa-star-half-alt');
        } else {
            star.classList.add('far', 'fa-star');
        }
    });
}

function getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('userId', userId);
    }
    return userId;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', initializeMarketplace);
