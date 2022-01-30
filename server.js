//express as default server router
const express    = require("express");
const app        = express();

//socket.io
const http       = require("http")
const server     = http.createServer(app);
const { Server } = require("socket.io");
const io         = new Server(server);

//read .env files
require("dotenv").config();

//8080: backend.artur.red, 8081: artur.red
const PORT       = process.env.PORT;

//Path for better path handling
const path       = require("path");

//Render HTML for variable passing.
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
app.set("views", __dirname);

//cors for 3party requests
const cors = require("cors");
app.use(cors());

//os for processor info
const os = require("os");

//disk reading and writing
const fs = require("fs");

//game room QR codes
const qr_code = require("qrcode");

//get free disk space in GB
const get_free_space = () => {
    const disk = os.freemem();
    const free_space = disk / 1000000000;
    return free_space + " GB used";
}

//Crypto for room code generation
const crypto     = require("crypto");
const generate_roomcode = () => crypto.randomBytes(32).toString("hex");
const generate_uid = () => crypto.randomBytes(16).toString("hex");
const generate_small_code = () => parseInt(Math.random() * (10000000 - 1000000) + 1000000);

//cookie parser
const cookieParser = require("cookie-parser");
app.use(cookieParser());

const names = require(path.resolve("server/names.js"));
const questions = require(path.resolve("server/questions.js"));

const get_questions = (questionCount, players, type) => {
    questionsArray = []
    let current_index = 0;

    while (current_index < questionCount) {
        const question = questions.getQuestion(players, type);
        if (questionsArray.map(x => x.question).includes(question.question)) {
            continue;
        }else {
            questionsArray.push(question);
            current_index++;
        }
    }

    return questionsArray;
}

//default file paths
const default_paths = {
    illegal_game: path.resolve("frontend/html/error-pages/roomError.html"),
    home: path.resolve("frontend/html/index.html"),
    room: path.resolve("frontend/html/game/room.html"),
    game_room: path.resolve("frontend/html/game/game.html"),
    name_select: path.resolve("frontend/html/name.html"),
    room_select: path.resolve("frontend/html/game/game-join.html"),
    user_input: path.resolve("resources/files/user-data.txt"),
    browse_rooms: path.resolve("frontend/html/game/browse-games.html"),
}

//custom messages like "you've been kicked from this room";
const custom_message = (message) => {
    return `
        <div style="display: flex;justify-content: center;align-items: center;flex-direction: column;width: 100%;height: 100%;position: absolute;top: 0;left: 0;z-index: 1;background: #222634;">
            <p style="color: white;">Oh no!</p>
            <h1 style="color: white;">${message}</h1>
            <a href="https://artur.red">
                <button style="	border: 1px solid #BABABACC;border-radius: .5rem;background: transparent;color: white;box-sizing: border-box;padding: 1rem;height: min-content;min-width: 8rem;font-size: 0.9rem;cursor: pointer;">
                    Home
                </button>
            </a>
        </div>
    `
}

const bad_words = fs.readFileSync(path.resolve("resources/files/filtered-words.txt"), "utf8").split("\n");
const filter_bad_words = (text) => {
    let filtered_text = text;
    bad_words.forEach(word => {
        filtered_text = filtered_text.replace(new RegExp(word, "gi"), "*".repeat(word.length));
    });

    return filtered_text;
}
//Mutational variables
let rooms = {};

//Constant variables
const DEBUG = true;

const MAX_PLAYERS_PER_ROOM = 8;
const MIN_PLAYERS_PER_ROOM = DEBUG ? 1 : 1;

const QUESTION_COUNT = 2;
const ROOM_CLEANUP_TIME = 1000 * 60 * 60; //1 hour
const ROOM_CLEANUP_CHECK_INTERVAL = 1000 * 60 * 60; //1 hour

const PROTOCOL = "https";
const BASE_URL = "artur.red";

const PROFILE_PICTURE_COUNT = fs.readdirSync(path.resolve("resources/faces")).length;

