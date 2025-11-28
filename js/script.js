document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === 'operator@fbtms.com' && password === '12345678') {
        // Simpan user session sederhana
        localStorage.setItem('currentUser', 'Operator');
        window.location.href = 'inspection.html';
    } else {
        alert('Invalid username or password. Please try again.');
    }
});
