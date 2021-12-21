const name_input = document.getElementById('name-input');
const submit_name = document.getElementById('submit-name');

submit_name.addEventListener('click', () => {
    if(name_input.value.length <= 2){
        alert('Please enter a valid name');
        return;
    }
    //check if name doesnt contain special characters
    else if(!name_input.value.match(/^[a-zA-Z0-9]+$/)){
        alert('Name can only contain a-z 0-9');
        return;
    }

    else{
        setCookie("usnm", name_input.value, 30);

        if (queued_room != "none"){
            window.open(`/${queued_room}`, "_self");
        }else{
            window.open(`https://artur.red`, "_self");
        }
    }
});


const select_image = (img) => {
    setCookie("pfp", img, 30);
}