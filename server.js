const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const fetch = require('node-fetch');
const app = express();

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Configure EJS as the view engine
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MySQL database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456789', // Replace with your MySQL password
    database: 'book_recommendations'
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL Connected');
});

// Home route (login page)
app.get('/', (req, res) => {
    res.render('index');
});

// Recommendations page route
app.get('/recommendations', (req, res) => {
    db.query('SELECT * FROM books LIMIT 5', (err, results) => {
        if (err) throw err;
        res.render('recommendations', { books: results });
    });
});

// Recommend route (by genre)
app.post('/recommend', (req, res) => {
    const genre = req.body.genre;
    db.query('SELECT * FROM books WHERE genre = ?', [genre], (err, results) => {
        if (err) throw err;
        res.render('recommendations', { books: results });
    });
});

// Book list route
app.get('/books', (req, res) => {
    db.query('SELECT title, author, genre, rating, year_of_publication FROM books', (err, results) => {
        if (err) throw err;
        res.render('books', { books: results });
    });
});

// Bulk import route
app.post('/import-csv', upload.single('csvFile'), (req, res) => {
    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            const query = 'INSERT INTO books (title, author, genre, description, rating, year_of_publication) VALUES ?';
            const values = results.map(row => [
                row.title,
                row.author,
                row.genre,
                row.description || '',
                parseFloat(row.rating) || 0,
                parseInt(row.year_of_publication) || null
            ]);

            db.query(query, [values], (err) => {
                if (err) throw err;
                fs.unlinkSync(req.file.path);
                res.redirect('/books');
            });
        });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        // Add your actual authentication logic here
        // For now, keeping the simple check
        res.json({ success: true });
    } else {
        res.json({ success: false, error: 'Invalid credentials' });
    }
});

// Register route (assuming you have a users table)
app.post('/register', (req, res) => {
    const { username, age, password } = req.body;
    // Basic validation
    if (!username || !age || !password) {
        return res.json({ success: false, error: 'All fields are required' });
    }
    
    // Insert user into database (you'll need a users table)
    const query = 'INSERT INTO users (username, age, password) VALUES (?, ?, ?)';
    db.query(query, [username, age, password], (err) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, error: 'Registration failed' });
        }
        res.json({ success: true });
    });
});

// Health check route (for script.js checkServerStatus)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Search route (display search form)
app.get('/search', (req, res) => {
    res.render('search', { recommendations: [] });
});

// Search recommendation route (connect to Python ML engine)
app.post('/search-recommend', async (req, res) => {
    const { title, author, genre, year } = req.body;

    try {
        const response = await fetch('http://localhost:5000/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author, genre, year })
        });
        const data = await response.json();
        res.render('search', { recommendations: data.recommendations });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.render('search', { recommendations: [], error: 'Failed to fetch recommendations' });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});