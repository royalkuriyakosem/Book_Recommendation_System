// script.js

function showRegister() {
    document.getElementById('login-container').classList.add('hidden');
    setTimeout(() => document.getElementById('register-container').classList.remove('hidden'), 500);
}

function showLogin() {
    document.getElementById('register-container').classList.add('hidden');
    setTimeout(() => document.getElementById('login-container').classList.remove('hidden'), 500);
}

async function checkServerStatus(retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch('http://localhost:3000/health', {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });
            if (response.ok) {
                console.log(`Server check successful on attempt ${i + 1}`);
                return true;
            }
            throw new Error(`Server responded with status: ${response.status}`);
        } catch (error) {
            console.warn(`Server check attempt ${i + 1} failed: ${error.message}`);
            if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay));
            else {
                console.error('Server check failed after all retries');
                return false;
            }
        }
    }
}

async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const messageDiv = document.getElementById('login-message');

    if (!username || !password) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Please fill in all fields';
        return;
    }

    if (!(await checkServerStatus())) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Server not reachable. Ensure "node server.js" is running.';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        if (data.success) {
            messageDiv.className = 'success';
            messageDiv.textContent = 'Login successful! Redirecting...';
            setTimeout(() => window.location.href = '/recommendations', 1000);
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = data.error || 'Invalid credentials';
        }
    } catch (error) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Login failed: ' + error.message;
        console.error('Login error:', error);
    }
}

async function register() {
    const username = document.getElementById('reg-username').value.trim();
    const age = document.getElementById('reg-age').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const confirmPassword = document.getElementById('reg-confirm-password').value.trim();
    const messageDiv = document.getElementById('register-message');

    if (!username || !age || !password || !confirmPassword) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Please fill in all fields';
        return;
    }

    if (password !== confirmPassword) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Passwords do not match';
        return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Password must be 8+ characters with uppercase, lowercase, number, and special character';
        return;
    }

    if (!(await checkServerStatus())) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Server not reachable. Ensure "node server.js" is running.';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, age, password, confirmPassword })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        if (data.success) {
            messageDiv.className = 'success';
            messageDiv.textContent = 'Successfully registered! Redirecting to login...';
            setTimeout(showLogin, 1500);
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = data.error || 'Registration failed';
        }
    } catch (error) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Registration failed: ' + error.message;
        console.error('Register error:', error);
    }
}