const DEFAULT_SNIPPETS = ["🤩", "👍", "😎", "😂", "👎", "👀", "🔥", "🥳", "🤡", ".", ",", "(", ")", "+", '+', "=", "!", "?"]
const ROOM_COLORS = ["#e6194B", "#f58231", "#ffe119", "#bfef45", "#3cb44b", "#42d4f4", "#4363d8", "#911eb4"];

const map_obj_to_percentage = (obj) => {
    //return an object with the original object's  values as percentages
    let total = 0;
    for (let key in obj) {  
        total += obj[key];
    }
    for (let key in obj) {
        obj[key] = parseInt(obj[key] / total * 100);
    }
    return obj;
}
const get_most_voted = object => {
    return Object.keys(object).filter(x => {
         return object[x] == Math.max.apply(null, 
         Object.values(object));
   });
};

//Express static folders
app.use("/", express.static(path.join(__dirname, "resources")));
app.use("/script", express.static(path.join(__dirname, "frontend/scripts")));
app.use("/style", express.static(path.join(__dirname, "frontend/style")));
app.use("/page", express.static(path.join(__dirname, "frontend/html")));

app.get("/favicon.ico", (req, res) => {res.sendFile(path.resolve("resources/images/logo.svg"))});

//Express Routes    || STATIC PAGES ONLY ||
app.get("/", (req, res) => {
    res.sendFile(default_paths.room_select);
});
//Express Routes    || *NON STATIC PAGES ONLY ||
app.get("/api/send-idea", (req, res) => {
    const text = req.headers.text;

    if(text != "") {
        //write to file
        fs.appendFile(default_paths.user_input, text + "\n", (err) => {
            if(err) console.log(err);
        });
        res.sendStatus(200);
    }
});
//room creation
app.get("/api/create-room", async (req, res) => {

    //generate room code
    const roomcode = generate_roomcode();
    const small_code = generate_small_code();
    const room_colors = ROOM_COLORS.sort(() => Math.random() - 0.5)
    const qr = await qr_code.toDataURL(`${PROTOCOL}://${BASE_URL}/${small_code}`, {color: {dark: "#000", light: "#00000000"}}).then(async (data) => await data);

    let leader = req.cookies["usnm"];
    let pfp = req.cookies["pfp"];
    let suid = req.cookies["suid"];


    //if the user got no name
    if(!leader){
        const new_name = names.generate_name();
        const new_pfp = names.generate_pfp(PROFILE_PICTURE_COUNT);
        const new_suid = names.generate_suid();

        res.cookie("usnm", new_name, {maxAge: 1000*60*60*24*30});
        res.cookie("pfp", new_pfp, {maxAge: 1000*60*60*24*30});
        res.cookie("suid", new_suid, {maxAge: 1000*60*60*24*30});
        res.cookie("selfselected", "auto", {maxAge: 1000*60*60*24*30});
        //self selected means if the user made their name themselves
        //or if it was my backend fucntions. So frontend checks if self selected is
        //auto, if it is, display a modal that the user can change name / pfp.

        leader = new_name;
        pfp = new_pfp;
        suid = new_suid;
    }

    //all the data for the leader of the room
    const leader_obj = {
        name: leader,
        uid: generate_uid(),
        suid: suid,
        pfp: pfp,
        done: false, //Done means that the player has finished their selection / text input
        leader: true,
        online: true,
        player_color: room_colors[0],
        extra_snippets_used: 0,
    }

    const leader_configuration_cache = {
        question_type:      req.cookies["CONF_question_type"]      || "regular",
        question_count:     req.cookies["CONF_question_count"]     || QUESTION_COUNT,
        extra_snippets:     req.cookies["CONF_extra_snippets"]     || 1,
        public:             req.cookies["CONF_public"]             || false,
        self_voting:        req.cookies["CONF_self_voting"]        || false,
        word_contribution:  req.cookies["CONF_word_contribution"]  || false,
        story_writing_time: req.cookies["CONF_story_writing_time"] || 90,
        answer_time:        req.cookies["CONF_answer_time"]        || 30,
    }


    //Create the room
    rooms[roomcode] = {
        roomcode: roomcode,
        small_code: small_code,
        qr: qr,

        cleanup: new Date().getTime() + ROOM_CLEANUP_TIME,
        room_colors: room_colors,

        game_dictionary: [],

        game: {
            players: [leader_obj],
            kicked_players: [],
            leader: leader_obj,
            started: false,
            start_time: 0,
            config: leader_configuration_cache,

            current_snippets: [],
            current_questions: [],
            current_player_answers: [],
            word_contributors: {},
            current_player_votes: {[leader]: 0},
        }
    };


    //send the user to the newly created room if they have a name.
    return res.redirect(`/room/${roomcode}`);
});
//Room selection page.
app.get("/room", (req, res) => {
    res.sendFile(default_paths.room_select);
});
//Browse games page
app.get("/browse", (req, res) => {
    res.sendFile(default_paths.browse_rooms);
});
//Browse games functionality (API)
app.get("/api/browse", (req, res) => {
    //only send the rooms that are public
    const rooms_to_send = {};
    
    for(let room in rooms) {
        if(rooms[room].game.config.public && !rooms[room].game.started) {
            rooms_to_send[room] = rooms[room];
        }
    }
    res.send(rooms_to_send);
});
//Looby / room page.
app.get("/room/:roomID", (req, res) => {

    const roomID = req.params.roomID;
    
    try{
        const is_leader = rooms[roomID].game.leader.suid == req.cookies["suid"];
        const new_uid = generate_uid();
        const uid = is_leader
            ? rooms[roomID].game.leader.uid
            : new_uid;

        const player_obj = {
            name: req.cookies.usnm,
            suid: req.cookies.suid,
            uid: uid,
            pfp: req.cookies.pfp,
            done: false,
            leader: is_leader,
            online: true,
            extra_snippets_used: 0,
        }

        //make the player online: true
        // rooms[roomID].game.players.find(x => x.uid === uid).online = true;

        //add the player to the voting list. if they are already in the list,
        //nothing happens because you override the value of the key. 
        rooms[roomID].game.current_player_votes[player_obj.suid] = 0;

        //Check if room exists
        if(!rooms[roomID]){
            return res.sendFile(default_paths.illegal_game);
        }
        //Check if room is full
        else if(Object.keys(rooms[roomID].game.players).length >= MAX_PLAYERS_PER_ROOM){
            return res.sendFile(default_paths.illegal_game);
        }
        //Check if room is started
        else if(rooms[roomID].game.started){
            return res.sendFile(default_paths.illegal_game);
        }
        //check if user is kicked
        if(rooms[roomID].game.kicked_players.includes(player_obj.suid)){
            return res.send(custom_message("you've been kicked from this room"));
        }

        //Else if the user is in the room (added in smallcode route)
        //then join the room, or if you are the leader of the room
        else if(rooms[roomID].game.players.find(x => x.suid === player_obj.suid) != undefined){
            res.sendFile(default_paths.room);
        }

        else{
            return res.sendFile(default_paths.illegal_game);
        }
        
    }catch(err){
        if (DEBUG) console.log(err);
        res.sendStatus(404);
    }
});
//game joining
app.get("/game/:gameID?", (req, res) => {

    const game_id = req.params.gameID;

    //Check if user has a name, a user should not be
    //able to join a already started game, if they
    //don't have a name, so we redirect them to home.
    if( !req.cookies.usnm
        || req.cookies.usnm == null
        || req.cookies.usnm.length <= 2
    ) return res.redirect("/");

    try{
        //Check if room exists
        if(!rooms[game_id]){
            return res.sendFile(default_paths.illegal_game);
        }

        //Check if user is in room
        if(!rooms[game_id].game.players.find(x => x.suid === req.cookies.suid)){
            return res.sendFile(default_paths.illegal_game);
        }

        //Check if game is started
        else if(!rooms[game_id].game.started){
            return res.sendFile(default_paths.illegal_game);
        }

        //Else join the room if its started
        if (rooms[game_id].game.started){

            //All the names of the players in the room
            const players_in_room = rooms[game_id].game.players.map(x => x.name);

            //add the questions to the room if they are not already there
            if(rooms[game_id].game.current_questions.length == 0){
                
                const questions = get_questions(
                    rooms[game_id].game.config.question_count,
                    players_in_room,
                    rooms[game_id].game.config.question_type
                );

                rooms[game_id].game.current_questions = questions;

                questions.forEach(question => {
                    if(question.additional_snippets != null){
                        question.additional_snippets.forEach(snippet => {
                            rooms[game_id].game_dictionary.push(snippet.toLowerCase());
                        });
                    }
                });

            }
            res.sendFile(default_paths.game_room);
        }

        else{
            return res.sendFile(default_paths.illegal_game);
        }
    }catch(err){
        if (DEBUG) console.log(err);
        return res.sendFile(default_paths.illegal_game);
    }
});
//room listing, so the user can get data after room action has been taken...
app.get("/api/get-room-data", (req, res) => {

    const room_id = req.headers.room;

    //send the data to the user
    if (rooms[room_id]){
        return res.json(rooms[room_id]);
    }else{
        return res.sendStatus(404);
    }
});
//where users can change their names
app.get("/name", (req, res) => {
    res.render(default_paths.name_select, {
        room: "none"
    });
});
//Shhhhhhhhhhhhh
app.get("/balls", (req, res) => {res.send("<img src='https://c.tenor.com/S48-9VW_zekAAAAd/cat.gif' />")});
app.get("/artur", (req, res) => {res.send("<img src='https://c.tenor.com/RFD6Dsb16OIAAAAd/spin.gif' />")});
app.get("/aaron", (req, res) => {res.send("<img src='https://c.tenor.com/tCPGyy8fUiUAAAAC/punt-kick.gif' />")});
app.get("/AAAAAAA", (req, res) => {res.send("<img src='https://c.tenor.com/mbTPJ5K06FwAAAAS/cat-cute-cat.gif' />")});
//balls tea time

