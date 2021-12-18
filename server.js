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

//Mutational variables
let rooms = {};

//Constant variables
const MAX_PLAYERS_PER_ROOM = 16;

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

    //ledaren av spelet
    const leader = req.cookies["usnm"];

    //Create the room
    rooms[roomcode] = {
        roomcode: roomcode,
        game: {
            players: {},
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
            res.sendFile(path.resolve("frontend/html/error-pages/roomError.html"));
            return;
        }
        //Check if room is full
        else if(Object.keys(rooms[roomID].game.players).length >= MAX_PLAYERS_PER_ROOM){
            res.redirect("/");
            return;
        }
        //Check if room is started
        else if(rooms[roomID].game.started){
            res.redirect("/");
            return;
        }
        //Else join the room
        else{
            res.sendFile(path.resolve("frontend/html/room.html"));
        }
    }catch{
        res.sendStatus(404);
    }
})

//room listing, so the user can get data
//after room action has been taken...
app.get("/api/get-room-data", (req, res) => {

    const room_id = req.headers.room;

    //send the data to the user
    res.json(rooms[room_id]);
});


//Socket.io "routes"
io.on("connection", (socket) => {

    //Join a room
    socket.on("join-room", (room_data) => {
        // console.log(room_data);
    })

    //Start the game
    socket.on("start-game", (room_data) => {

        //check if player is leader
        if(rooms[room_data.id].game.leader == room_data.player){
            io.emit(`start-game:${room_data.id}`, "game started");

            //Set the game to started
            rooms[room_data.id].game.started = true;
        }
    });

    socket.on("player-join", (data) => {
        const room_id = data.room_id;
        const player = data.player;

        //Check if player is already in the room
        if(!rooms[room_id].game.players[player]){
            socket.emit(`player-join:${room_id}`, player);
        }
    })
})



//Listeners
server.listen(PORT, () => {
    console.log("up and running");
})