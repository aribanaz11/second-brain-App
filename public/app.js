let token = localStorage.getItem('token');
let authMode = 'signin';

document.addEventListener('DOMContentLoaded', () => {
    // Check if URL has a share hash
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
        const hash = path.split('/share/')[1];
        loadSharedBrain(hash);
    } else {
        updateNav();
        if (token) {
            navigate('dashboard');
        } else {
            navigate('auth');
        }
    }
});

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    toast.style.backgroundColor = isError ? '#ef4444' : '#10b981';
    toast.classList.remove('translate-x-full');
    setTimeout(() => toast.classList.add('translate-x-full'), 3000);
}

function navigate(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    if (viewId === 'dashboard') {
        fetchContent();
    }
}

function updateNav() {
    const nav = document.getElementById('nav-actions');
    if (token) {
        nav.innerHTML = `<button onclick="logout()" class="hover:text-gray-300 font-medium"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>`;
    } else {
        nav.innerHTML = ``;
    }
}

function toggleAuthMode() {
    authMode = authMode === 'signin' ? 'signup' : 'signin';
    document.getElementById('auth-title').innerText = authMode === 'signin' ? 'Login to Your Brain' : 'Create an Account';
    document.getElementById('auth-switch-text').innerText = authMode === 'signin' ? "Don't have an account?" : "Already have an account?";
    document.getElementById('auth-switch-btn').innerText = authMode === 'signin' ? 'Sign Up' : 'Login';
}

async function handleAuth(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;

    try {
        const res = await fetch(`/api/v1/${authMode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            if (authMode === 'signup') {
                showToast('Signup successful! You can now login.');
                toggleAuthMode();
            } else {
                token = data.token;
                localStorage.setItem('token', token);
                updateNav();
                navigate('dashboard');
                showToast('Logged in successfully!');
            }
        } else {
            showToast(data.message || 'Auth failed', true);
        }
    } catch (err) {
        showToast('Network error', true);
    }
}

function logout() {
    token = null;
    localStorage.removeItem('token');
    updateNav();
    navigate('auth');
}

// --- Content Management ---
async function fetchContent() {
    try {
        const res = await fetch('/api/v1/content', {
            headers: { 'Authorization': token }
        });
        const data = await res.json();
        renderContent(data.content, 'content-grid', true);
    } catch (err) {
        showToast('Error loading content', true);
    }
}

function renderContent(items, containerId, canDelete) {
    const container = document.getElementById(containerId);
    if (!items || items.length === 0) {
        container.innerHTML = `<p class="col-span-full text-gray-500 italic">No content saved yet. Add something!</p>`;
        return;
    }

    container.innerHTML = items.map(item => {
        let icon = 'fa-link';
        let color = 'text-gray-500';
        
        if (item.type === 'youtube') { icon = 'fa-youtube'; color = 'text-red-500'; }
        if (item.type === 'twitter') { icon = 'fa-twitter'; color = 'text-blue-400'; }
        if (item.type === 'article') { icon = 'fa-newspaper'; color = 'text-green-500'; }

        return `
            <div class="bg-white rounded-lg shadow border p-4 flex flex-col relative group">
                ${canDelete ? `<button onclick="deleteContent('${item._id}')" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><i class="fa-solid fa-trash"></i></button>` : ''}
                <div class="flex items-center gap-2 mb-3">
                    <i class="fa-brands ${icon} ${color} text-2xl"></i>
                    <h3 class="font-bold text-lg truncate pr-6">${item.title}</h3>
                </div>
                <a href="${item.link}" target="_blank" class="text-indigo-600 hover:underline text-sm truncate mb-4">${item.link}</a>
                <div class="mt-auto pt-4 border-t text-xs text-gray-400 flex justify-between">
                    <span class="uppercase font-semibold tracking-wider">${item.type}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function handleAddContent(e) {
    e.preventDefault();
    const title = document.getElementById('content-title').value;
    const link = document.getElementById('content-link').value;
    const type = document.getElementById('content-type').value;

    try {
        const res = await fetch('/api/v1/content', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            },
            body: JSON.stringify({ title, link, type })
        });
        if (res.ok) {
            showToast('Added to your brain!');
            closeAddModal();
            fetchContent();
        } else {
            showToast('Failed to add content', true);
        }
    } catch (err) {
        showToast('Network error', true);
    }
}

async function deleteContent(contentId) {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
        const res = await fetch('/api/v1/content', {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            },
            body: JSON.stringify({ contentId })
        });
        if (res.ok) {
            showToast('Deleted successfully');
            fetchContent();
        }
    } catch (err) {
        showToast('Delete failed', true);
    }
}

// --- Modals ---
function openAddModal() {
    document.getElementById('addModal').classList.remove('hidden');
}
function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
    document.getElementById('add-content-form').reset();
}

// --- Sharing ---
async function shareBrain() {
    try {
        const res = await fetch('/api/v1/brain/share', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            },
            body: JSON.stringify({ share: true })
        });
        const data = await res.json();
        if (res.ok && data.hash) {
            const url = `${window.location.origin}/share/${data.hash}`;
            document.getElementById('share-link-input').value = url;
            document.getElementById('shareModal').classList.remove('hidden');
        }
    } catch (err) {
        showToast('Error generating link', true);
    }
}

function closeShareModal() {
    document.getElementById('shareModal').classList.add('hidden');
}

function copyShareLink() {
    const input = document.getElementById('share-link-input');
    input.select();
    document.execCommand('copy');
    showToast('Link copied to clipboard!');
}

async function disableShare() {
    try {
        const res = await fetch('/api/v1/brain/share', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            },
            body: JSON.stringify({ share: false })
        });
        if (res.ok) {
            showToast('Sharing disabled');
            closeShareModal();
        }
    } catch (err) {
        showToast('Error disabling share', true);
    }
}

// --- View Shared Brain ---
async function loadSharedBrain(hash) {
    try {
        const res = await fetch(`/api/v1/brain/${hash}`);
        const data = await res.json();
        
        if (res.ok) {
            navigate('shared');
            document.getElementById('shared-username').innerText = data.username;
            renderContent(data.content, 'shared-content-grid', false);
        } else {
            alert('Invalid or expired share link');
            window.location.href = '/';
        }
    } catch (err) {
        alert('Error loading shared brain');
        window.location.href = '/';
    }
}
