const room_code_form = document.getElementById("room-code-form");
const join_button = document.getElementById("join-button");


const submit = async (event) => {
    event.preventDefault();
    const room_code = document.getElementById("code-input").value;

    if(room_code == "flip") return document.body.style.transform = "rotate(180deg)";
    if(room_code == "blur") return document.body.style.filter = "blur(5px)";
    if(room_code == "gray") return document.body.style.filter = "grayscale(100%)";
    if(room_code == "invert") return document.body.style.filter = "invert(100%)";
    if(room_code == "delete") return document.body.innerHTML = "";
    if(room_code == "rainbow") return document.querySelectorAll("*").forEach(e => e.style.background = "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)");
    if(room_code == "loading") return document.querySelectorAll("*").forEach(e => e.style.background = "url('https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif')" );
    if(room_code == "rock") return document.querySelectorAll("*").forEach(e => e.style.background = "url('https://c.tenor.com/oslAUCxTbO4AAAAd/rock-sus.gif')" );
    if(room_code == "69") return document.querySelectorAll("*").forEach(e => e.style.background = "url('https://c.tenor.com/N0PUn1kOpugAAAAi/thake-spin.gif')" );

    await fetch(`https://artur.red/${room_code}`).then(response => {
        if (response.status === 200) {
            window.location.href = `https://artur.red/${room_code}`;
        } else {
            alert("Room not was not found!");
        }
    });
}

room_code_form.addEventListener("submit", submit);
join_button.addEventListener("click", submit);