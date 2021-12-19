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

//cors for 3party requests
const cors = require("cors");
app.use(cors());

//Crypto for room code generation
const crypto     = require("crypto");
const generate_roomcode = () => crypto.randomBytes(32).toString("hex");

//cookie parser
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//default paths
const default_paths = {
    illegal_game: path.resolve("frontend/html/error-pages/roomError.html"),
    home: path.resolve("frontend/html/index.html"),
    room: path.resolve("frontend/html/room.html"),
    game_room: path.resolve("frontend/html/game.html"),
}

//Mutational variables
let rooms = {};

//Constant variables
const MAX_PLAYERS_PER_ROOM = 16;
const MIN_PLAYERS_PER_ROOM = 2;

//Express static folders
app.use("/", express.static(path.join(__dirname, 'resources')))
app.use("/script", express.static(path.join(__dirname, 'frontend/scripts')))
app.use("/style", express.static(path.join(__dirname, 'frontend/style')))
app.use("/page", express.static(path.join(__dirname, 'frontend/html')))

//Express Routes    || STATIC PAGES ONLY ||
app.get("/", (req, res) => {
    res.sendFile(path.resolve("frontend/html/index.html"));
})

//Express Routes    || *NON STATIC PAGES ONLY ||

//room creation
app.get("/api/create-room", (req, res) => {

    //crypto functionen som jag gjorde
    const roomcode = generate_roomcode();

    //game leader.
    const leader = req.cookies["usnm"];

    //Create the room
    rooms[roomcode] = {
        roomcode: roomcode,
        game: {
            players: [leader],
            leader: leader,
            started: false,
            mature: false,
        }
    };

    //send the user to the newly created room
    res.redirect(`/room/${roomcode}`);
})

//room joining
app.get("/room/:roomID?", (req, res) => {
    const roomID = req.params.roomID;

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
})
//         | | | | LINKED  | | | |        //
//game joining
app.get("/game/:gameID?", (req, res) => {
    const game_id = req.params.gameID;

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
})

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


//Socket.io "routes"
io.on("connection", (socket) => {

    //Start the game
    socket.on("start-game", (room_data) => {

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
    });

    //Player is joining
    socket.on("player-join", (data) => {
        const room_id = data.room_id;
        const player = data.player;

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
    })
})



//Listeners
server.listen(PORT, () => {
    console.log("up and running");
})