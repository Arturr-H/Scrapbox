const socket = io();

//get the game id from the url
const room_id = window.location.pathname.split('/')[2];

//HTML elements
const start_button = document.getElementById("start-button");
const player_list = document.getElementById("player-list");
const player_count = document.getElementById("player-count");
const lobby_short_id = document.getElementById("lobby-short-id");
const config_area = document.getElementById("config-area");

const question_type = document.getElementById("mature");
const toggle_public = document.getElementById("public");
const question_count = document.getElementById("question-count");
const self_voting = document.getElementById("self-voting");
const word_contribution = document.getElementById("word-contribution");
const extra_snippets = document.getElementById("extra-snippets");
const story_writing_time = document.getElementById("story-writing-time");
const answer_time = document.getElementById("answer-time");
const language = document.getElementById("language");

const copy_button = document.getElementById("copy-button");

const languages = [
    "Abkhazian", "Afar", "Afrikaans", "Albanian", "Amharic", "Arabic", "Aragonese", "Armenian", "Assamese", "Aymara", "Azerbaijani", 
    "Bashkir", "Basque", "Bengali (Bangla)", "Bhutani", "Bihari", "Bislama", "Breton", "Bulgarian", "Burmese", "Belarussian (Byelorussian)", "Cambodian", 
    "Catalan", "Cherokee", "Chewa", "Chinese", "Chinese (Simplified)", "Chinese (Traditional)", "Corsican", "Croatian", "Czech", "Danish", "Divehi", "Dutch", 
    "Edo", "Esperanto", "Estonian", "Faeroese", "Farsi", "Fiji", "Finnish", "Flemish", "French", "Frisian", "Fulfulde", "Galician", "Gaelic (Scottish)", 
    "Gaelic (Manx)", "Georgian", "German", "Greek", "Greenlandic", "Guarani", "Gujarati", "Haitian Creole", "Hausa", "Hawaiian", "Hebrew", "Hindi", "Hungarian", 
    "Ibibio", "Icelandic", "Ido", "Igbo", "Indonesian", "Interlingua", "Interlingue", "Inuktitut", "Inupiak", "Irish", "Italian", "Japanese", "Javanese", 
    "Kannada", "Kanuri", "Kashmiri", "Kazakh", "Kinyarwanda (Rwanda)", "Kirghiz", "Kirundi (Rundi)", "Konkani", "Korean", "Kurdish", "Laothian", "Latin", 
    "Latvian (Lettish)", "Limburgish (Limburger)", "Lingala", "Lithuanian", "Macedonian", "Malagasy", "Malay", "Malayalam", "Maltese", "Maori", "Marathi", 
    "Mongolian", "Nauru", "Nepali", "Norwegian", "Occitan", "Oriya", "Oromo (Afaan Oromo)", "Papiamentu", "Pashto (Pushto)", "Polish", "Portuguese", "Punjabi", 
    "Quechua", "Rhaeto-Romance", "Romanian", "Russian", "Sami (Lappish)", "Samoan", "Sangro", "Sanskrit", "Serbian", "Serbo-Croatian", "Sesotho", "Setswana", 
    "Shona", "Sichuan Yi", "Sindhi", "Sinhalese", "Siswati", "Slovak", "Slovenian", "Somali", "Spanish", "Sundanese", "Swahili (Kiswahili)", "Swedish", "Syriac", 
    "Tagalog", "Tajik", "Tamazight", "Tamil", "Tatar", "Telugu", "Thai", "Tibetan", "Tigrinya", "Tonga", "Tsonga", "Turkish", "Turkmen", "Twi", "Uighur", "Ukrainian", 
    "Urdu", "Uzbek", "Venda", "Vietnamese", "Volapük", "Wallon", "Welsh", "Wolof", "Xhosa", "Yi", "Yiddish", "Yoruba", "Zulu"
];

document.getElementById("language").innerHTML += languages.map(language => `<option value="${language}">${language}</option>`).join("");


let is_leader = false;
let room_short_id = "";

