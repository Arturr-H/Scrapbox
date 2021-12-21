
const notice = (message) => {

    if(document.getElementById("notice-box")){
        document.getElementById("notice-box").remove();
    }

    //create a small div that pops up from the ground with the message
    const notice_div = document.createElement("div");
    notice_div.classList.add("notice");
    notice_div.innerHTML = message;
    notice_div.id = "notice-box"
    document.getElementById("main").appendChild(notice_div);

    notice_div.addEventListener("click", () => {
        notice_div.remove();
    })

    setTimeout(() => {
        notice_div.remove();
    }, 5000);
}