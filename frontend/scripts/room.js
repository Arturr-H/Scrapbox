const socket = io();

//get the game id from the url
const room_id = window.location.pathname.split('/')[2];

//HTML elements
const start_button = document.getElementById("start-button");
const player_list = document.getElementById("player-list");

//Send that the player has joined the game
socket.emit("player-join", {
    room_id: room_id,
    player: getCookie("usnm")
});

//When other players join
socket.on(`player-join:${room_id}`, (data) => {
    //Add the player to the list
    player_list.innerHTML += `<li>${data}</li>`;
});

//Get the room data from the server https://artur.red/api/get-room-data
//using the headers "room_id"
const get_room_data = async () => {
    console.log(room_id);
    await fetch("https://artur.red/api/get-room-data", {
        method: "GET",
        headers: {
            room_id: "balls"
        }
    })
    // .then(res => res.json())
    // .then(data => {
    //     console.log(data);
    // });
}
get_room_data();

start_button.addEventListener("click", () => {
    console.log("starting....")

    socket.emit("start-game", {
        id: room_id,
        player: getCookie("usnm"),
    });
});

socket.on(`start-game:${room_id}`, (data) => {
    console.log("game started");
})