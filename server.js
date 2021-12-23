//express as default server router
const express    = require("express");
const app        = express();

//socket.io
const http       = require('http')
const server     = http.createServer(app);
const { Server } = require("socket.io");
const io         = new Server(server);

//Artur.red no cname port
const PORT       = 8081;

//Path for better path handling
const path       = require("path");

//Render HTML for variable passing.
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname);

//cors for 3party requests
const cors = require("cors");
app.use(cors());

//Crypto for room code generation
const crypto     = require("crypto");
const generate_roomcode = () => crypto.randomBytes(32).toString("hex");
const generate_small_code = () => parseInt(Math.random() * (10000000 - 1000000) + 1000000);

//cookie parser
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//fs for file handling
const fs = require("fs");

const questions = require(path.resolve("server/questions.js"));
const get_questions = (questionCount, players, type) => {
    questionsArray = []
    for (let i = 0; i < questionCount; i++) {
        questionsArray.push(questions.getQuestion(players, type))
    }
    return questionsArray;
}


//default paths
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

//Mutational variables
let rooms = {};

//Constant variables
const MAX_PLAYERS_PER_ROOM = 16;
const MIN_PLAYERS_PER_ROOM = 2;

const QUESTION_COUNT = 2;

//Express static folders
app.use("/", express.static(path.join(__dirname, 'resources')));
app.use("/script", express.static(path.join(__dirname, 'frontend/scripts')));
app.use("/style", express.static(path.join(__dirname, 'frontend/style')));
app.use("/page", express.static(path.join(__dirname, 'frontend/html')));

//Express Routes    || STATIC PAGES ONLY ||
app.get("/", (req, res) => {
    res.sendFile(default_paths.home);
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
})
//room creation
app.get("/api/create-room", (req, res) => {

    //generate room code
    const roomcode = generate_roomcode();
    const small_code = generate_small_code();

    const leader = req.cookies["usnm"];
    const pfp = req.cookies["pfp"];
    const leader_obj = {
        player: leader,
        pfp: pfp,
        done: false, //Done means that the player has finished their selection / text input
        leader: true,
    }

    //Create the room
    rooms[roomcode] = {
        roomcode: roomcode,
        small_code: small_code,

        
        game: {
            players: [leader_obj],
            kicked_players: [],
            leader: leader,
            started: false,
            config: {
                mature: false,
                public: false,
            },
            current_snippets: [],
            current_questions: [],
            current_player_answers: [],
        }
    };

    //Check if user has a name, then redirect to the
    //name selection page with the created room code
    //so they automatically rejoin after selecting their name.
    if( !req.cookies.usnm
        || req.cookies.usnm == null
        || req.cookies.usnm.length <= 2
    ) return res.redirect(`/name/game-queue/${small_code}`);

    //send the user to the newly created room if they have a name.
    return res.redirect(`/room/${roomcode}`);
});
//Room selection page.
app.get("/room", (req, res) => {
    res.sendFile(default_paths.room_select);
})
//Browse games page
app.get("/browse", (req, res) => {
    res.sendFile(default_paths.browse_rooms);
})
//Browse games functionality (API)
app.get("/api/browse", (req, res) => {
    //only send the rooms that are public
    const rooms_to_send = {};
    
    for(let room in rooms) {
        if(rooms[room].game.config.public) {
            rooms_to_send[room] = rooms[room];
        }
    }
    res.send(rooms_to_send);
})
//Looby / room page.
app.get("/room/:roomID", (req, res) => {

    const roomID = req.params.roomID;
    let room_small_code;


    try{
        room_small_code = rooms[roomID].small_code || null;
    }catch{
        room_small_code = null;    
    }

    //Check if user has a name
    if( !req.cookies.usnm
        || req.cookies.usnm == null
        || req.cookies.usnm.length <= 2
    ) return res.redirect(`/name/game-queue/${room_small_code}`);

    const player_obj = {
        player: req.cookies.usnm,
        pfp: req.cookies.pfp,
        done: false,
        leader: (rooms[roomID].game.leader == req.cookies.usnm),
    }

    try{
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
    }catch{
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

            //add the questions to the room
            rooms[game_id].game.current_questions = get_questions(QUESTION_COUNT, players_in_room, rooms[game_id].game.config.mature?"mature":"normal");
            res.sendFile(default_paths.game_room);
        }

        else{
            console.log("4")
            return res.sendFile(default_paths.illegal_game);
        }
    }catch{
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
    res.render(default_paths.name_select, {
        room: req.params.id
    });
});