//mini functions
const display_players = (players) => players.map(player_obj => `
    <li class="player ${player_obj.leader ? 'leader' : ''}" ${player_obj.suid == getCookie("suid")?"style='border: 2px solid var(--vibrant-green);'":""}>
        <div class="pfp">
            <img style="background: ${player_obj.player_color}" src="https://artur.red/faces/${player_obj.pfp}.svg" alt="Profile Picture">
        </div>
        <div class="info">
            <p>${player_obj.name}</p>
            ${
    //if the player is a leader, hide the kick button
    player_obj.leader
        ? ''
        : is_leader
            ? '<img class="kick-button" onclick="kick_user(`' + player_obj.suid + '`)" src="https://artur.red/icons/xmark.svg" alt="xmark"></img>'
            : ''
    }
        </div>
    </li>
`).join("");
const display_player_count = (players) => player_count.innerHTML = `${players.length}/8`;
lobby_short_id.addEventListener("click", () => {
    //copy the short id to the clipboard
    navigator.clipboard.writeText("https://artur.red/" + room_short_id);
    notice("Copied to clipboard!");
})
copy_button.addEventListener("click", () => {
    //copy the short id to the clipboard
    navigator.clipboard.writeText("https://artur.red/" + room_short_id);
    notice("Copied to clipboard!");
})

const question_type_change = () => {
    setCookie("CONF_question_type", question_type.value, 30);

    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: {
            name: getCookie("usnm"),
            suid: getCookie("suid")
        },
        new_value: question_type.value,
        setting: "question_type"
    })
}
const toggle_public_change = () => {
    setCookie("CONF_public", toggle_public.checked, 30);

    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: {
            name: getCookie("usnm"),
            suid: getCookie("suid")
        },
        new_value: toggle_public.checked,
        setting: "public"
    })
}
const question_count_change = () => {
    setCookie("CONF_question_count", question_count.value, 30);

    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: {
            name: getCookie("usnm"),
            suid: getCookie("suid")
        },
        new_value: question_count.value,
        setting: "question_count"
    })
}
const self_voting_change = () => {
    setCookie("CONF_self_voting", self_voting.checked, 30);

    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: {
            name: getCookie("usnm"),
            suid: getCookie("suid")
        },
        new_value: self_voting.checked,
        setting: "self_voting"
    })
}
const word_contribution_change = () => {
    setCookie("CONF_word_contribution", word_contribution.checked, 30);

    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: {
            name: getCookie("usnm"),
            suid: getCookie("suid")
        },
        new_value: word_contribution.checked,
        setting: "word_contribution"
    })
}
const extra_snippets_change = () => {
    setCookie("CONF_extra_snippets", extra_snippets.value, 30);

    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: {
            name: getCookie("usnm"),
            suid: getCookie("suid")
        },
        new_value: extra_snippets.value,
        setting: "extra_snippets"
    })
}
const story_writing_time_change = () => {
    setCookie("CONF_story_writing_time", story_writing_time.value, 30);

    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: {
            name: getCookie("usnm"),
            suid: getCookie("suid")
        },
        new_value: story_writing_time.value,
        setting: "story_writing_time"
    })
}
const answer_time_change = () => {
    setCookie("CONF_answer_time", answer_time.value, 30);

    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: {
            name: getCookie("usnm"),
            suid: getCookie("suid")
        },
        new_value: answer_time.value,
        setting: "answer_time"
    })
}
const language_change = () => {
    setCookie("CONF_language", language.value, 30);

    socket.emit(`config:settings-toggle`, {
        room: room_id,
        player: {
            name: getCookie("usnm"),
            suid: getCookie("suid")
        },
        new_value: language.value,
        setting: "language"
    })
}


// > > JOIN HANDLER  &  PLAYER COUNTER > >

