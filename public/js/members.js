const logoutButton = document.getElementById("logoutButton");
const memberName = document.getElementById("memberName");
const randomImage = document.getElementById("randomImage");

async function getUsername() {
    try {
        const response = await fetch('/getUsername');
        if (response.ok) {
            const result = await response.json();
            memberName.innerText = result.username;
        } else {
            window.location.href = "/loginpage";
        }
    } catch (error) {
        console.error("Error fetching username:", error);
        window.location.href = "/loginpage";
    }
}

logoutButton.addEventListener("click", async () => {
    try {
        await fetch("/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        window.location.href = "/";
    } catch (error) {
        console.error("Logout error:", error);
    }
});

function setRandomImage() {
    const images = [
        "/image/fluffy.gif",
        "/image/socks.gif",
        "/image/cat.jpg"
    ];

    const randomIndex = Math.floor(Math.random() * images.length);
    randomImage.src = images[randomIndex];
    randomImage.width = 300;
    randomImage.height = 300;
}

getUsername();
setRandomImage();
