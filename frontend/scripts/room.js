const socket = io();

//get the game id from the url
const room_id = window.location.pathname.split('/')[2];

//HTML elements
const start_button = document.getElementById("start-button");
const player_list = document.getElementById("player-list");
const error_out = document.getElementById("error-message-output");
const player_count = document.getElementById("player-count");

//mini functions
const display_players = (players) => players.map(player => `<li>${player}</li>`).join("");
const display_player_count = (players) => player_count.innerHTML = `<h4>${players.length}/16</h4>`;


// > > JOIN HANDLER  &  PLAYER COUNTER > >

//Send that the player has joined the game
socket.emit("player-join", {
    room_id: room_id,
    player: getCookie("usnm")
});

//When other players join
socket.on(`player-join:${room_id}`, (data) => {
    //Add the player to the list
    player_list.innerHTML = display_players(data);
    display_player_count(data);

    console.log("shitting")
});

//For checking how many players are in the room
// (because websockets don't save sent data)
(async () => {
    try{
        const room_data = await fetch(`https://artur.red/api/get-room-data`, {
            method: "GET",
            headers: {
                room: room_id
            }
        });

        //Get the room data as json
        const room_data_json = await room_data.json();
        const players = room_data_json.game.players;

        player_list.innerHTML = display_players(players);
        display_player_count(players);

    }catch{
        console.log("error");
    }
})();

// > > JOIN HANDLER  &  PLAYER COUNTER > >


// > > START HANDLER > >

start_button.addEventListener("click", () => {
    console.log("starting....")

    socket.emit("start-game", {
        id: room_id,
        player: getCookie("usnm"),
    });
});

socket.on(`start-game:${room_id}`, (next_game_id) => {
    window.open(`https://artur.red/game/${next_game_id}`, "_self");
})

// > > START HANDLER > >

socket.on(`return-message:${room_id}`, (message) => {
    error_out.innerHTML = message;
})