//Send that the player has joined the game
socket.emit("player-join", {
    room_id: room_id,
    player: {
        name: getCookie("usnm"),
        pfp: getCookie("pfp"),
        suid: getCookie("suid"),
    },
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
        if (data.new_player.suid != getCookie("suid")) {
            notice(`${data.new_player.name} has joined the game!`);
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

        is_leader = room_data_json.game.leader.suid == getCookie("suid");

        player_list.innerHTML = display_players(players);
        display_player_count(players);

        //display the lobby ID (short one)
        lobby_short_id.innerHTML = room_data_json.small_code.toString().replace(/\d{4}(?=.)/g, '$& &nbsp; ');

        //set the game config
        question_type.value = room_data_json.game.config.question_type;
        question_count.value = room_data_json.game.config.question_count;
        extra_snippets.value = room_data_json.game.config.extra_snippets;
        story_writing_time.value = room_data_json.game.config.story_writing_time;
        answer_time.value = room_data_json.game.config.answer_time;
        language.value = room_data_json.game.config.language;

        toggle_public.checked = room_data_json.game.config.public;
        self_voting.checked = room_data_json.game.config.self_voting;
        word_contribution.checked = room_data_json.game.config.word_contribution;

        const qr = room_data_json.qr;
        document.querySelectorAll(".room-qr").forEach(e => {
            e.src = qr;
        });

        room_short_id = room_data_json.small_code;

        if (room_data_json.game.leader.suid == getCookie("suid")) {
            start_button.style.display = "block";
        } else {
            config_area.innerHTML = `
                <p>Waiting for <b>${room_data_json.game.leader.name}</b> to start the game</p>
            `;
        }
    }catch(err) {
        console.log(err);
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
    socket.emit("start-game", {
        id: room_id,
        player: {
            name: getCookie("usnm"),
            pfp: getCookie("pfp"),
            suid: getCookie("suid"),
        },
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

question_type.addEventListener(     "change", question_type_change      );
toggle_public.addEventListener(     "click",  toggle_public_change      );
question_count.addEventListener(    "change", question_count_change     );
self_voting.addEventListener(       "click",  self_voting_change        );
word_contribution.addEventListener( "click",  word_contribution_change  );
extra_snippets.addEventListener(    "change", extra_snippets_change     );
story_writing_time.addEventListener("change", story_writing_time_change );
answer_time.addEventListener(       "change", answer_time_change        );
language.addEventListener(          "change", language_change           );


socket.on(`config:settings-toggle:${room_id}`, (new_data) => {
    notice(`${new_data.name} has changed the ${new_data.setting} setting to ${new_data.new_value}`);

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
    if (new_data.setting == "word_contribution") {
        word_contribution.checked = new_data.new_value;
    }
    if (new_data.setting == "extra_snippets") {
        extra_snippets.value = new_data.new_value;
    }
    if (new_data.setting == "story_writing_time") {
        story_writing_time.value = new_data.new_value;
    }
    if (new_data.setting == "answer_time") {
        answer_time.value = new_data.new_value;
    }
    if (new_data.setting == "language") {
        language.value = new_data.new_value;
    }
});

// maturity
//
// kick players

const kick_user = (kick_request_suid) => {
    socket.emit(`config:user-kick`, {
        room_id: room_id,
        kick_request_suid: kick_request_suid,
        kick_requester_suid: getCookie("suid"),
    });
};

socket.on(`config:user-kick:${room_id}`, (data) => {
    //kicked_player, new_player_list.

    const kicked_player = data.kicked_player;
    const new_player_list = data.new_player_list;

    notice(`${kicked_player.name} has been kicked!`);

    if (kicked_player.suid == getCookie("suid")) {
        window.open("https://artur.red", "_self");
    }else {
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
volume_slider.value = getCookie("audio_percentage")*100*5*2;

const set_audio_image = (value) => volume_image.src = `https://artur.red/images/audio-levels/${value}.svg`;

const on_volume_change = () => {
    if (audio_volume == volume_slider.value) return;
    
    audio_volume = volume_slider.value*0.5;
    let audio_volume_percentage = audio_volume / 500;

    audio.volume = audio_volume_percentage;
    setCookie("audio_percentage", audio_volume_percentage, 30);

    if(audio_volume_percentage == 0) set_audio_image(1);
    if(audio_volume_percentage > 0) set_audio_image(2);
    if(audio_volume_percentage > 0.05) set_audio_image(3);
    if(audio_volume_percentage > 0.07) set_audio_image(4);
}

volume_slider.addEventListener("mousemove", on_volume_change);
volume_slider.addEventListener("click", on_volume_change);
on_volume_change();

//Hide and show lobby id & qr.
let lobby_info_toggled = false;
const toggle_info = (id) => {

    const toggle_button = document.getElementById(id);
    toggle_button.src = lobby_info_toggled
        ? "https://artur.red/icons/eye.svg"
        : "https://artur.red/icons/eye-slash.svg";
    

    if (lobby_info_toggled) {
        copy_button.style.display = "none";
        document.querySelectorAll(".visibility-toggleable").forEach(element => {
            element.style.visibility = "visible";
        });
    }else {
        copy_button.style.display = "block";
        document.querySelectorAll(".visibility-toggleable").forEach(element => {
            element.style.visibility = "hidden";
        });
    }
    setCookie("lobby_info_toggled", lobby_info_toggled?"yes":"no", 30);

    lobby_info_toggled = !lobby_info_toggled;
}
if(getCookie("lobby_info_toggled") == "no") toggle_info("lobby-info-visibility-toggle");