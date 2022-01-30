winnerTimeline = gsap.timeline();

const stayDelay = 1;
const headstart = .6;

const winnerTension = 4.2; //seconds

const player_popup = (rank, delay = 0) => {
	winnerTimeline.to(`${rank} .player`, { scaleX: 1, scaleY: 1, duration: .5, ease: "back.out(1.7)" });
}

const rank_popup = (rank, direction) => {
	winnerTimeline.from(rank, { y: "100%", duration: 1, ease: "expo.out" }, "+=2")
				  .to(`${rank} .player`, { scaleX: 1, scaleY: 1, duration: .5, ease: "back.out(1.7)" })
				  .fromTo(rank, 1, { x: "0%", filter: "brightness(100%)" }, { x: direction, filter: "brightness(70%)" }, `+=${stayDelay}`);
}
const winner = (tension = 0) => {
	winnerTimeline.from(".rank-nr-1", { y: "100%", duration: 1, ease: "expo.out"}, `-=${headstart}`)
				  .to(".rank-nr-1 .player", { scaleX: 1, scaleY: 1, duration: .5, ease: "back.out(1.7)"}, `+=${tension}`);
}

winnerTimeline.add(rank_popup(".rank-nr-3", "90%"))
			  .add(rank_popup(".rank-nr-2", "-90%"))
			  .add(winner(1));

// winnerTimeline.from(".rank-nr-1", { y: "100%", duration: 1, ease: "expo.out", onComplete: () => {
// 	play_sound("https://www.myinstants.com/media/sounds/snare-drumroll.mp3", 1);
// }}, `-=${headstart}`);
// winnerTimeline.to(".rank-nr-1 .player", { scaleX: 1, scaleY: 1, duration: .5, ease: "back.out(1.7)", onStart: () => {
// 	play_sound("https://www.myinstants.com/media/sounds/tada_1.mp3", 1, 5);
// 	confetti.render();
// }}, `+=${winnerTension}`);

winnerTimeline.from(".winner-top-text", { y: "100vh", duration: 1, ease: "expo.out" });

winnerTimeline.from(".btl", { y: "100", duration: 1, opacity: 0, ease: "expo.out" }, 1);



winnerTimeline.eventCallback("onComplete", () => {
	console.log("play sound");
})
winnerTimeline.eventCallback("onStart", () => {
	console.log("play sound");
})
