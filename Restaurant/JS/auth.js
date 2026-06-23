document.addEventListener('DOMContentLoaded', () => {
    updateMenu();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target.querySelector('input[type="email"]').value;
            const password = e.target.querySelector('input[type="password"]').value;

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Καλώς ήρθατε, ${data.username}!`);
                window.location.href = 'index.html';
            } else {
                alert("Λάθος στοιχεία σύνδεσης.");
            }
        });
    }
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = e.target.querySelectorAll('input')[0].value;
            const email = e.target.querySelectorAll('input')[1].value;
            const password = e.target.querySelectorAll('input')[2].value;

            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            if (res.ok) {
                alert("Η εγγραφή ολοκληρώθηκε! Τώρα μπορείτε να συνδεθείτε.");
                showForm('login');
            } else {
                alert("Σφάλμα κατά την εγγραφή (ίσως το email υπάρχει ήδη).");
            }
        });
    }
});
function showForm(type) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');

    if (!loginForm || !registerForm) return;

    if (type === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        if (loginBtn) loginBtn.classList.add('active-tab');
        if (registerBtn) registerBtn.classList.remove('active-tab');
    } else {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        if (registerBtn) registerBtn.classList.add('active-tab');
        if (loginBtn) loginBtn.classList.remove('active-tab');
    }
}
async function updateMenu() {
    const authNav = document.getElementById('auth-nav');
    if (!authNav) return;

    try {
        const res = await fetch('/api/check-auth');
        const data = await res.json();

        if (data.loggedIn) {
            authNav.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="color:#d4af37; font-weight:bold;">${data.username}</span>
                    <a href="#" id="logoutBtn" class="btn-auth" style="background:#e74c3c;">Log Out</a>
                </div>
            `;
            
            document.getElementById('logoutBtn').addEventListener('click', logout);
        }
    } catch (err) {
        console.error("Auth check failed", err);
    }
}

async function logout(e) {
    if (e) e.preventDefault();
    const res = await fetch('/api/logout', { method: 'POST' });
    if (res.ok) {
        alert("Αποσυνδεθήκατε επιτυχώς.");
        window.location.href = 'index.html';
    }
}