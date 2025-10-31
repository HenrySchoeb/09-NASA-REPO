// Beginner-friendly JS: fetch APOD-style feed, show a random space fact,
// handle image + video entries, build gallery, and show modal with details.

// Use this URL to fetch NASA APOD JSON data (class-provided CDN feed).
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Fallback local paths (in case students put the JSON in the repo)
const FEED_PATHS = [
  'data/mock-apod.json',
  'data/apod.json',
  'mock-apod.json',
  'apod.json',
  'feed.json'
];

// Find DOM elements from index.html
const getBtn = document.querySelector('#getImageBtn');
const gallery = document.querySelector('#gallery');

// Create or find a loading message element
let loadingEl = document.querySelector('#loading-message');
if (!loadingEl) {
  loadingEl = document.createElement('div');
  loadingEl.id = 'loading-message';
  loadingEl.textContent = '🔄 Loading space photos…';
  loadingEl.style.padding = '1rem';
  loadingEl.style.fontWeight = '600';
  loadingEl.style.display = 'none';
  if (gallery && gallery.parentNode) gallery.parentNode.insertBefore(loadingEl, gallery);
  else document.body.appendChild(loadingEl);
}

// Create a place for a random "Did you know?" fact
let factEl = document.querySelector('#space-fact');
if (!factEl) {
  factEl = document.createElement('div');
  factEl.id = 'space-fact';
  factEl.style.padding = '0.8rem 1rem';
  factEl.style.borderRadius = '8px';
  factEl.style.marginBottom = '1rem';
  factEl.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))';
  factEl.style.color = '#eaf3ff';
  factEl.style.fontWeight = '600';
  if (gallery && gallery.parentNode) gallery.parentNode.insertBefore(factEl, gallery);
  else document.body.appendChild(factEl);
}

// Create a reusable modal for details (basic inline styles for beginners)
let modal = document.querySelector('#apod-modal');
if (!modal) {
  modal = document.createElement('div');
  modal.id = 'apod-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.display = 'none';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.backgroundColor = 'rgba(0,0,0,0.75)';
  modal.style.zIndex = '9999';
  // container for modal content
  const content = document.createElement('div');
  content.id = 'apod-modal-content';
  content.style.maxWidth = '900px';
  content.style.width = '90%';
  content.style.maxHeight = '90%';
  content.style.overflow = 'auto';
  content.style.background = '#071227';
  content.style.borderRadius = '8px';
  content.style.padding = '1rem';
  modal.appendChild(content);

  // Close when clicking on overlay
  modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
  // Close on Escape for accessibility
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });

  document.body.appendChild(modal);
}

// --- Random space facts (will show one at load) ---
const SPACE_FACTS = [
  'Did you know? A day on Venus is longer than a year on Venus.',
  'Did you know? The hottest planet is not the closest to the Sun — it\'s Venus due to its thick atmosphere.',
  'Did you know? Neutron stars can spin up to 700 times per second.',
  'Did you know? One spoonful of neutron star would weigh about 6 billion tons on Earth.',
  'Did you know? Space is not completely empty — it contains sparse gas, dust, and cosmic rays.',
  'Did you know? Jupiter has the strongest magnetic field of any planet in the Solar System.',
  'Did you know? The largest volcano in the Solar System is on Mars (Olympus Mons).',
  'Did you know? There are more trees on Earth than stars in the Milky Way (by some estimates).',
  'Did you know? The observable universe is about 93 billion light-years across.',
  'Did you know? A year on Mercury is just 88 Earth days.'
];

// Pick and display a random fact
function showRandomFact() {
  const idx = Math.floor(Math.random() * SPACE_FACTS.length);
  factEl.textContent = SPACE_FACTS[idx];
}

