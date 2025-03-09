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

app.get('/recommendations', (req, res) => {
    res.render('recommendations', { books: [] }); // Render without fetching books
});

app.post('/recommend', (req, res) => {
    const genre = req.body.genre; // Corrected field
    db.query('SELECT title, author FROM books WHERE genre LIKE ?', 
    [`%${genre}%`], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Database error');
        }
        console.log('Query Results:', results); // Debugging output
        res.render('recommendations', { books: results });
    });
});





// Book list route
app.get('/books', (req, res) => {
    db.query('SELECT title, author, publisher, year_of_publication FROM books', (err, results) => {
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
            const query = 'INSERT INTO books (isbn, title, author, year_of_publication, publisher, image_url_s, image_url_m, image_url_l) VALUES ?';
            const values = results.map(row => [
                row.isbn || '',
                row.title || '',
                row.author || '',
                parseInt(row.year_of_publication) || null,
                row.publisher || '',
                row.image_url_s || '',
                row.image_url_m || '',
                row.image_url_l || ''
            ]);

            db.query(query, [values], (err) => {
                if (err) throw err;
                fs.unlinkSync(req.file.path);

                // Count rows after insertion
                db.query('SELECT COUNT(*) AS count FROM books', (err, result) => {
                    if (err) throw err;
                    console.log('Total rows in books table:', result[0].count);
                    res.redirect('/books');
                });
            });
        });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        res.json({ success: true });
    } else {
        res.json({ success: false, error: 'Invalid credentials' });
    }
});

// Register route (assuming you have a users table)
app.post('/register', (req, res) => {
    const { username, age, password } = req.body;
    if (!username || !age || !password) {
        return res.json({ success: false, error: 'All fields are required' });
    }

    const query = 'INSERT INTO users (username, age, password) VALUES (?, ?, ?)';
    db.query(query, [username, age, password], (err) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, error: 'Registration failed' });
        }
        res.json({ success: true });
    });
});

// Health check route
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
