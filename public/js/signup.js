const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

      

        if (response.ok) {
            const result = await response.json();
            window.location.href = result.redirect; 
        } else {
            const result = await response.json();
            alert(result.error); 
        }
    } catch (error) {
        alert("Error.");        
    }
});
