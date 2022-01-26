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

const VOTING_TIME_IN_MS = 20000;

const get_unique_id = () => {
    return Math.random().toString(36);
}

//it cycles through all the questions and
//all the player items using this variable
let current_voting_index = 0;

//mini functions
const display_players = (players) => players.map(player_obj => `
    <li class="player ${player_obj.done?"active":""}" ${player_obj.suid == getCookie("suid")?"style='border: 2px solid var(--vibrant-green);'":""}>
        <div class="pfp">
            <img style="background: ${player_obj.player_color}" src="https://artur.red/faces/${player_obj.pfp}.svg" alt="Player profile image">
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
const map_obj_to_percentage = (obj) => {
    let total = 0;
    Object.values(obj).forEach(value => total += value);
    return Object.keys(obj).map(key => {
        return {
            [key]: Math.round((obj[key] / total) * 100)
        }
    });
}
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

        //Get the questions
        questions = room_data_json.game.current_questions;

        is_leader = room_data_json.game.leader.suid === getCookie("suid");
        self_voting = room_data_json.game.config.self_voting;
        extra_snippets = room_data_json.game.config.extra_snippets;

        all_players = players;
    }catch(err){
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
    console.log(current_snippets);
    const players = data.players;

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

    //transition with the text as the current question
    transition(questions[current_question_index].question, false, () => {
        if (questions[current_question_index].additional_snippets != null) {
            additional_words(questions[current_question_index].additional_snippets);
        }
    });

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
const additional_words = (word_array) => {

    document.getElementById("additional-word-container").innerHTML += `
        <div id="full-container" style="position: absolute; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.923); left: 0; top: 0;">
            <div class="top-text-notice">
                <h1>Additional Snippets!</h1>
            <p>This question gives you some extra-snippets to use in you sentences!</p>
            </div>
            <div class="mini-sunburst-container">

                <div class="mini-sunburst"></div>
            </div>
            <div id="cardboard-box-container" class="cardboard-box" style="display: none;">
                
                <img src="https://artur.red/images/cardboard-box.svg" class="svg-container">
                <div class="svg-container">
                    <svg width="100%" height="100%" viewBox="0 0 2100 2100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2; z-index: 100;">
                        <g class="flap-lower">
                            <g transform="matrix(1,0,0,1,111.355,-78.7402)">
                                <path d="M1211.39,620.36L1628.97,325.085L1837.36,472.441L1419.78,767.717L1211.39,620.36Z" style="fill:rgb(188,145,111);"/>
                            </g>
                            <path d="M1322.64,546.57L1322.74,541.62L1531.14,688.976L1531.03,693.926L1322.64,546.57Z" style="fill:rgb(172,129,91);"/>
                            <path d="M1531.03,693.926L1531.14,688.976L1948.72,393.701L1948.61,398.65L1531.03,693.926Z" style="fill:rgb(181,134,94);"/>
                        </g>
                    </svg>
                </div>
                <div class="svg-container">
                    <svg width="100%" height="100%" viewBox="0 0 2100 2100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2; z-index: 100;">
                        <g class="flap-upper">
                            <g transform="matrix(1,0,0,1,111.355,-78.7402)">
                                <path d="M1210.99,620.079L1628.57,324.803L1836.9,472.111L1419.31,767.386L1210.99,620.079Z" style="fill:rgb(188,145,111);"/>
                            </g>
                            <path d="M1322.28,546.319L1322.35,541.339L1530.67,688.646L1530.61,693.627L1322.28,546.319Z" style="fill:rgb(172,129,92);"/>
                            <g transform="matrix(1,0,0,1,-0.467035,-0.330244)">
                                <path d="M1531.08,693.957L1531.14,688.976L1948.72,393.701L1948.66,398.681L1531.08,693.957Z" style="fill:rgb(155,109,71);"/>
                            </g>
                        </g>
                    </svg>
                </div>
            </div>

            <div class="additional-words">
                ${word_array.map(word => {
                return `<span class="snippet" id="additional-snippet" style="opacity: 0;">${word}</span>`
            }).join('')
                }
            </div>
        </div>
    `;

    //open the box
    document.getElementById("cardboard-box-container").classList.add("cardboard-box-container");
    document.getElementById("cardboard-box-container").style.display = "flex";
    const add_snippets = document.querySelectorAll("#additional-snippet")
    const time_between = 800; //ms

    setTimeout(() => {

        if (document.getElementById("additional-words") != undefined) return;

        for (let i = 0; i < add_snippets.length; i++) {
            setTimeout(() => {

                const percentage = i / add_snippets.length * (window.innerWidth)
                const center = window.innerWidth / 2 - (percentage + (1 / add_snippets.length * (window.innerWidth)) / 2)

                add_snippets[i].style.transform = `translate(calc(0px - 50%), calc(0px - 50%))`
                add_snippets[i].style.opacity = 0;
                setTimeout(() => {
                    add_snippets[i].style.transform = `translate(calc(${center}px - 50%), -35vh)`
                    add_snippets[i].style.opacity = 1;
                }, 100);

            }, i * time_between);
        }

        //on end
        setTimeout(() => {

            document.getElementById("cardboard-box-container").style.transformOrigin = "center center";
            document.getElementById("cardboard-box-container").style.animation = "cardboard-box-roll-out 2s ease-in-out forwards";

            setTimeout(() => {
                state = 0;
                toggle_keyboard(word_array.join(","));

                document.getElementById("full-container").remove();
            }, 1000);
        }, add_snippets.length*time_between+500);
    }, 2000);
};
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
    const current_player_answers = data.current_player_answers;

    //update the player list
    player_list.innerHTML = display_players(players);

    //render the voting view if all players have submitted their sentences
    if(data.all_done) {
        next_voting(current_player_answers);
    }
})


// -------------------------------------------------- DISPLAY VOTING -------------------------------------------------- //

const next_voting = (current_player_answers) => {

    transition(questions[display_card_owner_percentage_index].question, true, () => {

        try{
            //remove the "main" html object, but keep its children
            document.querySelector("nav").remove();
        }catch{}
        try{
            document.getElementsByTagName("main")[0].style.all = "unset"
        }catch{}

        text_input_area.innerHTML = display_voting_view(current_player_answers, current_voting_index);

        //next voting index :O
        current_voting_index++;
        
        //pull the voting card animation.
        show_voting_cards()
    });

    //The card percentage things is now moved to the other next_voting function...
}

const display_voting_view = (current_player_answers, index) => {

    document.getElementById("sunburst").style.display = "flex";

    console.log(current_player_answers)

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
                        
                        <p>${
                            console.log(player_obj.sentences[index].sentence),
                            player_obj.sentences[index].sentence.map(word => `<span class="owner snippet-owner-${word.owner}">${word.word}<span class="tooltiptext">${word.owner_name}</span></span>`).join(" ")
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
    const current_player_answers = data.current_player_answers;
    const word_contributors = data.word_contributors;
    const most_voted_for = data.most_voted_for;
    //update the player list
    player_list.innerHTML = display_players(players);
    current_total_votes = total_votes;

    if (all_done) {

        if(current_voting_index >= questions.length){
            display_card_owner_percentage(current_player_answers, players, most_voted_for);
            setTimeout(() => document.body.innerHTML = display_results(word_contributors), 4000);

            return;
        }else{

            display_card_owner_percentage(current_player_answers, players, most_voted_for);
            setTimeout(() => next_voting(current_player_answers), 4000);
        }
    }
});

//displays the percentage at the bottom of
//cards + colors all the snippets in the card
//based on the player's player_color
const display_card_owner_percentage = (current_player_answers, players, most_voted_for) => {

    const voting_index_answers = current_player_answers.map(player => player.sentences[display_card_owner_percentage_index].owners);
    console.log(players)

    most_voted_for.map(player_suid => {
        
        const player_card = document.getElementById(`card_${player_suid}`);
        // const player_card_content = player_card.querySelector(".bottom");
        player_card.classList.add("winning-card");

        const current_player_owned_snippets = document.querySelectorAll(`#card_${player_suid} .owner`);

        //all players have a player_color, so color all the current_player's snippets with their color
        current_player_owned_snippets.forEach(snippet => {
            try{
                snippet.style.background = players.find(this_player => this_player.suid == snippet.classList[1].split("-")[2]).player_color;
                snippet.classList.add("tooltip");

                const tooltip = document.querySelectorAll(`#card_${player} .owner .tooltiptext`);
                tooltip.innerHTML = players.find(this_player => this_player.suid == snippet.classList[1].split("-")[2]).name;
            }catch{}
        });


        // voting_index_answers_percentage.map((contributors, index) => {

            // contributors.map(contributor => {
            //     const percentage = Object.values(contributor)[0];
            //     const name = Object.keys(contributor)[0];
            //     const color = getColor();

            //     // player_card_content.innerHTML += `<div class="percentage" style="width: ${percentage}%; background: ${color}">${name} - ${percentage}%</div>`;
            // });
        // });
    });

    display_card_owner_percentage_index++;
}
const display_results = (word_contributors) => {

    let summed_results = sumObjectsByKey(multiply_values_in_object(current_total_votes, 100), multiply_values_in_object(word_contributors, 1));
    const sorted_results = Object.keys(summed_results).sort((a, b) => summed_results[b] - summed_results[a]);

    let winner = sorted_results[0];
    let second_place = sorted_results[1]??null;
    let third_place = sorted_results[2]??null;


    console.log(sorted_results)
    console.log(winner, second_place, third_place);

    let winner_obj, second_place_obj, third_place_obj;

    winner_obj = {
        score: summed_results[winner],
        color: all_players.find(player => player.suid == winner).player_color,
        pfp: all_players.find(player => player.suid == winner).pfp,
        player: all_players.find(player => player.suid == winner).name,
    }
    try{
        second_place_obj = {
            score: summed_results[second_place],
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
            score: summed_results[third_place],
            color: all_players.find(player => player.suid == third_place).player_color,
            pfp: all_players.find(player => player.suid == third_place).pfp,
            player: all_players.find(player => player.suid == third_place).name,
        }
    }catch{
        third_place_obj = {score: 0, color: "", pfp: 0, player: ""};
        third_place = null;
    }

    return `
		<h1 class="winner-top-text fade-in-view rank-nr-1">${all_players.find(player_obj => player_obj.suid == winner).name.toUpperCase()} IS THE WINNER</h1>

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
						<span class="total-points">${second_place_obj.score}</span>
					</div>
				</div>
				<div class="rank-2">2</div>
			</div>`}
			<div class="rank rank-nr-1">
				<div class="player ">
					<div class="pfp">
                        <img style="background: ${winner_obj.color}" src="https://artur.red/faces/${winner_obj.pfp}.svg" alt="Player profile image">
					</div>
					<div class="info">
						<p>${winner_obj.player}</p>
						<span class="total-points">${winner_obj.score}</span>
					</div>
				</div>
				<div class="rank-1">1</div>
			</div>
			${
                third_place == null
                ? ""
                : `<div class="rank rank-nr-3">
				<div class="player ">
					<div class="pfp">
                        <img style="background: ${third_place_obj.color}" src="https://artur.red/faces/${third_place_obj.pfp}.svg" alt="Player profile image">
                    </div>
					<div class="info">
						<p>${third_place_obj.player}</p>
						<span class="total-points">${third_place_obj.score}</span>
					</div>
				</div>
				<div class="rank-3">3</div>
			</div>`}
		</div>
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

    console.log(input_str);

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
            set_keyboard_state("🔤");

            document.getElementById("snippet-input").innerHTML = new_snippets_set(".,()+=!?", 0);
            break;

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
    current_extra_snippets.push({
        word: data.word,
        owner: getCookie("usnm")
    });

    extra_snippets--;
    document.getElementById("extra-snippet-count").innerHTML = extra_snippets;

    state = 0;
    toggle_keyboard(questions[current_question_index].additional_snippets);
});

