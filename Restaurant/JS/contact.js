document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const successMessage = document.getElementById('successMessage');

    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault(); 

            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    contactForm.style.display = 'none';
                    successMessage.style.display = 'block';
                    successMessage.innerHTML = `
                        <h3>Ευχαριστούμε, ${formData.name}!</h3>
                        <p>Το μήνυμά σας στάλθηκε με επιτυχία. Θα επικοινωνήσουμε μαζί σας σύντομα.</p>
                    `;
                } else {
                    const result = await response.json();
                    alert("Σφάλμα: " + (result.error || "Η αποστολή απέτυχε."));
                }
            } catch (error) {
                console.error("Contact Error:", error);
                alert("Παρουσιάστηκε πρόβλημα κατά την αποστολή του μηνύματος.");
            }
        });
    }
});