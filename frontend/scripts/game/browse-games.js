const room_list = document.getElementById("room-list");

(async() => {
    const request = await fetch("https://artur.red/api/browse");
    const rooms = await request.json();
    const room_array = Object.values(rooms);

    console.log(room_array);

    room_array.forEach(room => {
        const room_element = document.createElement("a");
        room_element.style.textDecoration = "none";
        room_element.href = `https://artur.red/${room.small_code}`;
        room_element.innerHTML = `
            <li class="room">

                <img class="room-pfp" style="background: ${room.game.players[0].player_color}" src="https://artur.red/faces/${
                    room.game.players[0].pfp
                }.svg" alt="Profile Picture">

                <h3>${room.game.leader.name}</h3>
                <h3>${room.game.players.length}/8</h3>
                <h3>${room.game.config.language}</h3>
                <h3>${room.game.config.question_type}</h3>
            </li>
        `;
        room_list.appendChild(room_element);
    });

})();