/* -------------------------------------------------- ANIMATIONS -------------------------------------------------- */

/* TRANSITION OVERLAY */
const transition = (text, is_voting, function_callback) => {
    if(document.getElementById("transition-container").innerHTML != ""){
        document.getElementById("transition-container").innerHTML = "";
    }
    document.getElementById("transition-container").innerHTML += `
        <div class="screen-overlay" id="screen-overlay">
            <p class="transition-title-text">${(is_voting)?"Voting":""}</p>
            <h1 id="screen-overlay-text">${text}</h1>
        </div>
    `
    const screen_overlay = document.getElementById("screen-overlay");

    setTimeout(() => {
        screen_overlay.style.animation = "screen-overlay-end 1s ease-in-out forwards";

        setTimeout(() => {
            if(typeof function_callback === "function") function_callback();
            else return;
        }, 500);
        
    }, 3000 + text.length*50);
}

/* Voting cards show animation */
const show_voting_cards = () => {
    const cards = document.querySelectorAll(".voting-card-selector");
    const card_amount = cards.length;
    const next_card_delay = 100;
    const card_animation_duration = "1s"

    cards.forEach((card, i) => {
        const r_amount = (Math.random() * 10)-10/2;
        card.style.transform = `rotate(${r_amount}deg)`
        card.style.zIndex = card_amount+1-i;

        setTimeout(() => {
            
            const angle = (i / card_amount) * 2 * Math.PI;
            const x = Math.cos(angle) * 600;
            const y = Math.sin(angle) * 300;
            card.style.transition = `transform ${card_animation_duration} cubic-bezier(.18,.97,.86,1.02) 1s, width .05s ease-in-out, height .05s ease-in-out`;
            card.style.transform = `translate(${x}px, ${y}px) rotate(${r_amount}deg)`;
        }, next_card_delay*i);
    });
};