document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('.spinner-icon');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const releasesList = document.getElementById('releases-list');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const closeModal = document.getElementById('close-modal');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const confirmTweetBtn = document.getElementById('confirm-tweet-btn');
    
    // Toast elements
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    let currentReleases = [];

    // Helper functions
    const showToast = (message) => {
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    };

    // Helper to format date nicely
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    // Helper to strip HTML tags for simple tweet preview
    const stripHtml = (html) => {
        let doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    // Fetch releases from API
    const fetchReleases = async () => {
        // Toggle loader and states
        loadingState.classList.remove('hidden');
        releasesList.classList.add('hidden');
        errorState.classList.add('hidden');
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;

        try {
            const response = await fetch('/api/releases');
            const data = await response.json();

            if (data.success) {
                currentReleases = data.releases;
                renderReleases(data.releases);
                
                loadingState.classList.add('hidden');
                releasesList.classList.remove('hidden');
            } else {
                throw new Error(data.error || 'Unknown error occurred while fetching releases.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            errorMessage.textContent = error.message;
            loadingState.classList.add('hidden');
            errorState.classList.remove('hidden');
        } finally {
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    };

    // Render release cards to DOM
    const renderReleases = (releases) => {
        releasesList.innerHTML = '';
        
        if (releases.length === 0) {
            releasesList.innerHTML = `
                <div class="state-container">
                    <p>No release notes found.</p>
                </div>
            `;
            return;
        }

        releases.forEach((release, index) => {
            const card = document.createElement('div');
            card.className = 'release-card';
            
            // Format published date
            const dateText = formatDate(release.published);

            card.innerHTML = `
                <div class="release-card-header">
                    <div>
                        <span class="release-badge">BigQuery</span>
                        <div class="release-date">
                            <i class="fa-regular fa-calendar"></i> ${dateText}
                        </div>
                    </div>
                </div>
                <h2 class="release-card-title">${release.title}</h2>
                <div class="release-card-content">
                    ${release.summary}
                </div>
                <div class="release-card-actions">
                    <button class="btn btn-tweet open-tweet-btn" data-index="${index}">
                        <i class="fa-brands fa-x-twitter"></i> Tweet Update
                    </button>
                </div>
            `;

            releasesList.appendChild(card);
        });

        // Add event listeners to Tweet buttons
        document.querySelectorAll('.open-tweet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.getAttribute('data-index');
                openTweetModal(currentReleases[index]);
            });
        });
    };

    // Tweet Modal Logic
    const openTweetModal = (release) => {
        // Strip html and prepare text
        const cleanContent = stripHtml(release.summary).trim();
        // Truncate clean content to fit within tweet size
        // Standard template: "BigQuery Update: [Title] - [Truncated text] #BigQuery"
        const hashtagText = " #BigQuery #GoogleCloud";
        const titleText = `BigQuery Update: ${release.title}`;
        
        // Calculate max allowed length for clean content
        const linkText = release.link ? `\nRead more: ${release.link}` : '';
        const baseLength = titleText.length + hashtagText.length + linkText.length + 5; // 5 for formatting characters
        const maxContentLength = 280 - baseLength;

        let contentSnippet = cleanContent;
        if (contentSnippet.length > maxContentLength) {
            contentSnippet = contentSnippet.substring(0, maxContentLength - 3) + "...";
        }

        const defaultTweet = `${titleText}\n\n${contentSnippet}${linkText}${hashtagText}`;
        
        tweetTextarea.value = defaultTweet;
        updateCharCounter();
        
        tweetModal.classList.remove('hidden');
    };

    const updateCharCounter = () => {
        const len = tweetTextarea.value.length;
        charCount.textContent = len;
        
        // Dynamic color indication
        if (len > 280) {
            charCount.parentElement.className = 'tweet-char-counter danger';
            confirmTweetBtn.disabled = true;
        } else if (len > 250) {
            charCount.parentElement.className = 'tweet-char-counter warning';
            confirmTweetBtn.disabled = false;
        } else {
            charCount.parentElement.className = 'tweet-char-counter';
            confirmTweetBtn.disabled = false;
        }
    };

    const hideTweetModal = () => {
        tweetModal.classList.add('hidden');
    };

    // Event listeners
    refreshBtn.addEventListener('click', fetchReleases);
    retryBtn.addEventListener('click', fetchReleases);
    
    closeModal.addEventListener('click', hideTweetModal);
    cancelTweetBtn.addEventListener('click', hideTweetModal);
    
    tweetTextarea.addEventListener('input', updateCharCounter);
    
    confirmTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
        hideTweetModal();
        showToast("Opened Twitter in a new tab!");
    });

    // Initial Fetch
    fetchReleases();
});
