const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer'); // Για την αποστολή email

const app = express();
const PORT = 3000;

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./')); // Σερβίρει HTML, CSS, JS από το root

// Ρύθμιση Sessions
app.use(session({
    secret: 'restaurant_super_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }
}));

// --- Ρύθμιση Nodemailer (ΠΡΟΣΘΗΚΗ) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // Το email σου
        pass: 'your-app-password'      // Ο κωδικός εφαρμογής Google
    }
});

// --- Σύνδεση με MySQL ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // ΑΝΤΙΚΑΤΑΣΤΗΣΕ ΜΕ ΤΟΝ ΚΩΔΙΚΟ ΣΟΥ
    database: 'restaurant_db'
});

db.connect(err => {
    if (err) {
        console.error('Σφάλμα σύνδεσης στη MySQL:', err);
        return;
    }
    console.log('Συνδέθηκε επιτυχώς στη βάση δεδομένων MySQL.');
});

// --- AUTHENTICATION ENDPOINTS ---

// Εγγραφή Χρήστη
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
        db.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) return res.status(500).json({ error: "Το email υπάρχει ήδη." });
            res.json({ message: "Η εγγραφή ολοκληρώθηκε!" });
        });
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

// Είσοδος Χρήστη
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: "Λάθος email ή κωδικός" });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.userEmail = user.email;
            req.session.role = user.role;
            res.json({ 
                message: "Login success", 
                username: user.username,
                role: user.role
            });
        } else {
            res.status(401).json({ error: "Λάθος email ή κωδικός" });
        }
    });
});
// Endpoint για Αποσύνδεση
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).send("Logout Error");
        res.clearCookie('connect.sid'); // Καθαρίζει το cookie του session
        res.json({ message: "Logged out successfully" });
    });
});

// Endpoint για έλεγχο αν ο χρήστης είναι ήδη συνδεδεμένος (για το UI)
app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            loggedIn: true, 
            username: req.session.username,
            role: req.session.role
        });
    } else {
        res.json({ loggedIn: false });
    }
});
// --- RESERVATION ENDPOINTS ---

// Έλεγχος διαθεσιμότητας τραπεζιών για συγκεκριμένη ημερομηνία & ώρα
app.get('/api/tables-availability', (req, res) => {
    const { date, time } = req.query;
    const sql = `
        SELECT t.*, 
        (SELECT COUNT(*) FROM reservations r 
         WHERE r.table_id = t.id AND r.res_date = ? AND r.res_time = ?) as is_booked
        FROM tables t`;

    db.query(sql, [date, time], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Δημιουργία Κράτησης & Αποστολή Email
app.post('/make-reservation', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send("Login required");
    }
    const { table_id, res_date, res_time } = req.body;
    const user_email = req.session.userEmail;
    const username = req.session.username;

    // 1. Αποθήκευση στη Βάση (MySQL)
    const sql = "INSERT INTO reservations (user_id, table_id, res_date, res_time) VALUES (?, ?, ?, ?)";
    db.query(sql, [req.session.userId, table_id, res_date, res_time], (err, result) => {
        if (err) return res.status(500).send("Database Error");

        // 2. Ενημέρωση κατάστασης τραπεζιού
        db.query("UPDATE tables SET status = 'occupied' WHERE id = ?", [table_id]);

        // 3. Αποστολή Επιβεβαιωτικού Email
        const mailOptions = {
            from: 'GourmetResto <your-email@gmail.com>',
            to: user_email, // Το email του πελάτη
            subject: 'Επιβεβαίωση Κράτησης - GourmetResto',
            html: `
                <h1>Γεια σας, ${username}!</h1>
                <p>Η κράτησή σας για το <b>Τραπέζι ${table_id}</b> ολοκληρώθηκε με επιτυχία.</p>
                <ul>
                    <li><strong>Ημερομηνία:</strong> ${res_date}</li>
                    <li><strong>Ώρα:</strong> ${res_time}</li>
                </ul>
                <p>Σας περιμένουμε!</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log("Email error: " + error);
                return res.json({ message: "Η κράτηση έγινε, αλλά το email απέτυχε." });
            }
            res.json({ message: "Η κράτηση ολοκληρώθηκε και σας στάλθηκε email επιβεβαίωσης!" });
        });
    });
});

// --- JSON OFFERS ENDPOINTS ---

// Λήψη προσφορών από JSON
app.get('/api/get-offers', (req, res) => {
    fs.readFile('./data/offers.json', 'utf8', (err, data) => {
        if (err) return res.status(500).send("Error reading JSON");
        res.json(JSON.parse(data || "[]"));
    });
});

// Αποθήκευση νέας προσφοράς στο JSON
app.post('/api/save-offer', (req, res) => {
    // Έλεγχος αν ο χρήστης στο session είναι ο Admin
    if (!req.session.userId || req.session.role !== 'αdmin') {
        return res.status(403).json({ error: "Μη εξουσιοδοτημένη ενέργεια" });
    }

    const newOffer = req.body;
    const filePath = './data/offers.json';

    fs.readFile(filePath, 'utf8', (err, data) => {
        const offers = JSON.parse(data || "[]");
        offers.push({ ...newOffer, date: new Date().toLocaleDateString('el-GR') });

        fs.writeFile(filePath, JSON.stringify(offers, null, 2), (err) => {
            if (err) return res.status(500).send("Error writing JSON");
            res.json({ message: "Η προσφορά αποθηκεύτηκε!" });
        });
    });
});

// Endpoint για τη φόρμα επικοινωνίας
app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body;

    const mailOptions2 = {
        from: email,
        to: 'your-email@gmail.com', // Το email σου όπου θα δέχεσαι τα μηνύματα
        subject: `Επικοινωνία από Site: ${subject}`,
        text: `Όνομα: ${name}\nEmail: ${email}\nΜήνυμα: ${message}`
    };

    transporter.sendMail(mailOptions2, (err, info) => {
        if (err) return res.status(500).json({ error: "Αποτυχία email" });
        res.json({ message: "Εστάλη!" });
    });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});