// --- Helpers for fetching JSON ---
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} when fetching ${path}`);
  return res.json();
}

// Try the CDN feed first, then fall back to local feed paths
async function fetchFeed() {
  // First try the class-provided CDN JSON (recommended)
  try {
    const data = await fetchJSON(apodData);
    if (Array.isArray(data) && data.length) return data;
    if (data && typeof data === 'object') return Object.values(data);
  } catch (err) {
    // ignore and try local files
    // eslint-disable-next-line no-console
    console.warn(`CDN feed failed: ${err.message}`);
  }

  // Try local fallback files
  for (const path of FEED_PATHS) {
    try {
      const data = await fetchJSON(path);
      if (Array.isArray(data) && data.length) return data;
      if (data && typeof data === 'object') return Object.values(data);
    } catch (_) {
      // continue to next path
    }
  }

  throw new Error('Could not load APOD feed from CDN or local paths.');
}

// Simple loading UI controls
function showLoading() {
  loadingEl.style.display = 'block';
  if (gallery) gallery.style.display = 'none';
}
function hideLoading() {
  loadingEl.style.display = 'none';
  if (gallery) gallery.style.display = '';
}

// --- Video helpers ---
// Try to extract a YouTube video ID from a URL
function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v');
    }
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1);
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Build gallery card thumbnail for images and videos
function getThumbnailForItem(item) {
  // If feed provides a thumbnail_url, use it
  if (item.thumbnail_url) return item.thumbnail_url;
  // If it's a YouTube URL, build thumbnail from ID
  const ytId = extractYouTubeId(item.url || '');
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  // If item has hdurl or url (image), use it
  if (item.media_type === 'image' && (item.url || item.hdurl)) return item.url || item.hdurl;
  // No thumbnail available — return null so caller can render placeholder
  return null;
}

// Build the gallery grid from feed items
function buildGallery(items) {
  if (!gallery) return;
  gallery.innerHTML = '';

  // Apply simple grid layout (CSS file may override)
  gallery.style.display = 'grid';
  gallery.style.gridTemplateColumns = 'repeat(auto-fit, minmax(260px, 1fr))';
  gallery.style.gap = '1rem';
  gallery.style.padding = '1rem';

  items.forEach((item) => {
    // Ensure we have basic fields
    const {
      title = 'Untitled',
      date = '',
      explanation = '',
      media_type = 'image',
      url = '',
      hdurl = '',
      thumbnail_url = ''
    } = item;

    const card = document.createElement('article');
    card.className = 'apod-card';
    card.style.borderRadius = '8px';
    card.style.overflow = 'hidden';
    card.style.cursor = 'pointer';
    card.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))';

    // Media container (keeps overflow hidden for hover-zoom)
    const mediaWrap = document.createElement('div');
    mediaWrap.style.height = '180px';
    mediaWrap.style.overflow = 'hidden';
    mediaWrap.style.display = 'flex';
    mediaWrap.style.alignItems = 'center';
    mediaWrap.style.justifyContent = 'center';
    mediaWrap.style.background = '#000';

    const thumb = getThumbnailForItem(item);
    if (thumb) {
      const img = document.createElement('img');
      img.src = thumb;
      img.alt = title;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.transition = 'transform 260ms ease';
      img.style.transformOrigin = 'center center';
      // Hover zoom handled by CSS in style.css; inline fallback
      mediaWrap.appendChild(img);
      // Keep a11y: indicate it's a video if applicable
      if (media_type === 'video') {
        img.setAttribute('aria-label', `${title} (video thumbnail)`);
      }
    } else {
      // No thumbnail; show a simple placeholder
      const placeholder = document.createElement('div');
      placeholder.style.color = '#fff';
      placeholder.style.fontWeight = '700';
      placeholder.style.textAlign = 'center';
      placeholder.innerHTML = `${media_type === 'video' ? '▶' : '🖼️'}<div style="font-size:0.9rem;margin-top:6px;">${media_type === 'video' ? 'Video' : 'Media'}</div>`;
      mediaWrap.appendChild(placeholder);
    }

    // Info area with title and date
    const info = document.createElement('div');
    info.style.padding = '0.75rem';
    info.style.display = 'flex';
    info.style.flexDirection = 'column';
    info.style.gap = '0.4rem';
    info.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.35))';
    info.style.color = '#fff';

    const h3 = document.createElement('h3');
    h3.textContent = title;
    h3.style.margin = '0';
    h3.style.fontSize = '1rem';
    h3.style.lineHeight = '1.2';

    const time = document.createElement('time');
    time.textContent = date;
    time.style.color = 'rgba(255,255,255,0.82)';
    time.style.fontSize = '0.9rem';

    info.appendChild(h3);
    info.appendChild(time);

    card.appendChild(mediaWrap);
    card.appendChild(info);

    // Click: open modal with full details (embed video when possible)
    card.addEventListener('click', () => openModal({ title, date, explanation, media_type, url, hdurl, thumbnail_url }));

    gallery.appendChild(card);
  });
}

// Build and show modal content for one item
function openModal(item) {
  const content = document.querySelector('#apod-modal-content');
  if (!content) return;
  content.innerHTML = '';

  // Header with title and close button
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.gap = '1rem';

  const titleEl = document.createElement('h2');
  titleEl.textContent = item.title || '';
  titleEl.style.margin = '0';
  titleEl.style.fontSize = '1.25rem';
  titleEl.style.color = '#0b3d91';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cursor = 'pointer';
  closeBtn.addEventListener('click', hideModal);

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const dateEl = document.createElement('p');
  dateEl.textContent = item.date || '';
  dateEl.style.marginTop = '0.25rem';
  dateEl.style.color = 'rgba(255,255,255,0.85)';

  const mediaArea = document.createElement('div');
  mediaArea.style.marginTop = '0.6rem';
  mediaArea.style.display = 'flex';
  mediaArea.style.justifyContent = 'center';

  if (item.media_type === 'image' && (item.hdurl || item.url)) {
    const img = document.createElement('img');
    img.src = item.hdurl || item.url;
    img.alt = item.title || 'NASA image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '6px';
    mediaArea.appendChild(img);
  } else if (item.media_type === 'video' && item.url) {
    // If it's a YouTube URL, embed with proper embed URL
    const ytId = extractYouTubeId(item.url);
    if (ytId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${ytId}`;
      iframe.width = '100%';
      iframe.height = '480';
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.allowFullscreen = true;
      iframe.style.border = '0';
      mediaArea.appendChild(iframe);
    } else {
      // Generic video URL: try embedding, otherwise provide link
      try {
        const iframe = document.createElement('iframe');
        iframe.src = item.url;
        iframe.width = '100%';
        iframe.height = '480';
        iframe.style.border = '0';
        mediaArea.appendChild(iframe);
      } catch (e) {
        const link = document.createElement('a');
        link.href = item.url;
        link.textContent = 'Open video';
        link.target = '_blank';
        mediaArea.appendChild(link);
      }
    }
  } else {
    const p = document.createElement('p');
    p.textContent = 'Media not available.';
    mediaArea.appendChild(p);
  }

  const explanation = document.createElement('p');
  explanation.textContent = item.explanation || '';
  explanation.style.marginTop = '0.8rem';
  explanation.style.whiteSpace = 'pre-wrap';
  explanation.style.color = 'rgba(255,255,255,0.92)';

  content.appendChild(header);
  content.appendChild(dateEl);
  content.appendChild(mediaArea);
  content.appendChild(explanation);

  // Show modal and focus the close button for accessibility
  modal.style.display = 'flex';
  closeBtn.focus();
}

function hideModal() {
  modal.style.display = 'none';
}

// Initialize behavior: attach click handler to the button
async function init() {
  showRandomFact();

  // Action to fetch and show feed
  const runFetch = async () => {
    try {
      showLoading();
      const items = await fetchFeed();
      hideLoading();
      buildGallery(items);
    } catch (err) {
      hideLoading();
      if (gallery) {
        gallery.innerHTML = `<p style="padding:1rem;color:crimson;">Error loading images: ${err.message}</p>`;
      }
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  if (getBtn) {
    getBtn.addEventListener('click', runFetch);
  } else {
    // Auto-run if button missing
    await runFetch();
  }
}

// Start the script
init();