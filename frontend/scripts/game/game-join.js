const room_code_form = document.getElementById("room-code-form");
const join_button = document.getElementById("join-button");


const submit = (event) => {
    event.preventDefault();
    const room_code = document.getElementById("code-input").value;

    window.open(`https://artur.red/${room_code}`, "_self");
}

room_code_form.addEventListener("submit", submit);
join_button.addEventListener("click", submit);