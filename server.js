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
    
        <div class="custom-message-wrapper">
            <h1 class="custom-message-text">${message}</h1>
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
const DEBUG = false;

const MAX_PLAYERS_PER_ROOM = 8;
const MIN_PLAYERS_PER_ROOM = DEBUG ? 1 : 1;

const QUESTION_COUNT = 2;
const WORD_CONTRIBUTION_MULTIPLIER = 4;
const ROOM_CLEANUP_TIME = 1000 * 60 * 60; //1 hour
const ROOM_CLEANUP_CHECK_INTERVAL = 1000 * 60 * 60; //1 hour

const PROTOCOL = "https";
const BASE_URL = "artur.red";

const PROFILE_PICTURE_COUNT = fs.readdirSync(path.resolve("resources/faces")).length;

//arturs fina palette: "#32021F", "#1446a0", "#1A5E63", "#DB3069", "#F71735", "#FFD400", "#7EE081", "#FFECD1"
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

    let leader = req.cookies["usnm"];
    let pfp = req.cookies["pfp"];
    let uid = req.cookies["uid"];

    const room_colors = ROOM_COLORS.sort(() => Math.random() - 0.5)
    const qr = await qr_code.toDataURL(`${PROTOCOL}://${BASE_URL}/${small_code}`, {color: {dark: "#000", light: "#00000000"}}).then(async (data) => await data);

    //if the user got no name
    if(!leader){
        const new_name = names.generate_name();
        const new_pfp = names.generate_pfp(PROFILE_PICTURE_COUNT);
        const new_uid = names.generate_uid();

        res.cookie("usnm", new_name, {maxAge: 1000*60*60*24*30});
        res.cookie("pfp", new_pfp, {maxAge: 1000*60*60*24*30});
        res.cookie("uid", new_uid, {maxAge: 1000*60*60*24*30});
        res.cookie("selfselected", "auto", {maxAge: 1000*60*60*24*30});
        //self selected means if the user made their name themselves
        //or if it was my backend fucntions. So frontend checks if self selected is
        //auto, if it is, display a modal that the user can change name / pfp.

        leader = new_name;
        pfp = new_pfp;
        uid = new_uid;
    }

    const leader_obj = {
        player: leader,
        uid: uid,
        pfp: pfp,
        done: false, //Done means that the player has finished their selection / text input
        leader: true,
        online: true,
        player_color: room_colors[0],
    }

    //Create the room
    rooms[roomcode] = {
        roomcode: roomcode,
        small_code: small_code,
        qr: qr,
        cleanup: new Date().getTime() + ROOM_CLEANUP_TIME,

        room_colors: room_colors,

        game: {
            players: [leader_obj],
            kicked_players: [],
            leader: leader,
            started: false,
            config: {
                question_type: "regular",
                question_count: QUESTION_COUNT,
                extra_snippets: 1,
                public: false,
                self_voting: false,
                word_contribution: true
            },
            current_snippets: [],
            current_questions: [],
            current_player_answers: [],
            word_contributors: {},
            //looks something like this:
            // [
            //     { player: 'shit man', sentences: [ [Object], [Object] ] },
            //     { player: 'Aaron', sentences: [ [Object], [Object] ] }
            // ]

            current_player_votes: {
                [leader]: 0,
            },
            //looks something like this:
            // { 'shit man': 1, Aaron: 1 }
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
        const player_obj = {
            player: req.cookies.usnm,
            uid: req.cookies.uid,
            pfp: req.cookies.pfp,
            done: false,
            leader: (rooms[roomID].game.leader == req.cookies.usnm),
            online: true
        }
        //make the player online: true
        rooms[roomID].game.players.find(x => x.player === req.cookies.usnm).online = true;

        //add the player to the voting list. if they are already in the list,
        //nothing happens because you override the value of the key. 
        rooms[roomID].game.current_player_votes[req.cookies.usnm] = 0;

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
        if(rooms[roomID].game.kicked_players.includes(req.cookies.usnm)){
            return res.send(custom_message("you've been kicked from this room"));
        }

        //Else if the user is in the room (added in smallcode route)
        //then join the room, or if you are the leader of the room
        else if(rooms[roomID].game.players.find(x => x.player === player_obj.player) != undefined
        || rooms[roomID].game.leader == req.cookies.usnm){

            res.sendFile(default_paths.room);
        }

        else{
            return res.sendFile(default_paths.illegal_game);
        }
    }catch(err){
        // if (DEBUG) console.log(err);
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
        if(!rooms[game_id].game.players.find(x => x.player === req.cookies.usnm)){
            return res.sendFile(default_paths.illegal_game);
        }

        //Check if game is started
        else if(!rooms[game_id].game.started){
            return res.sendFile(default_paths.illegal_game);
        }

        //Else join the room if its started
        if (rooms[game_id].game.started){

            //All the names of the players in the room
            const players_in_room = rooms[game_id].game.players.map(x => x.player);

            //add the questions to the room if they are not already there
            if(rooms[game_id].game.current_questions.length == 0){
                rooms[game_id].game.current_questions = get_questions(
                    rooms[game_id].game.config.question_count,
                    players_in_room,
                    rooms[game_id].game.config.question_type
                );
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
//name selection, and saves the game that is queued so
//the user gets automatically redirected to the game after
//they have selected their name.
app.get("/name/game-queue/:id?", (req, res) => {

    try{

        const short_code = req.params.id;
        const username = req.cookies.usnm.toString();

        //Check if user has a name
        if( username.length >= 3 ) {
            if (req.params.id != "CREATE_ROOM_QUEUE") return res.redirect(`/${short_code}`);
            else return res.redirect("/api/create-room");
        };


        res.status(200).render(default_paths.name_select, {
            room: req.params.id
        });
    }catch(err){
        if (DEBUG) console.log(err);
        res.sendStatus(404);
    }
});

app.get("/name", (req, res) => {
    res.render(default_paths.name_select, {
        room: "none"
    });
});

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
            const player_amount = rooms[room_data.id].game.players.length;
            const room_leader = rooms[room_data.id].game.leader
            const room_id = room_data.id;
        
            //check if player is leader
            if(room_leader == room_data.player){
                if(player_amount >= MIN_PLAYERS_PER_ROOM){
                    io.emit(`start-game:${room_data.id}`, room_id);

                    //Set the game to started
                    rooms[room_data.id].game.started = true;
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
            const pfp = data.pfp;
            const uid = data.uid;

            const player_obj = {
                player: player,
                uid: uid,
                pfp: pfp,
                done: false,
                leader: (rooms[room_id].game.leader == player),
                online: true
            }
            //make the player online: true
            rooms[room_id].game.players.find(x => x.player === player).online = true;
       
            io.emit(`player-join:${room_id}`, {
                new_player_list: rooms[room_id].game.players,
                new_player: player_obj
            });

        }catch{
            return false;
        }
    })

    //Disconnect
    socket.on("disconnect", () => {

        try{

            //get the user's name
            const user = socket.handshake.headers.cookie.split(";").find(x => x.includes("usnm")).split("=")[1];
            const user_id = socket.handshake.headers.cookie.split(";").find(x => x.includes("uid")).split("=")[1];
            
            //get the room id via the user_id
            const room_id = Object.keys(rooms).find(x => rooms[x].game.players.find(y => y.uid === user_id));

            if (!room_id) return;

            //make the player online: false ONLY if the game is not started
            if(!rooms[room_id].game.started){
                rooms[room_id].game.players.find(x => x.player === user).online = false;   
            }
            else return;

            //remove the user from the room after 5 seconds have passed.
            //if the user manages to reconnect, the timeout will be cancelled.
            setTimeout(() => {

                try{
                    //if the user is still not online after 5 seconds, remove them from the room
                    if(!rooms[room_id].game.players.find(x => x.uid === user_id).online){
                        
                        //remove the player from the room and from current player votes and current player answers
                        rooms[room_id].game.players = rooms[room_id].game.players.filter(x => x.uid !== user_id);
                        rooms[room_id].game.current_player_answers = rooms[room_id].game.current_player_answers.filter(x => x != user);

                        // current player votes looks something like this:
                        // { 'shit man': 1, Aaron: 1 }
                        delete rooms[room_id].game.current_player_votes[user]

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

        console.log(`${old_name} changed their name to ${new_name} in room ${room_id}`);

        try{
            //get the player's object
            const player_obj = rooms[room_id].game.players.find(x => x.player === old_name);

            //change the player's name
            player_obj.player = new_name;
            player_obj.pfp = new_pfp;

            if(rooms[room_id].game.leader == old_name){
                rooms[room_id].game.leader = new_name;
            }

            //emit the new player list to the room
            io.emit(`name-change:${room_id}`, {
                new_player_list: rooms[room_id].game.players,
                new_name: new_name,
                old_name: old_name,
                leader_name: rooms[room_id].game.leader
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
            if (rooms[room_id].game.leader == player){
                //Then change the setting value to the one inputted
                rooms[room_id].game.config[setting] = new_value;

                //send the data back to the other players.
                io.emit(`config:settings-toggle:${room_id}`, {
                    room: rooms[room_id].game,
                    player: player,
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
            const kick_request = data.kick_request;
            const kick_requester = data.kick_requester;
            const room_id = data.room_id;

            //check if kick_requester is the leader
            //of their room.
            if (rooms[room_id].game.leader == kick_requester){

                //remove the user from the list
                rooms[room_id].game.players.splice(
                    rooms[room_id].game.players.findIndex(x => x.player === kick_request),
                    1
                );
                rooms[room_id].game.current_player_answers = rooms[room_id].game.current_player_answers.filter(x => x != kick_request);
                delete rooms[room_id].game.current_player_votes[kick_request];

                //add the kicked player to the kicked list
                rooms[room_id].game.kicked_players.push(kick_request);

                //send the full player list back to the players.
                io.emit(`config:user-kick:${room_id}`, {
                    kicked_player: kick_request,
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
            if (rooms[room_id].game.players.find(x => x.player === player)){

                //split the text into an array of words, and randomize it using Math.random
                const random_words = text.sort(() => Math.random() - 0.5);


                //randomly concat the random_words to the current_snippets array
                rooms[room_id].game.current_snippets = [
                    ...rooms[room_id].game.current_snippets,
                    ...random_words
                ];
                //randomly sort the array
                rooms[room_id].game.current_snippets = rooms[room_id].game.current_snippets.sort(() => Math.random() - 0.5);

                //rooms[room_id].game.current_snippets looks something like this:
                //[
                //{word: "word1", owner: "player1"},
                //{word: "word2", owner: "player2"},
                //{word: "word3", owner: "player3"},
                //{word: "word4", owner: "player4"},
                //
                //]
                //remove duplicates from the array of objects
                rooms[room_id].game.current_snippets = rooms[room_id].game.current_snippets.filter((x, i, a) => a.findIndex(y => y.word === x.word) === i);
                
                //Make the player that sent in the text to done
                rooms[room_id].game.players.find(x => x.player === player).done = true;

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
            if (rooms[room_id].game.players.find(x => x.player === player)){

                //make a new object of all the owners of the words in the sentences
                //should look something like this: {player1: 2, player2: 1, player3: 5, player4: 6}
                //the key is the player, and the value is the number of words they submitted
                //and the [Object]s look something like this:
                // {word: "word1", owner: "player1"}
                let owners = {};
                sentences.forEach(x => {

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


                //add the sentences to the list of submitted sentences
                rooms[room_id].game.current_player_answers.push({
                    player: player,
                    sentences: sentences,
                });

                //set the player to done
                rooms[room_id].game.players.find(x => x.player === player).done = true;

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

    //VOTING -------------------
    socket.on("game:vote-for", (data) => {
        
        try{
            const room_id = data.room_id;
            const voter = data.voter;
            const voted_for = data.voted_for;

            //check if player is in room
            if (rooms[room_id].game.players.find(x => x.player === voter)){

                //add the vote to the list of votes if
                //the player is not voting for themselves, but
                //only if the room has self_voting disabled.
                if (!rooms[room_id].game.config.self_voting){//if self voting is disabled
                    if (voter != voted_for){//if the voter is not voting for themselves
                        rooms[room_id].game.current_player_votes[voted_for] += 1;
                    }else return;
                }else if (rooms[room_id].game.config.self_voting){//if self voting is enabled
                    rooms[room_id].game.current_player_votes[voted_for] += 1;
                }


                //set the player to done
                rooms[room_id].game.players.find(x => x.player === voter).done = true;

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

                    //get the people who have the most votes
                    most_voted_for: all_done ? get_most_voted(rooms[room_id].game.current_player_votes) : null,
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
            if (rooms[room_id].game.players.find(x => x.player === player)){

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


//Shhhhhhhhhhhhh
app.get("/balls", (req, res) => {res.send("<img src='https://c.tenor.com/S48-9VW_zekAAAAd/cat.gif' />")});
app.get("/artur", (req, res) => {res.send("<img src='https://c.tenor.com/RFD6Dsb16OIAAAAd/spin.gif' />")});
app.get("/aaron", (req, res) => {res.send("<img src='https://c.tenor.com/tCPGyy8fUiUAAAAC/punt-kick.gif' />")});
app.get("/AAAAAAA", (req, res) => {res.send("<img src='https://c.tenor.com/mbTPJ5K06FwAAAAS/cat-cute-cat.gif' />")});
app.get("/favicon.ico", (req, res) => {res.sendFile(path.resolve("resources/images/logo.svg"))});



app.get("/:small_code?", (req, res) => {

    try{
        
        const small_code = req.params.small_code;

        let player = req.cookies["usnm"];
        let pfp = req.cookies.pfp;
        let uid = req.cookies.uid;

        console.log(player)
        if(!player){
            console.log("INSIDE")
            const new_name = names.generate_name();
            const new_pfp = names.generate_pfp(PROFILE_PICTURE_COUNT);
            const new_uid = names.generate_uid();

            res.cookie("usnm", new_name, {maxAge: 1000*60*60*24*30});
            res.cookie("pfp", new_pfp, {maxAge: 1000*60*60*24*30});
            res.cookie("uid", new_uid, {maxAge: 1000*60*60*24*30});
            res.cookie("selfselected", "auto", {maxAge: 1000*60*60*24*30});

            player = new_name;
            pfp = new_pfp;
            uid = new_uid;
            console.log("new", player);
        }
        console.log("OUT");
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
        const player_obj = {
            player: player,
            uid: uid,
            pfp: pfp,
            done: false,
            leader: (rooms[room_id].game.leader == player)??"",
            online: true,
            player_color: rooms[room_id].room_colors[rooms[room_id].game.players.length]
        }
        
        let found_room = false;
        Object.values(rooms).forEach(room => {
            
            if (room.small_code == small_code){
                
                found_room = true;
                const room_id = room.roomcode

                //make the player online: true if the player exists
                if (room.game.players.find(x => x.player === player)){
                    room.game.players.find(x => x.player === player).online = true;
                }
                
                //Check if the player is kicked from the room.
                if(room.game.kicked_players.find(x => x.player == player_obj.player)){
                    return res.send(custom_message("You have been kicked from this room."));
                }
                
                //add the player to the room player list if player is not undefined
                if (player && !room.game.players.find(x => x.player === player)){
                    rooms[room_id].game.players = [
                        ...rooms[room_id].game.players,
                        player_obj
                    ];
                }
                
                return res.status(200).redirect(`/room/${room_id}`);
            }
        })
        
        if (!found_room){
            console.log("NOT FOUND")
            return res.sendStatus(404);
        }
    }
    catch(err){
        console.log(err);
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
})// ONE DARK PRO FLAT
