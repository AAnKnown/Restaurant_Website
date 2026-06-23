document.addEventListener('DOMContentLoaded', () => {
    loadOffers();
    checkAdminAccess();

    const offerForm = document.getElementById('offerForm');
    if (offerForm) {
        offerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('offerTitle').value;
            const description = document.getElementById('offerDesc').value;

            try {
                const res = await fetch('/api/save-offer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description })
                });

                if (res.ok) {
                    alert("Η προσφορά αποθηκεύτηκε!");
                    loadOffers(); 
                    offerForm.reset();
                } else {
                    const errorData = await res.json();
                    alert("Σφάλμα: " + (errorData.error || "Αποτυχία αποθήκευσης"));
                }
            } catch (err) {
                console.error("Save offer failed:", err);
            }
        });
    }
});

async function checkAdminAccess() {
    const adminSection = document.getElementById('admin-section');
    if (!adminSection) return; 

    try {
        const res = await fetch('/api/check-auth');
        const data = await res.json();

        if (data.loggedIn && data.role === 'admin') { 
            adminSection.style.display = 'block';
        } else {
            adminSection.style.display = 'none';
        }
    } catch (err) {
        console.error("Admin check failed:", err);
    }
}

async function loadOffers() {
    try {
        const res = await fetch('/api/get-offers');
        const offers = await res.json();
        const container = document.getElementById('offersList');
        
        if (container) {
            container.innerHTML = ''; 
            
            if (offers.length === 0) {
                container.innerHTML = '<p>Δεν υπάρχουν ενεργές προσφορές αυτή τη στιγμή.</p>';
                return;
            }

            offers.forEach(offer => {
                const card = document.createElement('div');
                card.className = 'offer-card';
                card.innerHTML = `
                    <h3>${offer.title}</h3>
                    <p>${offer.description}</p>
                    <small>Δημοσιεύτηκε: ${offer.date}</small>
                `;
                container.appendChild(card);
            });
        }
    } catch (err) {
        console.error("Load offers failed:", err);
    }
}