app.get("/name", (req, res) => {
    res.render(default_paths.name_select, {
        room: "none"
    });
});


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

            const player_obj = {
                player: player,
                pfp: pfp,
                done: false,
                leader: (rooms[room_id].game.leader == player),
            }
       
            io.emit(`player-join:${room_id}`, {
                new_player_list: rooms[room_id].game.players,
                new_player: player_obj
            });
            
            //Check if player is already in the room
            // if(!rooms[room_id].game.players.includes(player_obj)){
                
            //     //Add player to the room
            //     // rooms[room_id].game.players = [
            //     //     ...rooms[room_id].game.players,
            //     //     player_obj
            //     // ]; 

            //     console.log(rooms[room_id].game.players);
            //     //emit the players currently in the room
            //     io.emit(`player-join:${room_id}`, rooms[room_id].game.players);
            // }
        }catch{
            return false;
        }
    })

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

                //add the kicked player to the kicked list
                rooms[room_id].game.kicked_players.push(kick_request);

                //send the full player list back to the players.
                io.emit(`config:user-kick:${room_id}`, {
                    kicked_player: kick_request,
                    new_player_list: rooms[room_id].game.players
                });
            }
        }catch{
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
                const words = text.split(" ");
                const random_words = words.sort(() => Math.random() - 0.5);

                //randomly concat the random_words to the current_snippets array
                rooms[room_id].game.current_snippets = [
                    ...rooms[room_id].game.current_snippets,
                    ...random_words
                ];
                //randomly sort the array, and then remove any duplicates
                rooms[room_id].game.current_snippets = rooms[room_id].game.current_snippets.sort(() => Math.random() - 0.5);
                rooms[room_id].game.current_snippets = rooms[room_id].game.current_snippets.filter((v, i, a) => a.indexOf(v) === i);

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
            console.log(err)
            return false;
        }
    });

    socket.on("game:submit-sentences", (data) => {

        try{
            const room_id = data.room_id;
            const player = data.player;
            const sentences = data.sentences;

            console.log(sentences, player, room_id);

            //check if player is in room
            if (rooms[room_id].game.players.find(x => x.player === player)){

                //add the sentences to the list of submitted sentences
                rooms[room_id].game.current_player_answers.push({
                    player: player,
                    sentences: sentences
                });

                //set the player to done
                rooms[room_id].game.players.find(x => x.player === player).done = true;

                //check if all players have submitted
                const all_done = rooms[room_id].game.players.every(x => x.done);

                console.log(all_done);

                //send the data back to the players
                io.emit(`game:submit-sentences:${room_id}`, {
                    players: rooms[room_id].game.players,
                    current_player_answers: rooms[room_id].game.current_player_answers,
                    all_done: all_done
                });

            }
        }catch{
            return false;
        }
    })

    //VOTING -------------------
    socket.on("game:vote", (data) => {
        
        try{
            const room_id = data.room_id;
            const player = data.player;
            const vote = data.vote;

            //check if player is in room
            if (rooms[room_id].game.players.find(x => x.player === player)){

                //add the vote to the list of votes
                rooms[room_id].game.current_player_votes.push({
                    player: player,
                    vote: vote
                });

                //set the player to done
                rooms[room_id].game.players.find(x => x.player === player).done = true;

                //check if all players have voted
                const all_done = rooms[room_id].game.players.every(x => x.done);

                //send the data back to the players
                io.emit(`game:vote:${room_id}`, {
                    players: rooms[room_id].game.players,
                    current_player_votes: rooms[room_id].game.current_player_votes,
                    all_done: all_done
                });

            }
        }catch{
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




            //check if player is in room
            if (rooms[room_id].game.players.find(x => x.player === player)){

                //add the message to the list of messages
                // rooms[room_id].game.messages.push({
                //     player: player,
                //     message: message
                // });



                //send the message to the players
                io.emit(`chat:message:${room_id}`, {
                    player: player,
                    message: message
                });

            }
        }catch{
            return false;
        }
    });
});



app.get("/:small_code?", (req, res) => {

    try{
        
        const small_code = req.params.small_code;
        const player = req.cookies.usnm;
        const pfp = req.cookies.pfp;
        
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
            pfp: pfp,
            done: false,
            leader: (rooms[room_id].game.leader == player)
        }
        
        let found_room = false;
        
        Object.values(rooms).forEach(room => {
            
            if (room.small_code == small_code){
                
                found_room = true;
                const room_id = room.roomcode
                
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
                
                return res.redirect(`/room/${room.roomcode}`);
            }
        })
        
        if (!found_room){
            return res.sendStatus(404);
        }
    }
    catch{
        return res.sendStatus(404);
    }
})
    
    



//Listeners
server.listen(PORT, () => {
    console.log("up and running");
})