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
let DELETEME;
//all the questions
let questions;
let sentences = [];
let current_question_index = -1;//-1 because it adds up to 0 when it's the first question
let current_snippets = [];
let has_voted = false;
let is_leader = false;
let current_total_votes = {};
let self_voting = false;
let display_card_owner_percentage_index = 0;
let all_players = [];
let extra_snippets = 0;
let current_extra_snippets = [];
let current_player_answers;

let has_submitted_story = false;
let current_voting_index = 0;

const VOTING_TIME_IN_MS = 20000;

const get_unique_id = () => {
    return Math.random().toString(36);
}

//mini functions
const display_players = (players) => players.map(player_obj => `
    <li class="player ${player_obj.done?"active":""}" ${player_obj.suid == getCookie("suid")?"style='border: 2px solid var(--vibrant-green);'":""}>
        <div class="pfp">
            <img style="background: ${player_obj.player_color}" src="https://artur.red/faces/${player_obj.pfp}.svg">
        </div>
        <div class="info">
            <p>${player_obj.name}</p>
        </div>
    </li>
`).join("");
const filter_xss = (word) => word.toString()
                                .replace(/</g, "&lt;")
                                .replace(/>/g, "&gt;")
                                .replace(/\n/g, "")
                                .replace(/\r/g, "")
                                .replace(/\'/g, "&#39;")
                                .replace(/\"/g, "&quot;");
const sumObjectsByKey = (...objs) => {
    return objs.reduce((a, b) => {
    for (let k in b) {
        if (b.hasOwnProperty(k))
        a[k] = (a[k] || 0) + b[k];
    }
    return a;
    }, {});
}
const multiply_values_in_object = (obj, factor) => {
    return Object.keys(obj).reduce((acc, key) => {
        acc[key] = obj[key] * factor;
        return acc;
    }, {});
}

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

        const this_player = room_data_json.game.players.find(player => player.suid === getCookie("suid"));

        //Get the questions
        questions = room_data_json.game.current_questions;
        is_leader = room_data_json.game.leader.suid === getCookie("suid");
        self_voting = room_data_json.game.config.self_voting;
        extra_snippets = room_data_json.game.config.extra_snippets;
        current_snippets = room_data_json.game.current_snippets;

        sentences = this_player.sentences;
        all_players = players;

        const story_writing_time = room_data_json.game.config.story_writing_time * 1000;
        const game_start_time = room_data_json.game.start_time;
        const game_state = room_data_json.game_state;
        const game_voting_index = room_data_json.game.voting_index;

        const player_answers = room_data_json.game.current_player_answers;
        const word_contributors = room_data_json.game.word_contributors;

        voting_index = room_data_json.game.voting_index;

        if (game_state === "STORY") {
            clock(game_start_time + story_writing_time, () => {
                if (!has_submitted_story) text_submit.click();
            });
        }
        else if (game_state == "ANSWER"){
            has_submitted_story = true;
            current_question_index = this_player.questions_answered-1;

            text_input_area.innerHTML = display_question_view(current_snippets);
        }
        else if (game_state == "VOTE"){
            has_submitted_story = true;

            current_voting_index = game_voting_index;
            current_player_answers = player_answers;
            next_voting();
        }
        else if (game_state == "RESULT"){
            has_submitted_story = true;
            current_total_votes = room_data_json.game.current_player_votes;

            document.body.innerHTML = display_results(word_contributors);
        }

    }catch(err){
        console.log(err)
        console.log("error");
    }
})();

