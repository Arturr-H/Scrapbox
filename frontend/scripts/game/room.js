const socket = io();

//get the game id from the url
const room_id = window.location.pathname.split('/')[2];

//HTML elements
const start_button = document.getElementById("start-button");
const player_list = document.getElementById("player-list");
const player_count = document.getElementById("player-count");
const lobby_short_id = document.getElementById("lobby-short-id");
const config_area = document.getElementById("config-area");

const chat_container = document.getElementById("chat-container");
const open_chat = document.getElementById("open-chat");
const close_chat = document.getElementById("close-chat");

const question_type = document.getElementById("mature");
const toggle_public = document.getElementById("public");
const question_count = document.getElementById("question-count");
const self_voting = document.getElementById("self-voting");

const room_qr = document.getElementById("room-qr");

let is_leader = false;
let room_short_id = "";

//mini functions
const display_players = (players) => players.map(player_obj => `
    <li class="player ${player_obj.leader ? 'leader' : ''}">
        <div class="pfp">
            <img src="https://artur.red/faces/${player_obj.pfp}.svg" alt="Profile Picture">
        </div>
        <div class="info">
            <p>${player_obj.player}</p>
            ${
    //if the player is a leader, hide the kick button
    player_obj.leader
        ? ''
        : is_leader
            ? '<img class="kick-button" onclick="kick_user(`' + player_obj.player + '`)" src="https://artur.red/icons/xmark.svg" alt="xmark"></img>'
            : ''
    }
        </div>
    </li>
`).join("");
const display_player_count = (players) => player_count.innerHTML = `${players.length}/16`;


lobby_short_id.addEventListener("click", () => {
    //copy the short id to the clipboard
    navigator.clipboard.writeText("https://artur.red/" + room_short_id);
    notice("Copied to clipboard!");
})



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
    if (data.new_player_list != undefined) {
        player_list.innerHTML = display_players(data.new_player_list);
        display_player_count(data.new_player_list);
    }

    //If its not the player
    if (data.new_player != undefined) {
        if (data.new_player.player != getCookie("usnm")) {
            notice(`${data.new_player.player} has joined the game!`);
        }
    }

});

//For checking how many players are in the room (because websockets don't save sent data)
(async () => {
    try {
        const room_data = await fetch(`https://artur.red/api/get-room-data`, {
            method: "GET",
            headers: {
                room: room_id
            }
        });

        //Get the room data as json
        const room_data_json = await room_data.json();
        const players = room_data_json.game.players;

        is_leader = room_data_json.game.leader == getCookie("usnm");

        player_list.innerHTML = display_players(players);
        display_player_count(players);

        //display the lobby ID (short one)
        lobby_short_id.innerHTML = room_data_json.small_code.toString().replace(/\d{4}(?=.)/g, '$& &nbsp; ');

        //set the game config
        question_type.value = room_data_json.game.config.question_type;
        toggle_public.checked = room_data_json.game.config.public;
        question_count.value = room_data_json.game.config.question_count;
        self_voting.checked = room_data_json.game.config.self_voting;

        const qr = room_data_json.qr;
        room_qr.src = qr;

        room_short_id = room_data_json.small_code;

        if (room_data_json.game.leader == getCookie("usnm")) {
            start_button.style.display = "block";
        } else {
            config_area.innerHTML = `
                <p>Waiting for <b>${room_data_json.game.leader}</b> to start the game</p>
            `;
        }

    } catch {
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
    notice("Starting game...");

    setTimeout(() => {
        window.open(`https://artur.red/game/${next_game_id}`, "_self");
    }, 1000);
})

socket.on(`return-message:${room_id}`, (message) => {
    notice(message);
})

// > > START HANDLER > >
//
//
//
//
// > > CONFIG HANDLER > >


question_type.addEventListener("click", () => {
    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: getCookie("usnm"),
        new_value: question_type.value,
        setting: "question_type"
    })
});

toggle_public.addEventListener("click", () => {
    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: getCookie("usnm"),
        new_value: toggle_public.checked,
        setting: "public"
    })
});

question_count.addEventListener("change", () => {
    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: getCookie("usnm"),
        new_value: question_count.value,
        setting: "question_count"
    })
});

self_voting.addEventListener("click", () => {
    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: getCookie("usnm"),
        new_value: self_voting.checked,
        setting: "self_voting"
    })
});


socket.on(`config:settings-toggle:${room_id}`, (new_data) => {
    notice(`${new_data.player} has changed the ${new_data.setting} setting to ${new_data.new_value}`);

    //set the checkbox to the new value
    if (new_data.setting == "mature") {
        question_type.checked = new_data.new_value;
    }
    if (new_data.setting == "public") {
        toggle_public.checked = new_data.new_value;
    }
    if (new_data.setting == "question_count") {
        question_count.value = new_data.new_value;
    }
    if (new_data.setting == "self_voting") {
        self_voting.checked = new_data.new_value;
    }
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

    notice(`${kicked_player} has been kicked!`);

    if (kicked_player == getCookie("usnm")) {
        window.open("https://artur.red", "_self");
    } else {
        player_list.innerHTML = display_players(new_player_list);
        display_player_count(new_player_list);
    }
});


// > > CONFIG HANDLER > >

socket.on(`player-leave:${room_id}`, (data) => {
    const new_player_list = data.new_player_list;

    player_list.innerHTML = display_players(new_player_list);
    display_player_count(new_player_list);
});



// CHAT CONTAINER

let chat_open = false;

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


/* AUDIO */
const volume_slider = document.getElementById("volume-slider");
const volume_image = document.getElementById("volume-image");
const audio = document.getElementById("audio");

const source_element = document.createElement("source");
source_element.setAttribute("src", "https://artur.red/audio/song.mp3");
source_element.setAttribute("type", "audio/mp3");
source_element.setAttribute("volume", 0);
audio.appendChild(source_element);

let audio_volume = 0;
audio.volume = getCookie("audio_percentage")*0.5;
volume_slider.value = getCookie("audio_percentage")*100*2;

const set_audio_image = (value) => volume_image.src = `https://artur.red/images/audio-levels/${value}.svg`;

const on_volume_change = () => {
    if (audio_volume == volume_slider.value) return;
    
    audio_volume = volume_slider.value*0.5;
    audio.volume = audio_volume / 100;
    
    let audio_volume_percentage = audio_volume / 100;
    setCookie("audio_percentage", audio_volume_percentage, 30);

    if(audio_volume_percentage == 0) set_audio_image(1);
    if(audio_volume_percentage > 0) set_audio_image(2);
    if(audio_volume_percentage > 0.2) set_audio_image(3);
    if(audio_volume_percentage > 0.4) set_audio_image(4);
}

volume_slider.addEventListener("mousemove", on_volume_change);
on_volume_change();
