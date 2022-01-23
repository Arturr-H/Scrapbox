document.getElementById("name-input").value = getCookie("usnm");

const toggleModal = (id) => {
    var modal = document.getElementById(id);
    modal.classList.toggle("open");
}

var slideIndex = 1;

const showSlides = (n) => {
    var slides = document.getElementsByClassName("modal-slide");
    
    // if (n > slides.length) { slideIndex = 1 }
    // if (n < 1) { slideIndex = slides.length }

    //slides
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }

    slides[slideIndex - 1].style.display = "flex";
    console.log(n - 1, ", current slideindex")


    // dots
    var dots = document.getElementsByClassName("dot");
    for (i = 0; i < dots.length; i++) {
        dots[i].classList.remove("active");
    }
    dots[slideIndex - 1].classList.add("active");
}

const turnTrack = (direction) => {
    if (direction == null) return;
    else if (direction == "next") {
        showSlides(slideIndex += 1);
    }
    else if (direction == "previous") {
        showSlides(slideIndex -= 1);
    }
    showSlides(slideIndex += direction);
}
showSlides(slideIndex)


let new_name = "";
let old_name = getCookie("usnm");
let new_pfp = 0;

document.getElementById("name-form").addEventListener("submit", (e) => {
    e.preventDefault();
    new_name = document.getElementById("name-input").value;
    turnTrack(1);
});

const select_profile = (nr) => {
    new_pfp = nr;
    toggleModal("name-modal");

    setCookie("usnm", new_name, 30);
    setCookie("pfp", new_pfp, 30);
    setCookie("selfselected", "yes", 30);

    socket.emit("name-change", {
        room_id: room_id,
        old_name: old_name,
        new_name: new_name,
        new_pfp: new_pfp,
        suid: getCookie("suid")
    });

    old_name = new_name;
    new_name = "";
    new_pfp = 0;
}

if (getCookie("selfselected") == "auto"){
    toggleModal("name-modal");
}