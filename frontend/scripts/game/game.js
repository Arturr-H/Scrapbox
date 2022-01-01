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
let is_leader = false;
let current_total_votes = {};

const VOTING_TIME_IN_MS = 20000;

const get_unique_id = () => {
    return Math.random().toString(36);
}

//it cycles through all the questions and
//all the player items using this variable
let current_voting_index = 0;

//mini functions
const display_players = (players) => players.map(player_obj => `
    <li class="player ${player_obj.done?"active":""}">
        <div class="pfp">
            <img src="https://artur.red/faces/${player_obj.pfp}.svg" alt="Player profile image">
        </div>
        <div class="info">
            <p>${player_obj.player}</p>
        </div>
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

        is_leader = room_data_json.game.leader === getCookie("usnm");
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
                        //randomly sort the snippets
                        current_snippets.sort(() => Math.random() - 0.5).map(word => `
                            <span onclick="add_word('${filter_xss(word)}')" class="snippet clickable">${word}</span>
                        `).join(" ")
                    }
                </div>
            </div>
        </div>
    `;
}

// -------------------------------------------------- SNIPPET INPUT -------------------------------------------------- //

const add_word = (word) => {
    sentences[current_question_index].sentence.push({
        word: filter_xss(word).toLowerCase(),
        id: get_unique_id()
    });

    snippet_output = document.getElementById("snippet-output");
    snippet_output.innerHTML = sentences[current_question_index].sentence.map(word => `
        <span id="word_${word.id}" class="snippet removable" onclick="remove_word('${word.id}')">${word.word.toLowerCase()}</span>
    `).join("");
}
    
const remove_word = (word_id) => {
    document.getElementById(`word_${word_id}`).remove();

    sentences[current_question_index].sentence = sentences[current_question_index].sentence.filter(word => word.id !== word_id);
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
        next_voting(current_player_answers);
    }
})


// -------------------------------------------------- DISPLAY VOTING -------------------------------------------------- //

const next_voting = (current_player_answers) => {

    //render the voting view
    text_input_area.innerHTML = display_voting_view(current_player_answers, current_voting_index);
    current_voting_index++;

}

const display_voting_view = (current_player_answers, index) => {

    console.log(current_player_answers);

    return `
        <div class="center">
            <h1>${questions[current_voting_index]}</h1>
        </div>
        <div class="center player-answer-container">
            ${

                current_player_answers.map((player, player_idx) => `
                    <div id="card_${player.player}" class="player-answer ${player.player == getCookie("usnm")?'disabled':''}" onclick="${
                        
                        //if its the own players card they should not be able to vote for themself.
                        player.player == getCookie("usnm")?'':`vote_for('${player.player}')`

                    }">
                        
                        <p>${
                            player.sentences[index].sentence.map(word => word.word).join(" ")
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
    const current_player_answers = data.current_player_answers;

    //update the player list
    player_list.innerHTML = display_players(players);

    current_total_votes = total_votes;

    console.log(current_total_votes);


    if (all_done) {
        if(current_voting_index >= questions.length){
            display_results();
            return;
        }
        next_voting(current_player_answers);
    }
});
const display_results = () => {
    text_input_area.innerHTML = `
        <div class="center column">
            <h1>Results</h1>

            ${
                //current_total_votes looks something like this: {player1: 250, player2: 150, player3: 500}
                //sort current_total_votes by the value of the object
                Object.keys(current_total_votes).sort((a, b) => current_total_votes[b] - current_total_votes[a]).map((player, player_idx) => `
                    <span class="player-result ${player_idx == 0?'winner':''}" style="animation-delay: ${(Object.keys(current_total_votes).length - player_idx) * 3}s">
                        <div class=player-info>
                            <p>${player_idx+1}: ${player}</p>
                            ${player_idx == 0?`<img src="https://artur.red/icons/crown.svg" class="crown" alt="crown">`:''}
                        </div>
                        <p>${current_total_votes[player]*50}</p>
                    </span>
                `).join("")
            }
        </div>   
    `;
}

