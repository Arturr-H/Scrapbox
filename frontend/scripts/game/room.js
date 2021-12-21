const socket = io();

//get the game id from the url
const room_id = window.location.pathname.split('/')[2];

//HTML elements
const start_button = document.getElementById("start-button");
const player_list = document.getElementById("player-list");
const error_out = document.getElementById("error-message-output");
const player_count = document.getElementById("player-count");

const toggle_mature = document.getElementById("mature-toggle");
const lobby_short_id = document.getElementById("lobby-short-id");

//mini functions
const display_players = (players) => players.map(player_obj => `
    <li class="player">
        <img src="https://artur.red/profile-images/pi-${player_obj.pfp}.png" alt="profile image">
        <p>${player_obj.player}</p>

        <span class="kick-button" onclick="kick_user('${player_obj.player}')">+</span>
    </li>
`).join("");
const display_player_count = (players) => player_count.innerHTML = `<h4>${players.length}/16</h4>`;


// > > JOIN HANDLER  &  PLAYER COUNTER > >

//Send that the player has joined the game
socket.emit("player-join", {
    room_id: room_id,
    player: getCookie("usnm"),
    pfp: getCookie("pfp"),
});

//When other players join
socket.on(`player-join:${room_id}`, (data) => {
    //Add the player to the list
    player_list.innerHTML = display_players(data);
    display_player_count(data);

    console.log("shitting")
});

//For checking how many players are in the room (because websockets don't save sent data)
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

        //display the lobby ID (short one)
        lobby_short_id.innerHTML = room_data_json.small_code;

    }catch{
        console.log("error");
    }
})();

// > > JOIN HANDLER  &  PLAYER COUNTER > >
//
//
//
//
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

socket.on(`return-message:${room_id}`, (message) => {
    error_out.innerHTML = message;
})

// > > START HANDLER > >
//
//
//
//
// > > CONFIG HANDLER > >

// maturity

toggle_mature.addEventListener("click", () => {
    socket.emit(`config:mature-toggle`, {
        room: room_id,
        player: getCookie("usnm"),
        mature: toggle_mature.checked
    })
});

socket.on(`config:mature-toggle:${room_id}`, (new_mature) => {
    alert(`room is now: ${new_mature}`);
});

// maturity
//
// kick players

const kick_user = (usnm) => {
    socket.emit(`config:user-kick`, {
        room_id: room_id,
        kick_request: usnm,
        kick_requester: getCookie("usnm") 
    });
};

socket.on(`config:user-kick:${room_id}`, (data) => {
    //kicked_player, new_player_list.

    const kicked_player = data.kicked_player;
    const new_player_list = data.new_player_list;

    if(kicked_player == getCookie("usnm")){
        window.open("https://artur.red", "_self");
    }else{
        player_list.innerHTML = display_players(new_player_list);
        display_player_count(new_player_list);
    }
});


// > > CONFIG HANDLER > >