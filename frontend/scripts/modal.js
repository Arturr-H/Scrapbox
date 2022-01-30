document.getElementById("name-input").value = getCookie("usnm");
let qr_open = false;

const toggleModal = (id) => {
    var modal = document.getElementById(id);
    modal.classList.toggle("open");

    if(id == "qr-modal"){
        setTimeout(() => qr_open = !qr_open, 50);
    }
}
document.addEventListener("click", () => {
    if(qr_open){
        toggleModal("qr-modal");
    }
});


var slideIndex = 1;

const showSlides = (n) => {
    var slides = document.getElementsByClassName("modal-slide");
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }

    slides[slideIndex - 1].style.display = "flex";


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

const random_string_id = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const select_profile = (nr) => {
    new_pfp = nr;
    toggleModal("name-modal");

    setCookie("usnm", new_name, 30);
    setCookie("pfp", new_pfp, 30);
    setCookie("suid", random_string_id(), 30);

    old_name = new_name;
    new_name = "";
    new_pfp = 0;

    //open link
    if(game_queue.length > 0){
        window.open(`https://artur.red/${game_queue}`, "_self");
    }else{
        window.open(`https://artur.red`, "_self");
    }
}