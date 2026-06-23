document.addEventListener('DOMContentLoaded', () => {

    const dateInput = document.getElementById('resDate');
    const today = new Date().toISOString().split('T')[0];
    
    if (dateInput) {
        dateInput.setAttribute('min', today);
        dateInput.value = today; 
    }
    fetchTables();

    if (dateInput) dateInput.addEventListener('change', fetchTables);
    const timeInput = document.getElementById('resTime');
    if (timeInput) timeInput.addEventListener('change', fetchTables);
});

async function fetchTables() {
    const date = document.getElementById('resDate').value;
    const time = document.getElementById('resTime').value;
    const container = document.getElementById('tableContainer');

    if (!date || !time) {
        return;
    }

    container.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Γίνεται έλεγχος διαθεσιμότητας...</p>';

    try {

        const response = await fetch(`/api/tables-availability?date=${date}&time=${time}`);
        
        if (!response.ok) throw new Error("Σφάλμα κατά την ανάκτηση δεδομένων");

        const tables = await response.json();
        renderTables(tables, date, time);
    } catch (error) {
        console.error("Error:", error);
        container.innerHTML = '<p style="grid-column: 1/-1; color: red; text-align:center;">Αποτυχία σύνδεσης με τον διακομιστή.</p>';
    }
}

function renderTables(tables, selectedDate, selectedTime) {
    const container = document.getElementById('tableContainer');
    container.innerHTML = ''; 

    if (tables.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Δεν βρέθηκαν τραπέζια.</p>';
        return;
    }

    tables.forEach(table => {
        const div = document.createElement('div');
        
        const isOccupied = table.is_booked > 0;
        
        div.className = `table ${isOccupied ? 'occupied' : 'available'}`;
        
        div.innerHTML = `
            <div class="table-label">Τραπέζι</div>
            <div class="table-id">${table.table_number}</div>
            <div class="table-cap-box">
                <span class="table-capacity">${table.capacity} άτομα</span>
            </div>
        `;

        if (!isOccupied) {
            div.title = "Κάντε κλικ για κράτηση";
            div.onclick = () => bookTable(table.id, table.table_number, selectedDate, selectedTime);
        } else {
            div.title = "Το τραπέζι είναι ήδη κρατημένο για αυτή την ώρα";
        }

        container.appendChild(div);
    });
}

async function bookTable(tableId, tableNum, date, time) {
    const confirmBooking = confirm(`Επιβεβαίωση κράτησης για το Τραπέζι ${tableNum}\nΗμερομηνία: ${date}\nΏρα: ${time}`);
    
    if (!confirmBooking) return;

    try {
        const response = await fetch('/make-reservation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table_id: tableId,
                res_date: date,
                res_time: time
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert("Η κράτησή σας ολοκληρώθηκε με επιτυχία! Θα λάβετε email επιβεβαίωσης.");
            fetchTables(); 
        } else {
            if (response.status === 401) {
                alert("Πρέπει να συνδεθείτε για να κάνετε κράτηση.");
                window.location.href = 'auth.html';
            } else {
                alert("Σφάλμα: " + (result.error || "Η κράτηση απέτυχε."));
            }
        }
    } catch (error) {
        console.error("Booking Error:", error);
        alert("Παρουσιάστηκε πρόβλημα κατά την αποστολή της κράτησης.");
    }
}