// -------------------------------------------------- TEXT INPUT -------------------------------------------------- //
//text server out
text_submit.addEventListener("click", async () => {
    const text = text_input.value;
    const xss_filtered_text = filter_xss(text);
    const mapped_text = xss_filtered_text.split(" ").map(word => {
        return {
            word: word,
            owner: getCookie("suid"),
            owner_name: getCookie("usnm"),
        }
    });


    //send the text to the server if it's not empty
    if(mapped_text.length > 0){
        has_submitted_story = true;

        socket.emit("game:text", {
            room_id: room_id,
            text: mapped_text,
            player: {
                name: getCookie("usnm"),
                suid: getCookie("suid"),
            }
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

    //update the player list
    player_list.innerHTML = display_players(players);

    if(data.all_done){
        //re render the player list, with the players not done
        player_list.innerHTML = display_players(players);
        
        text_input_area.innerHTML = display_question_view(current_snippets);

        clear_clock();
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

    //transition with the text as the current question
    transition(questions[current_question_index].question, false, () => {}, questions[current_question_index].additional_snippets);

    sentences.push({
        question_id: current_question_index,
        sentence: [],
        player: getCookie("usnm")
    });

    return `

        <div class="question fade-in-view">
            <h1>${questions[current_question_index].question}</h1>
        </div>
        <div class="question-answer fade-in-view">
            <div class="snippet-output" id="snippet-output">

            </div>
            <div class="snippet-input" id="snippet-input">
                ${
                    current_extra_snippets.map(word => {
                        return `
                            <span onclick="add_word('${filter_xss(word.word)}', '${word.owner_name}', '${word.owner}')" class="snippet clickable golden">${word.word}</span>
                    `}).join(" ")
                }
                ${
                    //randomly sort the snippets
                    current_snippets.sort(() => Math.random() - 0.5).map(word => {
                        return `
                            <span onclick="add_word('${filter_xss(word.word)}', '${word.owner_name}', '${word.owner}')" class="snippet clickable">${word.word}</span>
                    `}).join(" ")
                }
            </div>
            
            <div class="keyboard-controls" draggable="false">

                <div draggable="false" class="shuffle" onclick="shuffle_snippets('${questions[current_question_index].additional_snippets}')"><img draggable="false" src="https://artur.red/icons/shuffle.svg" alt="Shuffle" ></div>
                <div draggable="false" id="mini-keyboard-toggle" onclick="toggle_keyboard('${questions[current_question_index].additional_snippets}')">
                    😂
                </div>
            </div>
        </div>
        
        <button onclick="submit_sentence()" class="submit">Submit</button>
    `;
}

// -------------------------------------------------- SNIPPET INPUT -------------------------------------------------- //

const add_word = (word, owner, suid) => {
    sentences[current_question_index].sentence.push({
        word: filter_xss(word).toLowerCase(),
        owner_name: owner,
        owner: suid,
        id: get_unique_id(),
    });

    snippet_output = document.getElementById("snippet-output");
    snippet_output.innerHTML = sentences[current_question_index].sentence.map(word => `
        <span id="word_${word.id}" class="snippet removable" onclick="remove_word('${word.id}')">${word.word}</span>
    `).join("");
}
    
const remove_word = (word_id) => {
    document.getElementById(`word_${word_id}`).remove();

    sentences[current_question_index].sentence = sentences[current_question_index].sentence.filter(word_obj => word_obj.id !== word_id);
}

const shuffle_snippets = (additional) => {
    let extra = current_extra_snippets.map(snippet => `
        <span class="snippet golden" onclick="add_word('${snippet.word}', '${getCookie("usnm")}', '${getCookie("suid")}')">${snippet.word}</span>
    `).join(" ");
    
    let _additional = "";
    if (additional != "null") {
        _additional = additional.split(",").map(snippet => `
            <span class="snippet golden" onclick="add_word('${snippet}', '${getCookie("usnm")}', '${getCookie("suid")}')">${snippet}</span>
        `).join(" ");
    }

    let regular = current_snippets.sort(() => Math.random() - 0.5).map(word => `
            <span onclick="add_word('${filter_xss(word.word)}', '${word.owner_name}', '${word.owner}')" class="snippet clickable">${word.word}</span>
    `).join(" ");
    document.getElementById("snippet-input").innerHTML = extra + _additional + regular;
}

const submit_sentence = () => {

    socket.emit("game:question-answered", {
        room_id: room_id,
        suid: getCookie("suid"),
        sentences: sentences,
    });
    text_input_area.innerHTML = display_question_view(current_snippets);

}

const send_sentences = () => {
    socket.emit("game:submit-sentences", {
        room_id: room_id,
        sentences: sentences,
        player: {
            name: getCookie("usnm"),
            suid: getCookie("suid")
        }
    });
}

socket.on(`game:submit-sentences:${room_id}`, (data) => {
    const players = data.players;
    current_player_answers = data.current_player_answers;

    //update the player list
    player_list.innerHTML = display_players(players);

    //render the voting view if all players have submitted their sentences
    if(data.all_done) {
        next_voting();
    }
})

// -------------------------------------------------- DISPLAY VOTING -------------------------------------------------- //

const next_voting = () => {

    transition(questions[display_card_owner_percentage_index].question, true, () => {

        text_input_area.innerHTML = display_voting_view(current_voting_index);

        //next voting index :O
        current_voting_index++;
        
        //pull the voting card animation.
        show_voting_cards()
    }, null);
}

const display_voting_view = (index) => {

    return `
        <div class="question">
            <h1>${questions[current_voting_index].question}</h1>
        </div>
        <div class="center player-answer-container-TEST">
            ${

                current_player_answers.map((player_obj, player_idx) => `
                    <div id="card_${player_obj.player.suid}" class="player-answer voting-card-selector ${
                        self_voting
                        ? ""
                        : player_obj.player.suid == getCookie("suid")?'disabled':''
                    }" onclick="${
                        
                        //if its the own players card they should not be able to vote for themself.
                        //however if self_voting is enabled, they can vote for themselves
                        self_voting
                        ? `vote_for('${player_obj.player.suid}')`
                        : player_obj.player.suid == getCookie("suid")?'':`vote_for('${player_obj.player.suid}')`

                    }">
                        <div class="snippet-overflow">
                            <p>${
                                player_obj.sentences[index].sentence.map(word => `<span class="owner snippet-owner-${word.owner}">${word.word}<span class="tooltiptext">${word.owner_name}</span></span>`).join(" ")
                            }</p>
                        </div>
                        <div class="snippet-bottom"></div>
                        <p class="score"></p>

                        <div class="player">
                            <div class="pfp">
                                <img style="background: ${player_obj.player.player_color}" src="https://artur.red/faces/${player_obj.player.pfp}.svg" alt="Player profile image">
                            </div>
                            <p>${player_obj.player.name}</p>
                        </div>

                        <img src="https://artur.red/icons/checkmark.svg" class="checkmark" alt="checkmark">
                    </div>
                `).join("")
            }
        </div>
    `;
}

// -------------------------------------------------- HANDLE VOTING -------------------------------------------------- //

const vote_for = (voted_for_suid) => {

    if(!has_voted){
        socket.emit("game:vote-for", {
            room_id: room_id,
            voter: {
                name: getCookie("usnm"),
                suid: getCookie("suid")
            },
            voted_for_suid: voted_for_suid,
        });

        document.getElementById(`card_${voted_for_suid}`).classList.add("vote");

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
    current_player_answers = data.current_player_answers;
    const word_contributors = data.word_contributors;
    const most_voted_for = data.most_voted_for;

    //update the player list
    player_list.innerHTML = display_players(players);

    current_total_votes = total_votes;

    if (all_done) {

        if(current_voting_index >= questions.length){
            display_card_owner_percentage(players, most_voted_for, total_votes);
            setTimeout(() => document.body.innerHTML = display_results(word_contributors), 4000);

            return;
        }else{

            display_card_owner_percentage(players, most_voted_for, total_votes);
            setTimeout(() => next_voting(), 4000);
        }
    }
});

const display_card_owner_percentage = (players, most_voted_for, all_cards) => {

    all_cards.map(card => {

        const user = card.user;
        const voters = card.votes;

        console.log(user, voters);

        const player_card_bottom = document.querySelector(`#card_${user} .snippet-bottom`);
        player_card_bottom.innerHTML = voters.map((voter, index) => `
            <img class="mini-pfp" style="animation-delay: ${index*0.25+1}s; background: ${voter.player_color}" src="https://artur.red/faces/${voter.pfp}.svg" alt="Player profile image">
        `).join("");
    });

    most_voted_for.map(mvf_object => {

        const user = mvf_object.user;
        
        const player_card = document.getElementById(`card_${user}`);
        player_card.classList.add("winning-card");
        player_card.classList.add("player-visible");

        const current_player_owned_snippets = document.querySelectorAll(`#card_${user} .owner`);

        //all players have a player_color, so color all the current_player's snippets with their color
        current_player_owned_snippets.forEach(snippet => {
            try{
                snippet.style.background = players.find(this_player => this_player.suid == snippet.classList[1].split("-")[2]).player_color;
                snippet.classList.add("tooltip");

                const tooltip = document.querySelectorAll(`#card_${player} .owner .tooltiptext`);
                tooltip.innerHTML = players.find(this_player => this_player.suid == snippet.classList[1].split("-")[2]).name;
            }catch{}
        });
    });

    display_card_owner_percentage_index++;
}

const display_results = (word_contributors) => {

    let current_total_votes_OBJ = {};
    current_total_votes.forEach(el => {
        current_total_votes_OBJ[el.user] = el.votes.length;
    })

    //because we want to merge current_total_votes and word_contributions
    //we need to convert current_total_votes to an object because it is 
    //originally an array and word_contributors is an object. 😎😎😎😎😎😎

    let summed_results = sumObjectsByKey(multiply_values_in_object(current_total_votes_OBJ, 100), multiply_values_in_object(word_contributors, 0.35));
    const sorted_results = Object.keys(summed_results).sort((a, b) => summed_results[b] - summed_results[a]);

    let winner = sorted_results[0];
    let second_place = sorted_results[1]??null;
    let third_place = sorted_results[2]??null;

    let winner_obj, second_place_obj, third_place_obj;

    winner_obj = {
        score: parseInt(summed_results[winner]),
        color: all_players.find(player => player.suid == winner).player_color,
        pfp: all_players.find(player => player.suid == winner).pfp,
        player: all_players.find(player => player.suid == winner).name,
    }
    try{
        second_place_obj = {
            score: parseInt(summed_results[second_place]),
            color: all_players.find(player => player.suid == second_place).player_color,
            pfp: all_players.find(player => player.suid == second_place).pfp,
            player: all_players.find(player => player.suid == second_place).name,
        }
    }catch{
        second_place_obj = {score: 0, color: "", pfp: 0, player: ""};
        second_place = null;
    }
    try{
        third_place_obj = {
            score: parseInt(summed_results[third_place]),
            color: all_players.find(player => player.suid == third_place).player_color,
            pfp: all_players.find(player => player.suid == third_place).pfp,
            player: all_players.find(player => player.suid == third_place).name,
        }
    }catch{
        third_place_obj = {score: 0, color: "", pfp: 0, player: ""};
        third_place = null;
    }

    return `
        <h1 class="winner-top-text">${all_players.find(player_obj => player_obj.suid == winner).name.toUpperCase()} IS THE WINNER</h1>

		<div class="blob-container">
			<div class="blob-1"></div>
			<div class="blob-2"></div>
			<div class="blob-3"></div>
		</div>
		<div class="rank-container">
			${
                second_place == null
                ? ""
                : `<div class="rank rank-nr-2">
				<div class="player ">
					<div class="pfp">
						<img style="background: ${second_place_obj.color}" src="https://artur.red/faces/${second_place_obj.pfp}.svg" alt="Player profile image">
					</div>
					<div class="info">
						<p>${second_place_obj.player}</p>
					</div>
				</div>
				<div class="rank-2 rank-display">2<span class="total-points">${second_place_obj.score} Points</span></div>
			</div>`}
			<div class="rank rank-nr-1">
				<div class="player">
					<div class="pfp">
						<img style="background: ${winner_obj.color}" src="https://artur.red/faces/${winner_obj.pfp}.svg">
					</div>
					<p>${winner_obj.player}</p>
				</div>
				<div class="rank-1 rank-display">1<span class="total-points">${winner_obj.score} Points</span></div>
			</div>
			${
                third_place == null
                ? ""
                : `<div class="rank rank-nr-3">
				<div class="player">
					<div class="pfp">
						<img style="background: ${third_place_obj.color}" src="https://artur.red/faces/${third_place_obj.pfp}.svg">
					</div>
					<div class="info">
						<p>${third_place_obj.player}</p>
					</div>
				</div>
				<div class="rank-3 rank-display">3<span class="total-points">${third_place_obj.score} Points</span></div>
			</div>`}
		</div>
        <a href="https://artur.red"><button class="btl">Back to Lobby</button></a>
		<canvas id="winner-confetti"></canvas>

		<script src="https://artur.red/style/confetti.js"></script>
		<script>
			var confettiSettings = { "target": "winner-confetti", "max": "150", "size": "1.5", "animate": true, "props": ["square"], "colors": [[165, 104, 246], [230, 61, 135], [0, 199, 228], [253, 214, 126]], "clock": "20", "rotate": true, "start_from_edge": true, "respawn": true };
			var confetti = new ConfettiGenerator(confettiSettings);
		</script>
    `
}

/* -------------------------------------------------- PLAYER CLEARING -------------------------------------------------- */

socket.on(`game:clear-player-done:${room_id}`, (data) => {
    const players = data.players;

    //update the player list
    player_list.innerHTML = display_players(players);

});

/* -------------------------------------------------- WORD FINDING -------------------------------------------------- */

//Okay so when the player starts typing something on the keyboard,
//we want to search the whole page for that word. and then we want
//to highlight it with a background.
let word = "";
document.addEventListener("keyup", (e) => {
    if(e.key == "Backspace"){
        //if the player has backspaced, we want to remove the last character from the word they are typing.
        word = word.slice(0, -1);
    }if (e.key == "Enter" || e.key === " " || e.key === "Spacebar"){

        if(word == "") return;
        
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

/* -------------------------------------------------- KEYBOARDS -------------------------------------------------- */

let state = 1;
let total_states = 0;
let time_out = null;

const new_snippets_set = (input_str, additional_snippets) => {

    //prebuilt_keyboard_words is just used because there are two types of word arrays.
    //nr1: [{word: "some_word", owner: "some_owner"}, {word: "some_word", owner: "some_owner"}]
    //nr2: ["some_word", "some_word"]
    //and they need diffrent mapping methods.

    const is_additional_snippets = additional_snippets != 0 || additional_snippets != null;


    let new_additional_snippets = []
    if(typeof additional_snippets == "string"){
        if(additional_snippets.includes(",")){
            new_additional_snippets = additional_snippets.split(",");
        }else{
            new_additional_snippets = [additional_snippets];
        }
    }else{
        new_additional_snippets = additional_snippets;
    }

    if (typeof input_str === "string") {

        return [...input_str].map(element => `<span onclick="add_word('${element}', '', '')" class="snippet clickable">${element}</span>`).join("");

    }else{

        if (is_additional_snippets && additional_snippets != "null" && additional_snippets != undefined && additional_snippets != "undefined"){
            try{

                return new_additional_snippets.map(element => `<span onclick="add_word('${filter_xss(element)}', '')" class="snippet clickable golden">${filter_xss(element)}</span>`).concat(
                    current_extra_snippets.map(element => `<span onclick="add_word('${filter_xss(element.word)}', '${element.owner}', '${element.suid}')" class="snippet clickable golden">${filter_xss(element.word)}</span>`)).concat(
                    input_str.map(element => `<span onclick="add_word('${filter_xss(element.word)}', '${element.owner_name}', '${element.owner}')" class="snippet clickable">${filter_xss(element.word)}</span>`)).join("");

            }catch(err){
                return input_str.map(element => `<span onclick="add_word('${filter_xss(element.word)}', '${element.owner_name}', '${element.owner}')" class="snippet clickable">${filter_xss(element.word)}</span>`).join("");
            }
        }else{
            return current_extra_snippets.concat(input_str).map(element => `<span onclick="add_word('${filter_xss(element.word)}', '${element.owner_name}', '${element.owner}')" class="snippet clickable">${filter_xss(element.word)}</span>`).join("");
        }
    }
}
const set_keyboard_state = (state) => {
    document.getElementById("mini-keyboard-toggle").innerHTML = `<span style='color: white'>${state}</span>`;
}
const toggle_keyboard = (additional_snippets) => {
    total_states++;
    state++;

    clearTimeout(time_out);
    time_out = setTimeout(() => {
        total_states = 0;
    }, 3000);

    switch (state) {
        case 1:
            set_keyboard_state("😂");
            
            document.getElementById("snippet-input").innerHTML = new_snippets_set(current_snippets, additional_snippets);
            break;

        case 2:
            set_keyboard_state("&");

            document.getElementById("snippet-input").innerHTML = new_snippets_set("🤩👍😎😂👎👀🔥🥳🤡", 0);
            break;
             
        case 3:
            document.getElementById("snippet-input").innerHTML = new_snippets_set(".,()+=!?", 0);

            if (extra_snippets <= 0){
                set_keyboard_state("🔤");
                state = 0;
                break;
            }else{
                set_keyboard_state("🔣");
                break;
            }

        case 4:
            set_keyboard_state("🔙");

            document.getElementById("snippet-input").innerHTML = `
                <h2 class="center" style="height: min-content !important;">
                    Here you can create some extra snippets! Use this feauture sparingly.
                </h2>
                <div style="flex-direction: row; display: flex; justify-content: center; align-items: center; height: max-content; padding: .2rem;">

                    <input style="width: 14rem;" type="text" id="extra-snippet-input-text" placeholder="Type here...">
                    <button onclick="add_extra_snippet()" style="display: inline-block;">Add</button>

                </div>
                <p class="center" style="height: min-content;"><strong id="extra-snippet-count">${extra_snippets}</strong>&nbsp;extra-snippets left.</p>
            `

            state = 0;
            break;

        default:
            state = 0;
            break;
    }

    if (total_states > 30) {
        //                      this is very sneaky right....?
        document.getElementById("uhh-\u006Eothing" + "-to-see-here").innerHTML += '<img src="https://c.tenor.com/-QwFtBLal2kAAAAd/matthew-santoro-you-take-some-lobster.gif" alt="funny man indeed" class="funny-man">';
        setTimeout(() => {
            try{
                document.getElementById("uhh-nothing" + "-to-see-here").remove();
            }catch{
                return;
            }
        }, 2000);
    }
}
const add_extra_snippet = () => {
    if (extra_snippets < 0) return;
    const value = document.getElementById("extra-snippet-input-text").value;
    document.getElementById("extra-snippet-input-text").value = "";

    socket.emit("game:extra-snippet", {
        word: value,
        owner: getCookie("suid"),
        room_id: room_id
    });
}
socket.on(`game:extra-snippet:${room_id}`, (data) => {

    // if the user is not the owner of the snippet, then we don't want to add it to the list
    //becauase extra snippets are private
    if (data.owner == getCookie("suid")){
        current_extra_snippets.push({
            word: data.word,
            owner: getCookie("usnm")
        });

        extra_snippets--;
        document.getElementById("extra-snippet-count").innerHTML = extra_snippets;

        state = 0;
        toggle_keyboard(questions[current_question_index].additional_snippets);
    }
});

/* -------------------------------------------------- ANIMATIONS -------------------------------------------------- */

/* TRANSITION OVERLAY */
const transition = (text, is_voting, function_callback, additional) => {

    let has_skipped_transition = false;

    if(document.getElementById("transition-container").innerHTML != ""){
        document.getElementById("transition-container").innerHTML = "";
    }
    document.getElementById("transition-container").innerHTML += `
        <div class="screen-overlay" id="screen-overlay">
            <p class="transition-title-text">${(is_voting)?"Voting":""}</p>
            <h1 id="screen-overlay-text">${text}</h1>


            <div id="cardboard-box" class="cardboard-box" style="z-index: 120;">
                <img src="https://artur.red/images/cardboard-box.svg">
            </div>

            ${
                (additional != null) ? `
                    <div class="mini-sunburst" id="mini-sunburst"></div>

                    <div class="additional-snippet-container" id="additional-snippet-container">
                        ${
                            additional.map(snippet => `
                                <span class="snippet golden is_additional">${snippet}</span>
                            `).join(" ")
                        }
                    </div>
                `:""
            }

        </div>
    `

    if(additional != null){
        setTimeout(() => {
            animate_additional_snippets();
            state = 0;
            toggle_keyboard(additional);
        }, 3000);
    }

    const screen_overlay = document.getElementById("screen-overlay");
    screen_overlay.onclick = () => {
        has_skipped_transition = true;
        if(typeof function_callback === "function") function_callback();
        screen_overlay.style.animation = "screen-overlay-end 1s ease-in-out forwards";
    }

    const extra_time = (additional != null)?4000:0;

    setTimeout(() => {
        screen_overlay.style.animation = "screen-overlay-end 1s ease-in-out forwards";

        setTimeout(() => {
            if(typeof function_callback === "function" && !has_skipped_transition) function_callback();
            else return;
        }, 500);
        
    }, 3000 + text.length*70 + extra_time);
}
const animate_additional_snippets = () => {
    const asc = document.getElementById("additional-snippet-container");
    const cb = document.getElementById("cardboard-box");
    const ms = document.getElementById("mini-sunburst");
    cb.style.transform = "translate(-50%, 50%)";
    asc.style.transform = "translate(-50%, 50%)";

    setTimeout(() => {ms.style.opacity = "1";}, 750);

    const all_additional_snippets = document.querySelectorAll(".is_additional");

    const SNIPPET_DELAY = 0.3;
    const SCREEN_WIDTH = window.innerWidth;
    const START_DELAY = 1400;

    all_additional_snippets.forEach((child, index) => {
        setTimeout(() => {
            console.log(child);
            child.style.transition = "transform 1s ease-in-out, opacity 1s ease-in-out";
            child.style.transform = `translate(${100/2-(index*100/all_additional_snippets.length) - (100/all_additional_snippets.length)/2}vw, -25vh)`;
            child.style.opacity = 1;
        }, (SNIPPET_DELAY*1000)*index + START_DELAY);
    });
}
/* Voting cards show animation */
const show_voting_cards = () => {
    const cards = document.querySelectorAll(".voting-card-selector");
    const next_card_delay = 200;

    cards.forEach((card, i) => {
        setTimeout(() => {
            card.style.transform = `scale(1)`;
        }, next_card_delay*i);
    });
};

/* -------------------------------------------------- Sound Effects -------------------------------------------------- */

const play_sound = (sound_url = "https://www.myinstants.com/media/sounds/vine-boom.mp3", volume = 1, fadeOutTime = null, loop = false, pitch = 1) => {
    const sound = new Audio(sound_url);
    sound.volume = volume;
    sound.loop = loop;
    sound.pitch = pitch;
    
    //fade out sound effect
    if(fadeOutTime != null){
        const soundFade = setInterval(() => {
            if(sound.volume != 0) {
                sound.volume -= 0.1;
            } else{
                clearInterval(soundFade);
            }
        }, fadeOutTime);
    }
}

/* -------------------------------------------------- CLOCK -------------------------------------------------- */

let clock_interval = null;

const clock = (end_time, callback) => {
    const clock_counter = document.getElementById("clock-counter");

    clock_interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = end_time - now;

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        //mm:ss
        const time = `${(minutes < 10)?"0"+minutes:minutes}:${(seconds < 10)?"0"+seconds:seconds}`;

        if (distance < 0) {
            clearInterval(clock_interval);
            clock_interval = null;
            callback();
        }else{
            clock_counter.innerHTML = time;
        }
    }, 100);
}
const clear_clock = () => {
    clearInterval(clock_interval);
    clock_interval = null;

    const clock_counter = document.getElementById("clock-counter");
    clock_counter.innerHTML = "";
}