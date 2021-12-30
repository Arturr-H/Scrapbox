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
let has_voted = false;

let current_total_votes = {};

//it cycles through all the questions and
//all the player items using this variable
let current_voting_index = 0;

//mini functions
const display_players = (players) => players.map(player_obj => `
    <li class="player ${player_obj.done?"active":""}">
        <img src="https://artur.red/faces/${player_obj.pfp}.svg" alt="profile image">
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
        <div class="center column">
            <div class="big-container">
                <div class="snippet-output" id="snippet-output">
                
                </div>
            </div>
            <button onclick="submit_sentence()" style="width: 30%;">Submit</button>
        </div>

        <div class="center">
            <div class="snippet-input" id="snippet-input">
                <div>
                    ${
                        current_snippets.map(word => `
                            <span onclick="add_word('${filter_xss(word)}')" class="snippet">${word}</span>
                        `).join(" ")
                    }
                </div>
            </div>
        </div>
    `;
}

// -------------------------------------------------- SNIPPET INPUT -------------------------------------------------- //

const add_word = (word) => {
    sentences[current_question_index].sentence.push(filter_xss(word));

    snippet_output = document.getElementById("snippet-output");
    snippet_output.innerHTML = sentences[current_question_index].sentence.map(word => `
        <span class="snippet">${word}</span>
    `).join("");
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

    const try_render_voting_view = () => {
        if(current_voting_index >= questions.length){
            clearInterval(voting_interval);
            display_results();
            return;
        }

        //render the voting view
        text_input_area.innerHTML = display_voting_view(current_player_answers, current_voting_index);
        current_voting_index++;
    }

    try_render_voting_view();
    //∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆//
    //So we set this interval so it switches between all the questions
    //and answers, however there is a duplicate function above here as
    //you probably can see. It's because setInterval is a function that
    //calls the function first AFTER the interval time has passed.
    //Otherwise it would be X seconds of nothingness.
    voting_interval = setInterval(try_render_voting_view, 10000);
}

const display_voting_view = (current_player_answers, index) => {

    return `
        <div class="center">
            <h1>${questions[current_voting_index]}</h1>
        </div>
        <div class="center player-answer-container">
            ${

                current_player_answers.map((player, player_idx) => `
                    <div id="card_${player.player}" class="player-answer ${player == getCookie("usnm")?'disabled':''}" onclick="${
                        
                        //if its the own players card they should not be able to vote for themself.
                        player == getCookie("usnm")?'':`vote_for('${player.player}')`

                    }">
                        
                        <p>${
                            player.sentences[index].sentence.join(" ")
                        }</p>
                        <div class="bottom"></div>
                        <img src="https://artur.red/images/cross-numbers/${player_idx+1}.svg" class="card-number" alt="card-number">
                        <p class="score"></p>

                        <img src="https://artur.red/icons/checkmark.svg" class="checkmark" alt="checkmark">
                    </div>
                `).join("")
            }
        </div>
    `;
}

// -------------------------------------------------- HANDLE VOTING -------------------------------------------------- //

const vote_for = (player) => {

    if(!has_voted && player != getCookie("usnm")){
        socket.emit("game:vote-for", {
            room_id: room_id,
            voter: getCookie("usnm"),
            voted_for: player,
        });

        document.getElementById(`card_${player}`).classList.add("vote");

        // loop through all elements with the class of player-answer and add the class "disabled"
        document.querySelectorAll(".player-answer").forEach(player_answer => {
            player_answer.classList.add("disabled");
            player_answer.onclick = null;
        });
    }
}
socket.on(`game:vote-for:${room_id}`, (data) => {
    const total_votes = data.total_votes;
    const players = data.players;
    const all_done = data.all_done;

    //update the player list
    player_list.innerHTML = display_players(players);

    current_total_votes = total_votes;
});


const display_results = () => {
    text_input_area.innerHTML = `
        <div class="center column">
            <h1>Results</h1>

            ${
                //current_total_votes looks something like this: {player1: 250, player2: 150, player3: 500}
                //sort current_total_votes by the value of the object
                Object.keys(current_total_votes).sort((a, b) => current_total_votes[b] - current_total_votes[a]).map((player, player_idx) => `
                    <span class="player-result ${player_idx == 0?'leader':''}" style="animation-delay: ${(Object.keys(current_total_votes).length - player_idx) * 3}s">
                        <p>${player_idx+1}: ${player}</p>
                        <p>${current_total_votes[player]*50}</p>
                    </span>
                `).join("")
            }
        </div>   
    `;
}