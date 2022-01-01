const name_input = document.getElementById('name-input');
const submit_name = document.getElementById('submit-name');

const get_random_id = () => {
    //an id that contains 0-9, a-z, and A-Z
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return id;
}

submit_name.addEventListener('click', () => {
    if(name_input.value.length <= 2){
        alert('Please enter a valid name');
        return;
    }
    //check if name doesn't contain special characters
    else if(!name_input.value.match(/^[a-zA-Z0-9 _]+$/)){
        alert('Name can only contain a-z 0-9');
        return;
    }

    else{
        setCookie("usnm", name_input.value, 30);
        setCookie("uid", get_random_id(), 30);

        if (queued_room != "none"){
            //so i've set up in the server that checks if the user
            //has a name, if it has a name, it will redirect them
            //to the room they were in, if not, it will redirect them
            //to artur.red
            window.location.reload();
        }else{
            window.open(`https://artur.red`, "_self");
        }
    }
});


const select_image = (img) => {
    setCookie("pfp", img, 30);
}