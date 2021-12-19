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

//default paths
const default_paths = {
    illegal_game: path.resolve("frontend/html/error-pages/roomError.html"),
    home: path.resolve("frontend/html/index.html"),
    room: path.resolve("frontend/html/game/room.html"),
    game_room: path.resolve("frontend/html/game/game.html"),
    name_select: path.resolve("frontend/html/name.html"),
}

//Mutational variables
let rooms = {};

//Constant variables
const MAX_PLAYERS_PER_ROOM = 16;
const MIN_PLAYERS_PER_ROOM = 2;

//Express static folders
app.use("/", express.static(path.join(__dirname, 'resources')));
app.use("/script", express.static(path.join(__dirname, 'frontend/scripts')));
app.use("/style", express.static(path.join(__dirname, 'frontend/style')));
app.use("/page", express.static(path.join(__dirname, 'frontend/html')));

//Express Routes    || STATIC PAGES ONLY ||
app.get("/", (req, res) => {
    res.sendFile(default_paths.home);
});

app.get("/:small_code?", (req, res) => {

    const small_code = req.params.small_code;

    Object.values(rooms).forEach(room => {

        console.log(room)

        if (room.small_code == small_code){
            return res.redirect(`/room/${room.roomcode}`);
        }
    })

    return res.sendStatus(404);
})

//Express Routes    || *NON STATIC PAGES ONLY ||

//room creation
app.get("/api/create-room", (req, res) => {

    //generate room code
    const roomcode = generate_roomcode();
    const small_code = generate_small_code();
    const leader = req.cookies["usnm"];

    //Create the room
    rooms[roomcode] = {
        roomcode: roomcode,
        small_code: small_code,

        game: {
            players: [],
            leader: leader,
            started: false,

            config: {
                mature: false,
            }
        }
    };

    //Check if user has a name, then redirect to the
    //name selection page with the created room code
    //so they automatically rejoin after selecting their name.
    if( !req.cookies.usnm
        || req.cookies.usnm == null
        || req.cookies.usnm.length <= 2
    ) return res.redirect(`/name/game-queue/${roomcode}`);

    //send the user to the newly created room if they have a name.
    return res.redirect(`/room/${roomcode}`);
});

//room joining
app.get("/room/:roomID?", (req, res) => {

    const roomID = req.params.roomID;

    //Check if user has a name
    if( !req.cookies.usnm
        || req.cookies.usnm == null
        || req.cookies.usnm.length <= 2
    ) return res.redirect(`/name/game-queue/${roomID}`);

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
        //Else join the room
        else{
            res.sendFile(default_paths.room);
        }
    }catch{
        res.sendStatus(404);
    }
});
//         | | | | LINKED  | | | |        //
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
        if(!rooms[game_id].game.players.includes(req.cookies["usnm"])){
            return res.sendFile(default_paths.illegal_game);
        }

        //Check if game is started
        else if(!rooms[game_id].game.started){
            return res.sendFile(default_paths.illegal_game);
        }

        //Else join the room if its started
        if (rooms[game_id].game.started){
            res.sendFile(default_paths.game_room);
        }

        else{
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

//Socket.io "routes"
io.on("connection", (socket) => {

    //Start the game
    socket.on("start-game", (room_data) => {

        const player_amount = rooms[room_data.id].game.players.length;
        const room_leader = rooms[room_data.id].game.leader
        const room_id = room_data.id;
        
        try{
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
        const room_id = data.room_id;
        const player = data.player;

        try{
            //Check if player is already in the room
            if(!rooms[room_id].game.players.includes(player)){

                //Add player to the room
                rooms[room_id].game.players = [
                    ...rooms[room_id].game.players,
                    player
                ];
                
                //emit the players currently in the room
                io.emit(`player-join:${room_id}`, rooms[room_id].game.players);
            }
        }catch{
            return false;
        }
    })

    //GAME CONFIGURATION -------------------
    socket.on("config:mature-toggle", (room_data) => {
        //Room_data contains "room", "mature" and "player".

        const room_id = room_data.room;
        const player = room_data.player;
        const new_mature_value = room_data.mature;

        try{
            //First, check if the player is the leader, 
            //because only the leader may change settings
            if (rooms[room_id].game.leader == player){
                //Then change the mature value to the one inputted
                rooms[room_id].game.config.mature = new_mature_value;
    
                //send the data back to the other players.
                io.emit(`config:mature-toggle:${room_id}`, new_mature_value)
            }
        }catch{
            return false;
        }

    })

    socket.on("config:user-kick", (data) => {
        const kick_request = data.kick_request;
        const kick_requester = data.kick_requester;
        const room_id = data.room_id;


        try{
            //check if kick_requester is the leader
            //of their room.
            if (rooms[room_id].game.leader == kick_requester){
                //remove the user from the list
                rooms[room_id].game.players.splice(
                    rooms[room_id].game.players.indexOf(kick_request),
                    1
                );
        
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
})



//Listeners
server.listen(PORT, () => {
    console.log("up and running");
})