//Check every minute if there are any rooms that have
//surpassed the cleanup time. If there are, then delete them.
setInterval(() => {
    const time = new Date().getTime();

    Object.keys(rooms).forEach(room => {
        //check if the room has surpassed the cleanup time
        if(rooms[room].cleanup < time){
            delete rooms[room];
        }
    });
}, ROOM_CLEANUP_CHECK_INTERVAL);

//Socket.io "routes"
io.on("connection", (socket) => {

    //Start the game
    socket.on("start-game", (room_data) => {

        try{
            const room_id = room_data.id;
            const player_amount = rooms[room_id].game.players.length;
            const room_leader = rooms[room_id].game.leader
        
            //check if player is leader
            if(room_leader.suid == room_data.player.suid){
                if(player_amount >= MIN_PLAYERS_PER_ROOM){
                    io.emit(`start-game:${room_data.id}`, room_id);

                    //Set the game to started
                    rooms[room_data.id].game.started = true;
                    rooms[room_data.id].game.start_time = new Date().getTime();

                }else{
                    io.emit(`return-message:${room_data.id}`, "2 players required to start the game.");
                }
            }
        }catch{
            return false;
        }
    });

    //Player is joining
    socket.on("player-join", (data) => {

        try{
            const room_id = data.room_id;
            const player = data.player;
            const uid = generate_uid();

            const player_obj = {
                name: player.name,
                suid: player.suid,
                uid: uid,
                pfp: player.pfp,
                done: false,
                leader: (rooms[room_id].game.leader.uid == player.uid),
                online: true,
                extra_snippets_used: 0
            }
            //make the player online: true
            rooms[room_id].game.players.find(x => x.suid === player.suid).online = true;
       
            io.emit(`player-join:${room_id}`, {
                new_player_list: rooms[room_id].game.players,
                new_player: player_obj
            });

        }catch(err){
            console.log(err);
            return false;
        }
    })

    //Disconnect
    socket.on("disconnect", () => {

        try{

            //get the user's name
            const user_suid = socket.handshake.headers.cookie.split(";").find(x => x.includes("suid")).split("=")[1];
            
            //get the room id via the user_suid
            const room_id = Object.keys(rooms).find(x => rooms[x].game.players.find(y => y.suid === user_suid));

            if (!room_id) return;

            //make the player online: false ONLY if the game is not started
            if(!rooms[room_id].game.started){
                rooms[room_id].game.players.find(x => x.suid === user_suid).online = false;   
            }
            else return;

            //remove the user from the room after 5 seconds have passed.
            //if the user manages to reconnect, the timeout will be cancelled.
            setTimeout(() => {

                try{
                    //if the user is still not online after 5 seconds, remove them from the room
                    if(!rooms[room_id] || !rooms[room_id].game.players.find(x => x.suid === user_suid).online){
                        
                        //remove the player from the room and from current player votes and current player answers
                        rooms[room_id].game.players = rooms[room_id].game.players.filter(x => x.suid !== user_suid);
                        rooms[room_id].game.current_player_answers = rooms[room_id].game.current_player_answers.filter(x => x.suid != user_suid);

                        // current player votes looks something like this:
                        // { 'shit man': 1, Aaron: 1 }
                        delete rooms[room_id].game.current_player_votes[user_suid]

                        //Make the next player the leader, if there
                        //are no more players, delete the room. 
                        if(rooms[room_id].game.players.length == 0){
                            delete rooms[room_id];
                        }else{
                            rooms[room_id].game.leader = rooms[room_id].game.players[0].player;
                            rooms[room_id].game.players[0].leader = true;
                            
                            //emit the players currently in the room
                            io.emit(`player-leave:${room_id}`, {
                                new_player_list: rooms[room_id].game.players,
                            });
                        }
                    }
                }catch(err){
                    if (DEBUG) console.log(err);
                    return false;
                }
            }, 5000);
            
        }catch(err){
            if (DEBUG) console.log(err);
            return false;
        }
    });

    socket.on("name-change", (data) => {
        const room_id = data.room_id;
        const old_name = data.old_name;
        const new_name = data.new_name;
        const new_pfp = data.new_pfp;
        const suid = data.suid;

        try{
            //get the player's object
            const player_obj = rooms[room_id].game.players.find(x => x.suid === suid);

            //change the player's name
            player_obj.name = new_name;
            player_obj.pfp = new_pfp;

            if(rooms[room_id].game.leader.uid == player_obj.uid){
                rooms[room_id].game.leader.name = new_name;
            }

            //emit the new player list to the room
            io.emit(`name-change:${room_id}`, {
                new_player_list: rooms[room_id].game.players,
                new_name: new_name,
                old_name: old_name,
                leader_name: rooms[room_id].game.leader.name
            });
        }catch(err){
            console.log(err);   
            return false;
        }
    });


    //GAME CONFIGURATION -------------------
    socket.on("config:settings-toggle", (data) => {

        try{
            const room_id = data.room;
            const player = data.player;
            const new_value = data.new_value;
            const setting = data.setting;

            //First, check if the player is the leader, 
            //because only the leader may change settings
            if (rooms[room_id].game.leader.suid == player.suid){
                //Then change the setting value to the one inputted
                rooms[room_id].game.config[setting] = new_value;

                //send the data back to the other players.
                io.emit(`config:settings-toggle:${room_id}`, {
                    room: rooms[room_id].game,
                    name: player.name,
                    setting: setting,
                    new_value: new_value
                });
            }
        }catch{
            return false;
        }

    })

    socket.on("config:user-kick", (data) => {

        try{
            const kick_request_suid = data.kick_request_suid;
            const kick_requester_suid = data.kick_requester_suid;
            const room_id = data.room_id;

            //check if kick_requester is the leader
            //of their room.
            if (rooms[room_id].game.leader.suid == kick_requester_suid){

                const kick_request_player = rooms[room_id].game.players.find(x => x.suid === kick_request_suid);

                //remove the user from the list
                rooms[room_id].game.players.splice(
                    rooms[room_id].game.players.findIndex(x => x.suid === kick_request_suid),
                    1
                );

                rooms[room_id].game.current_player_answers = rooms[room_id].game.current_player_answers.filter(x => x.suid != kick_request_suid);
                delete rooms[room_id].game.current_player_votes[kick_request_suid];

                //add the kicked player to the kicked list
                rooms[room_id].game.kicked_players.push(kick_request_suid);

                //send the full player list back to the players.
                io.emit(`config:user-kick:${room_id}`, {
                    kicked_player: kick_request_player,
                    new_player_list: rooms[room_id].game.players
                });
            }
        }catch(err){
            if (DEBUG) console.log(err);
            return false;
        }
            
    })

    //GAME PLAY -------------------
    socket.on("game:text", (data) => {
        try{
            const room_id = data.room_id;
            const player = data.player;
            const text = data.text;

            //check if player is in room
            if (rooms[room_id].game.players.find(x => x.suid === player.suid)){

                //add the words to the game_dictionary
                rooms[room_id].game_dictionary = [
                    ...rooms[room_id].game_dictionary,
                    ...text.map(x => x.word.toLowerCase())
                ];

                //split the text into an array of words, and randomize it using Math.random
                const random_words = text.sort(() => Math.random() - 0.5);

                //concat the random_words to the current_snippets array
                rooms[room_id].game.current_snippets = [
                    ...rooms[room_id].game.current_snippets,
                    ...random_words
                ];
                //randomly sort the array
                rooms[room_id].game.current_snippets = rooms[room_id].game.current_snippets.sort(() => Math.random() - 0.5);

                //remove duplicates from the array of objects
                rooms[room_id].game.current_snippets = rooms[room_id].game.current_snippets.filter((x, i, a) => a.findIndex(y => y.word === x.word) === i);
                
                //Make the player that sent in the text to done
                rooms[room_id].game.players.find(x => x.suid === player.suid).done = true;

                //boolean to check if all players are done
                const all_done = rooms[room_id].game.players.every(x => x.done);
                if(all_done){
                    //make all players not done
                    rooms[room_id].game.players.forEach(x => x.done = false);
                }

                //send the text to the players
                io.emit(`game:text:${room_id}`, {
                    players: rooms[room_id].game.players,
                    current_snippets: rooms[room_id].game.current_snippets,
                    all_done: all_done
                });
            }
        }catch(err){
            if (DEBUG) console.log(err)
            return false;
        }
    });

    socket.on("game:submit-sentences", (data) => {

        try{
            const room_id = data.room_id;
            const player = data.player;
            const sentences = data.sentences;

            //check if player is in room
            if (rooms[room_id].game.players.find(x => x.suid === player.suid)){

                //Loop through the sentences and check if the words are in the game_dictionary
                //if they are not, then remove them from the array
                const valid_sentences = sentences.map(x => {
                    const valid_sentence = x.sentence.filter(y => rooms[room_id].game_dictionary.includes(y.word.toLowerCase()));
                    return {
                        question_id: x.question_id,
                        sentence: valid_sentence,
                        player: x.player
                    }
                });

                //make a new object of all the owners of the words in the valid_sentences
                //should look something like this: {player1: 2, player2: 1, player3: 5, player4: 6}
                //the key is the player, and the value is the number of words they submitted
                //and the [Object]s look something like this:
                // {word: "word1", owner: "player1"}
                let owners = {};
                valid_sentences.forEach(x => {

                    x.sentence.forEach(word_obj => {

                        if (!owners[word_obj.owner]){
                            owners[word_obj.owner] = 1;
                        }else{
                            if (owners[word_obj.owner] != undefined){
                                owners[word_obj.owner] += 1;
                            }
                        }
                    });

                    //remove undefined keys
                    delete owners[undefined];
                    owners = map_obj_to_percentage(owners);
                    x.owners = owners;

                    const sumObjectsByKey = (...objs) => {
                        return objs.reduce((a, b) => {
                        for (let k in b) {
                            if (b.hasOwnProperty(k))
                            a[k] = (a[k] || 0) + b[k];
                        }
                        return a;
                        }, {});
                    }

                    if(rooms[room_id].game.config.word_contribution){
                        rooms[room_id].game.word_contributors = sumObjectsByKey(rooms[room_id].game.word_contributors, x.owners);
                    }

                    owners = {};
                });

                const this_player = rooms[room_id].game.players.find(x => x.suid === player.suid);

                //add the valid_sentences to the list of submitted sentences
                rooms[room_id].game.current_player_answers.push({
                    player: {
                        name: player.name,
                        suid: player.suid,
                        player_color: this_player.player_color,
                        pfp: this_player.pfp
                    },
                    sentences: valid_sentences,
                });

                //set the player to done
                rooms[room_id].game.players.find(x => x.suid === player.suid).done = true;

                //check if all players have submitted
                const all_done = rooms[room_id].game.players.every(x => x.done);

                //if all players are done, make all players not done
                if(all_done){
                    rooms[room_id].game.players.forEach(x => x.done = false);
                }

                //send the data back to the players
                io.emit(`game:submit-sentences:${room_id}`, {
                    players: rooms[room_id].game.players,
                    current_player_answers: rooms[room_id].game.current_player_answers,
                    all_done: all_done
                });

            }
        }catch(err){
            if (DEBUG) console.log(err);
            return false;
        }
    })

    socket.on("game:extra-snippet", (data) => {
        const word = data.word;
        const owner = data.owner;
        const room_id = data.room_id;

        try{

            //check if player is in room
            if (rooms[room_id].game.players.find(x => x.suid === owner)){

                const room_extra_snippets = rooms[room_id].game.config.extra_snippets;
                const player_used_extra_snippets = rooms[room_id].game.players.find(x => x.suid === owner).extra_snippets_used;

                console.log(rooms[room_id].game.players);

                if (player_used_extra_snippets < room_extra_snippets){
                
                    //add the word to the game_dictionary
                    rooms[room_id].game_dictionary.push(word.toLowerCase());

                    //send the data back to the players
                    io.emit(`game:extra-snippet:${room_id}`, {
                        word: word,
                        owner: owner
                    });
                }
            }
        }catch(err){
            if (DEBUG) console.log(err);
            return false;
        }
    });

    //VOTING -------------------
    socket.on("game:vote-for", (data) => {
        
        try{
            const room_id = data.room_id;
            const voter = data.voter;
            const voted_for_suid = data.voted_for_suid;

            //check if player is in room
            if (rooms[room_id].game.players.find(x => x.suid === voter.suid)){

                //add the vote to the list of votes if
                //the player is not voting for themselves, but
                //only if the room has self_voting disabled.
                if (!rooms[room_id].game.config.self_voting){//if self voting is disabled
                    if (voter.suid != voted_for_suid){//if the voter is not voting for themselves
                        rooms[room_id].game.current_player_votes[voted_for_suid] += 1;
                    }else return;
                }else if (rooms[room_id].game.config.self_voting){//if self voting is enabled
                    rooms[room_id].game.current_player_votes[voted_for_suid] += 1;
                }


                //set the player to done
                rooms[room_id].game.players.find(x => x.suid === voter.suid).done = true;

                //check if all players have voted
                const all_done = rooms[room_id].game.players.every(x => x.done);
                if(all_done){
                    rooms[room_id].game.players.forEach(x => x.done = false);
                }

                //send the data back to the players
                io.emit(`game:vote-for:${room_id}`, {
                    players: rooms[room_id].game.players,
                    total_votes: rooms[room_id].game.current_player_votes,
                    all_done: all_done,
                    current_player_answers: rooms[room_id].game.current_player_answers,
                    word_contributors: rooms[room_id].game.word_contributors,

                    //get the people who have the most votes ALL DONE REMOVED NOW
                    most_voted_for: get_most_voted(rooms[room_id].game.current_player_votes)
                });

                if(all_done){
                    const cpv = rooms[room_id].game.current_player_votes
                    Object.keys(cpv).map(el => cpv[el] = 0);
                }

            }
        }catch(err){
            console.log(err)
            return false;
        }
    });


    //ROOM CHAT -------------------
    socket.on("chat:message", (data) => {
        try{
            const room_id = data.room_id;
            const player = data.player;
            const suid = data.suid;
            //filter message from xss and bad words
            const message = data.message
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            //replace bad words with *:s
            const filtered_message = filter_bad_words(message);

            //check if player is in room
            if (rooms[room_id].game.players.find(x => x.suid === suid)){

                //send the message to the players
                io.emit(`chat:message:${room_id}`, {
                    player: player,
                    message: filtered_message
                });

            }
        }catch(err){
            console.log(err)
            return false;
        }
    });

    //CLEARING -------------------
    socket.on("game:clear-player-done", (data) => {
        try{
            const room_id = data.room_id;
            const player = data.player;

            //check if player is the leader of the room
            if (rooms[room_id].game.leader === player){

                //clear all players done
                rooms[room_id].game.players.forEach(x => x.done = false);

                //send the data back to the players
                io.emit(`game:clear-player-done:${room_id}`, {
                    players: rooms[room_id].game.players
                });

            }
        }catch{
            return false;
        }
    })
});




