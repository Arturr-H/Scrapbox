//socket and room_id are global variables, and are not declared in this script

//HTML elements
const chat_form = document.getElementById("chat-form");
const chat_input = document.getElementById("chat-input");
const chat_output = document.getElementById("chat-output");

chat_form.addEventListener("submit", (e) => {
    e.preventDefault();

    socket.emit("chat:message", {
        message: chat_input.value,
        room_id: room_id,
        player: getCookie("usnm")
    });

    chat_input.value = "";
});

socket.on(`chat:message:${room_id}`, (data) => {
    chat_output.innerHTML += `<p><strong>${data.player}:</strong> ${data.message}</p>`;
    
    //scroll to bottom of chat
    chat_output.scrollTop = chat_output.scrollHeight;
})