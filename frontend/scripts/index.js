const idea_form = document.getElementById("idea-form");
const idea_text = document.getElementById("idea-text");

idea_form.addEventListener("submit", async (e) => {
	e.preventDefault();
	const text = idea_text.value;

	if(text != "") {
		await fetch("https://artur.red/api/send-idea", {
			method: "GET",
			headers: {
				text: text
			},
		})
		idea_text.value = "";
		return;
	}
});

//Simple function WOAH NO FUCKING SHIT WOOOOOAAHAAAAAAAAAA
const toggleElement = (el) => {
	el.classList.toggle("show");
}

let autoSlideTimer;

var slideIndex = 1;

const showSlides = (n) => {
	var slides = document.getElementsByClassName("slide");

	//slides
	for (i = 0; i < slides.length; i++) {
		slides[i].classList.remove("active");
	}

	slides[slideIndex - 1].classList.add("active");
	console.log(n-1, ", current slideindex")
    
    const dots = document.querySelectorAll(".dot");

	for (i = 0; i < dots.length; i++) {
		dots[i].classList.remove("active");
	}
	dots[slideIndex - 1].classList.add("active");

	clearTimeout(autoSlideTimer);
	
	autoSlideTimer = setTimeout(() => {
		if(slideIndex == slides.length) {
			slideIndex = 1;
		} else {
			slideIndex++;
		}
		console.log("Next slide!! AUTO")
		showSlides(slideIndex);
	}, 5000);
}
	
const setPage = (pageNumber) => {
	if(pageNumber == slideIndex) { return; }
	showSlides(slideIndex = pageNumber);
}


showSlides(slideIndex);



// /*=-------------------=/
// ││                     │
// ││      Observers      │
// ││                     │
// /=-------------------=*/

// //Options
// const toggleOnScrollOptions = {
// 	root: null,
// 	rootMargin: '-200px 10000px -50px 10000px',
// 	threshold: .5
// }
// const appearOnScrollOptions = {
// 	root: null,
// 	rootMargin: '0px 10000px -100px 10000px',
// 	threshold: .5
// }

// //Observers
// const appearOnScroll = new IntersectionObserver((entries, appearOnScroll) => {
// 	entries.forEach(entry => {
// 		if(!entry.isIntersecting) {
// 			entry.target.classList.remove('observing');
// 		} else{ 
// 			entry.target.classList.add("observing");
// 			appearOnScroll.unobserve(entry.target);
// 		}
// 	});
// }, appearOnScrollOptions);
// const toggleOnScroll = new IntersectionObserver((entries) => {
// 	entries.forEach(entry => {
// 		if (!entry.isIntersecting) {
// 			entry.target.classList.remove("observing");
// 		} else{
// 			entry.target.classList.add("observing");
// 		}
// 	});
// }, toggleOnScrollOptions);


// //Queryselector
// document.querySelectorAll(".fade-in").forEach((el) => {
// 	appearOnScroll.observe(el);
// });
// document.querySelectorAll(".fade-in-toggle").forEach((el) => {
// 	toggleOnScroll.observe(el);
// });
// document.querySelectorAll(".fade-out").forEach((el) => {
// 	toggleOnScroll.observe(el);
// });
