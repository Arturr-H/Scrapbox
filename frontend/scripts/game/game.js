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
let sentences = [];
let current_question_index = -1;//-1 because it adds up to 0 when it's the first question
let current_snippets = [];

//it cycles through all the questions and
//all the player items using this variable
let current_voting_index = 0;

//mini functions
const display_players = (players) => players.map(player_obj => `
    <li class="player ${player_obj.done?"active":""}">
        <img src="https://artur.red/profile-images/pi-${player_obj.pfp}.png" alt="profile image">
        <p>${player_obj.player}</p>
    </li>
`).join("");
const filter_xss = (str) => str.replace(/</g, "&lt;")
                                .replace(/>/g, "&gt;")
                                .replace(/\n/g, "")
                                .replace(/\r/g, "")
                                .replace(/\'/g, "&#39;")
                                .replace(/\"/g, "&quot;");

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
    const xss_filtered_text = filter_xss(text);


    console.log(xss_filtered_text);

    //send the text to the server if it's not empty
    if(xss_filtered_text.length > 0){
        socket.emit("game:text", {
            room_id: room_id,
            text: xss_filtered_text,
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
    current_snippets = data.current_snippets;
    const players = data.players;

    console.log(data);

    //update the player list
    player_list.innerHTML = display_players(players);

    if(data.all_done){
        //re render the player list, with the players not done
        player_list.innerHTML = display_players(players);
        
        text_input_area.innerHTML = display_question_view(current_snippets);
    }
});

// -------------------------------------------------- QUESTIONS -------------------------------------------------- //

const display_question_view = (current_snippets) => {
    
    current_question_index++;

    if (current_question_index >= questions.length) {
    
        send_sentences();
        
        return `
            <div class="center">
                <h1>Waiting for other players...</h1>
            </div>
        `;
    }

    sentences.push({
        question_id: current_question_index,
        sentence: [],
        player: getCookie("usnm")
    });

    return `
        <div class="center">
            <h1>${questions[current_question_index]}</h1>
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
}

// -------------------------------------------------- SNIPPET INPUT -------------------------------------------------- //

const add_word = (word) => {
    sentences[current_question_index].sentence.push(filter_xss(word));

    snippet_output = document.getElementById("snippet-output");
    snippet_output.innerHTML = sentences[current_question_index].sentence.join(" ");
}
const submit_sentence = () => {

    text_input_area.innerHTML = display_question_view(current_snippets);

}


const send_sentences = () => {
    socket.emit("game:submit-sentences", {
        room_id: room_id,
        sentences: sentences,
        player: getCookie("usnm")
    });
}
socket.on(`game:submit-sentences:${room_id}`, (data) => {
    const players = data.players;
    const current_player_answers = data.current_player_answers;

    console.log(data);

    //update the player list
    player_list.innerHTML = display_players(players);

    //render the voting view if all players have submitted their sentences
    if(data.all_done) {
        start_voting_interval(current_player_answers);
    }
})


// -------------------------------------------------- DISPLAY VOTING -------------------------------------------------- //

const start_voting_interval = (current_player_answers) => {
    current_voting_index = 0;
    voting_interval = setInterval(() => {
        if(current_voting_index >= questions.length){
            clearInterval(voting_interval);
            return;
        }

        //render the voting view
        text_input_area.innerHTML = display_voting_view(current_player_answers, current_voting_index);
        current_voting_index++;
    }, 10000);
}

const display_voting_view = (current_player_answers, index) => {

    return `
        <div class="center">
            <h1>${questions[current_voting_index]}</h1>
        </div>
        <div class="center">
            ${

                current_player_answers.map(player => {
                    return `
                        <div class="player-answer">
                            <p>${
                                player.sentences[index].sentence.join(" ")
                            }</p>
                        </div>
                    `;
                })
            }
        </div>
    `;
}
