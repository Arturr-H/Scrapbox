const room_list = document.getElementById("room-list");

(async() => {
    const request = await fetch("https://artur.red/api/browse");
    const rooms = await request.json();
    const room_array = Object.values(rooms);

    room_array.forEach(room => {
        const room_element = document.createElement("a");
        room_element.href = `https://artur.red/${room.small_code}`;
        room_element.innerHTML = `
            <div class="room">
                <h3>${room.game.players.length}/16</h3>
                <h3>${room.game.config.mature?"Mature":"Regular"}</h3>
                <h3>${room.game.leader}</h3>
                <img src="https://artur.red/icons/light/Login.svg" alt="join">
            </div>
        `;
        room_list.appendChild(room_element);
    });

})();