app.get("/:small_code?", (req, res) => {

    try{
        
        const small_code = req.params.small_code;

        //get the room id from the small code, rooms is an object
        const get_roomcode = () => {
            for (let room in rooms){
                if (rooms[room].small_code == small_code){
                    return room;
                }
            }
            return false;
        }
        const room_id = get_roomcode();

        let name = req.cookies["usnm"];
        let pfp = req.cookies.pfp;
        let suid = req.cookies.suid;


        //if the user is already in the room
        if (rooms[room_id].game.players.find(x => x.suid === suid)){
            return res.send(custom_message("You are already in the room"));
        }


        if(!suid){
            const new_suid = generate_uid();
            res.cookie("suid", new_suid, {maxAge: 1000*60*60*24*30});
            suid = new_suid;
        }
        if(!name){
            const new_name = names.generate_name();
            const new_pfp = names.generate_pfp(PROFILE_PICTURE_COUNT);

            res.cookie("usnm", new_name, {maxAge: 1000*60*60*24*30});
            res.cookie("pfp", new_pfp, {maxAge: 1000*60*60*24*30});
            res.cookie("selfselected", "auto", {maxAge: 1000*60*60*24*30});

            name = new_name;
            pfp = new_pfp;

            const new_suid = generate_uid();
            res.cookie("suid", new_suid, {maxAge: 1000*60*60*24*30});
            suid = new_suid;
        }
        
        const player_obj = {
            name: name,
            suid: suid,
            uid: generate_uid(),
            pfp: pfp,
            done: false,
            online: true,
            leader: (rooms[room_id].game.leader.suid == suid),
            player_color: rooms[room_id].room_colors[rooms[room_id].game.players.length],
            extra_snippets_used: 0,
        }
        
        let found_room = false;
        Object.values(rooms).forEach(room => {
            
            if (room.small_code == small_code){
                
                found_room = true;
                const room_id = room.roomcode

                //make the player online: true if the player exists
                if (room.game.players.find(x => x.uid === player_obj.uid)){
                    room.game.players.find(x => x.uid === player_obj.uid).online = true;
                }
                
                //Check if the player is kicked from the room.
                if(room.game.kicked_players.find(suid => suid == player_obj.suid)){
                    return res.send(custom_message("You have been kicked from this room."));
                }
                
                //add the player to the room player list if player is not undefined
                if (suid && name && !room.game.players.find(x => x.uid === player_obj.uid)){
                    rooms[room_id].game.players = [
                        ...rooms[room_id].game.players,
                        player_obj
                    ];
                }
                
                return res.status(200).redirect(`/room/${room_id}`);
            }
        })
        
        if (!found_room){
            return res.sendStatus(404);
        }
    }
    catch(err){
        if (DEBUG) console.log(err);
        return res.sendStatus(404);
    }
})

//Listeners
server.listen(PORT, () => {
    console.log("Clearing game rooms...");
    rooms = {};

    console.log(`
- RAM: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB,
- CPU: ${os.loadavg()[0]},
- DISK_USAGE: ${get_free_space()},
- PORT: ${PORT},
- DEBUG: ${DEBUG},
- SERVER_STARTED: ${new Date()},
- PORT: $IP: ${os.networkInterfaces().eth0[0].address},
- SERVER_NAME: ${os.hostname()},
- HOME_DIR: ${os.homedir()},
- OS: ${os.platform()} ${os.release()}
    `);


    console.log("up and running");
})