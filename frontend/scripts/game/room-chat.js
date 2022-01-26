//socket and room_id are global variables, and are not declared in this script

let chat_open = false;

//HTML elements
const chat_form = document.getElementById("chat-form");
const chat_input = document.getElementById("chat-input");
const chat_output = document.getElementById("chat-output");

const chat_container = document.getElementById("chat-container");
const open_chat = document.getElementById("open-chat");
const close_chat = document.getElementById("close-chat");

chat_form.addEventListener("submit", (e) => {
    e.preventDefault();

    socket.emit("chat:message", {
        message: chat_input.value,
        room_id: room_id,
        player: getCookie("usnm"),
        suid: getCookie("suid")
    });

    chat_input.value = "";
});

socket.on(`chat:message:${room_id}`, (data) => {
    chat_output.innerHTML += `<p><strong>${data.player}:</strong> ${data.message}</p>`;
    
    //scroll to bottom of chat
    chat_output.scrollTop = chat_output.scrollHeight;

    //display a notification if the message is not from the current player
    if (!chat_open) {
        open_chat.classList.add("notification");
    }
})

//the chat container should be draggable with the mouse
chat_container.addEventListener("mousedown", (e) => {
    chat_container.style.cursor = "grabbing";
    chat_container.style.userSelect = "none";
    chat_container.style.transition = "none";

    //get the mouse position
    const mouse_x = e.clientX;
    const mouse_y = e.clientY;

    //get the chat container position
    const chat_container_x = chat_container.getBoundingClientRect().left;
    const chat_container_y = chat_container.getBoundingClientRect().top;

    //when the mouse is moved
    const move_chat_container = (e) => {
        chat_container.style.left = e.clientX - mouse_x + chat_container_x + "px";
        chat_container.style.top = e.clientY - mouse_y + chat_container_y + "px";
    }

    //when the mouse is released
    const release_chat_container = () => {
        chat_container.style.cursor = "grab";
        chat_container.style.userSelect = "text";
        chat_container.style.transition = "all .2s ease";

        window.removeEventListener("mousemove", move_chat_container);
        window.removeEventListener("mouseup", release_chat_container);
    }

    window.addEventListener("mousemove", move_chat_container);
    window.addEventListener("mouseup", release_chat_container);

});

const toggle_chat = () => {
    if (chat_open) {
        chat_container.style.display = "none";
        chat_open = false;
    } else {
        chat_container.style.display = "grid";
        chat_open = true;
        open_chat.classList.remove("notification");
    }
}
open_chat.addEventListener("click", toggle_chat);
close_chat.addEventListener("click", toggle_chat);

//chat container can't be outside the window, and it should go back if it's outside
window.addEventListener("resize", () => {
    if (chat_container.getBoundingClientRect().right > window.innerWidth) {
        chat_container.style.left = window.innerWidth - chat_container.getBoundingClientRect().width + "px";
    }
    if (chat_container.getBoundingClientRect().bottom > window.innerHeight) {
        chat_container.style.top = window.innerHeight - chat_container.getBoundingClientRect().height + "px";
    }
});