/* -------------------------------------------------- PLAYER CLEARING -------------------------------------------------- */

socket.on(`game:clear-player-done:${room_id}`, (data) => {
    const players = data.players;

    //update the player list
    player_list.innerHTML = display_players(players);

});

/* -------------------------------------------------- WORD FINDING -------------------------------------------------- */

//Okay so when the player starts typing something on the keyboard, we want to search the whole page for that word. and then we want to highlight it with a yellow background.
//and the word that is being build should be reset every 3 seconds. however if you start typing again, that timer should be reset.
let word = "";
document.addEventListener("keyup", (e) => {
    if(e.key == "Backspace"){
        //if the player has backspaced, we want to remove the last character from the word they are typing.
        word = word.slice(0, -1);
    }if (e.key == "Enter" || e.key === " " || e.key === "Spacebar"){
        
        //click on the first word that matches the word they are typing.
        //so basically to explain to my future self, lets say you search
        //for "i", and there are many words that contain "i" in them.
        // like "i" and "I" and "I'm" and "I'm not" and "I'm not a robot"
        //and this code beneath will make sure that if you type "i" it will
        //click on the one that matches exactly the word "i", if not, then
        //it will click on another word that contains "i" in it.
        let found_exact_word = false
        document.querySelectorAll("span.snippet.clickable").forEach(word_span => {
            if(word_span.innerHTML.toLowerCase() == word.toLowerCase() && !found_exact_word){
                word_span.click();
                found_exact_word = true;
            }
        });
        if(!found_exact_word){
            let word_count = 0;
            document.querySelectorAll("span.snippet.clickable").forEach(word_span => {
                
                if (word_count > 0) return;
                
                if(word_span.innerHTML.toLowerCase().includes(word.toLowerCase())){
                    word_span.click();
                    word_count++;
                }
                
            });
        }

        word = "";
    }else{
        //if the player has typed something, we want to add it to the word they are typing.
        word += e.key;
    }

    //if the word is empty, we want to remove the yellow background from the word.
    if(word == ""){
        document.querySelectorAll(".highlighted").forEach(highlighted => {
            highlighted.classList.remove("highlighted");
        });
    }
    else{
        //get all the words on the page and select only the one that matches the word.
        document.querySelectorAll("span.snippet.clickable").forEach(span_word => {
            if(span_word.innerHTML){
                //if the word matches, we want to add the yellow background to it.
                if(span_word.innerHTML.toLowerCase().includes(word.toLowerCase())){
                    span_word.classList.add("highlighted");
                }
                //if the word does not match the regex, we want to remove the yellow background from it.
                else{
                    span_word.classList.remove("highlighted");
                }
            }
        });

        //check if nothing matches
        if(document.querySelectorAll(".highlighted").length == 0){
            word = e.key;

            //try again
            document.querySelectorAll("span.snippet.clickable").forEach(span_word => {
                if(span_word.innerHTML){
                    //if the word matches, we want to add the yellow background to it.
                    if(span_word.innerHTML.toLowerCase().includes(word.toLowerCase())){
                        span_word.classList.add("highlighted");
                    }
                    //if the word does not match the regex, we want to remove the yellow background from it.
                    else{
                        span_word.classList.remove("highlighted");
                    }
                }
            });
        }
    }

    //reset the word every 3 seconds.
    // setTimeout(() => {
    //     word = "";
    //     document.querySelectorAll(".highlighted").forEach(highlighted => {
    //         highlighted.classList.remove("highlighted");
    //     });
    // }, 3000);
});















// document.addEventListener("keyup", (e) => {
//     const word = e.key.toLowerCase();
//     const all_words = document.querySelectorAll("span");

//     all_words.forEach(word_element => {
//         const word_text = word_element.innerText.toLowerCase();
//         if(word_text.includes(word)) {
//             word_element.classList.add("highlighted");
//         } else {
//             word_element.classList.remove("highlighted");
//         }
//     });
// });