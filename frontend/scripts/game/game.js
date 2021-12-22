const socket = io();

//get the game id from the url
const room_id = window.location.pathname.split('/')[2];

//HTML elements
const player_list = document.getElementById("player-list");

const text_input = document.getElementById("text-input");
const text_submit = document.getElementById("text-submit");

const text_input_area = document.getElementById("text-input-area");

const snippet_input = document.getElementById("snippet-input");
let snippet_output;

//all the questions
let questions;
let sentence = [];

//mini functions
const display_players = (players) => players.map(player_obj => `
    <li class="player ${player_obj.done?"active":""}">
        <img src="https://artur.red/profile-images/pi-${player_obj.pfp}.png" alt="profile image">
        <p>${player_obj.player}</p>
    </li>
`).join("");


//Start by fetching all the players
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

        //Get the questions
        questions = room_data_json.game.current_questions;
        console.log(questions);
    }catch(err){
        console.log("error");

    }
})();

// -------------------------------------------------- TEXT INPUT -------------------------------------------------- //
//text server out
text_submit.addEventListener("click", async () => {
    const text = text_input.value;

    //send the text to the server if it's not empty
    if(text.length > 0){
        socket.emit("game:text", {
            room_id: room_id,
            text: text,
            player: getCookie("usnm")
        });

        //clear the game area's children
        text_input_area.innerHTML = `
            <div class="center">
                <h1>Waiting for other players...</h1>
            </div>
        `;
    }
});
//Text server in
socket.on(`game:text:${room_id}`, (data) => {
    const current_snippets = data.current_snippets;
    const players = data.players;

    console.log(current_snippets);
    console.log(players);

    //update the player list
    player_list.innerHTML = display_players(players);

    if(data.all_done){
        //re render the player list, with the players not done
        player_list.innerHTML = display_players(players);
        
        text_input_area.innerHTML = display_question_view(0, current_snippets);
    }
});

// -------------------------------------------------- QUESTIONS -------------------------------------------------- //

const display_question_view = (index, current_snippets) => `
    <div class="center">
        <h1>${questions[index]}</h1>
    </div>
    <div class="center">
        <div class="snippet-output" id="snippet-output"></div>
        <button onclick="submit_sentence()" style="width: 30%;" id="submit-">Submit</button>
    </div>

    <div class="center">

        <div class="snippet-input" id="snippet-input">
            ${
                current_snippets.map(word => `
                    <span onclick="add_word('${word}')">${word}</span>
                `).join(" ")
            }
        </div>
    </div>
`;

// -------------------------------------------------- SNIPPET INPUT -------------------------------------------------- //

const add_word = (word) => {
    sentence.push(word);

    snippet_output = document.getElementById("snippet-output");
    snippet_output.innerHTML = sentence.join(" ");
}

const submit_sentence = () => {
    socket.emit("game:submit-sentence", {
        room_id: room_id,
        sentence: sentence.join(" "),
        player: getCookie("usnm")
    });

    //clear the game area's children
    text_input_area.innerHTML = `
        <div class="center">
            <h1>Waiting for other players...</h1>
        </div>
    `;
}
socket.on(`game:submit-sentence:${room_id}`, (data) => {
    const players = data.players;
    const current_player_answers = data.current_player_answers;

    //update the player list
    player_list.innerHTML = display_players(players);

    if(data.all_done){
            
        text_input_area.innerHTML = `
            <div class="center">
                <h1>${current_player_answers.map(e => e.sentence).join("<br />")}</h1>
            </div>
        `
    }
})