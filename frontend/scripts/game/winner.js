const winner_party = () => {

    const canvas = document.createElement('canvas');
    canvas.id = 'winner-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    document.body.appendChild(canvas);

    console.log(canvas);

    const particle_system = new ParticleSystem({
        canvas: canvas,
        particle_amount: 200,
        colors: ["#e6194B", "#f58231", "#ffe119", "#bfef45", "#3cb44b", "#42d4f4", "#4363d8", "#911eb4"],
        size: {
            x: 16,
            y: 20
        },
        rotation_speed: 0.4,
        gravity: 0.007,
        spread: 0.2,
        cluster_length: 6000,
        speed: 1,
    });
    
    
    setTimeout(() => {
        play_sound("https://www.myinstants.com/media/sounds/cheering-woohoo.mp3", 1, 1, 2);
        particle_system.render();
        console.log("my balls itching");
    }, 8000);

}