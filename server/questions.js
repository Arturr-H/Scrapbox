const places = ["bar", "festival", "school meetup"]
const pronouns = {
    first: ["he", "she"],
    second: ["him", "her"],
    third: ["his", "her"]
}
const people = ["grandma", "father", "mother", "son", "brother", "sister", "step-sister"]
const item = ["car", "bed", "chair", "table", "family", "girlfriend", "home"]


//Få en random string från en array;;
//t.ex r(pronouns)
const r = (array) => {
    try{
        return array[Math.floor(Math.random() * array.length)];
    }catch{
        return " ";
    }
}

//Få en random string från en array FAST KAPITALISERAD;;
const rC = (array) => {
    try{
        const word = array[Math.floor(Math.random() * array.length)];
        return word.charAt(0).toUpperCase() + word.slice(1);
    }catch{
        return " ";
    }
}

//Fyll i fält...
const Blank = () => {
    return "________"
}



module.exports = {
    getQuestion: (ContestorNames, questionType) => {

        let Names = [];

        //Om det inte finns några namn
        if (!ContestorNames) {
            Names = ["Player", "ManMan64", "Bob", "Artur", "Aaron"]
        }else{
            Names = ContestorNames
        }
        //Ett random namn av alla de som spelar i spelet...
        const name = rC(Names);


        let defaultQuestions = [
            `What did you do after the ${r(places)} last night?`,
            `What did you do to ${r(pronouns.second)}?`,
            `${rC(pronouns.third)} ${r(people)} went missing last night, and many people suspect it's you. What do you have to say?`,
            `What's that smell?`,
            `I think I have a plan to solve world hunger. It'll begin with ${Blank()}`,
            `Buisness 101: Step one: ${Blank()}, Step two: Profit.`,
            `Why were you fired from you last job?`,
            `White people be like: ${Blank()}.`,
            `What's a girl's best friend?`,
            `What ended my last relationship?`,
            `Just saw this upsetting video! Please retweet!! #stop${Blank()}`,
            `I got alot of problems, but ${Blank()} ain't one.`,
            `I ain't no doctor, but I'm pretty sure what you're suffering from is called "${Blank()}".`,
            `I drink to forget ${Blank()}.`,
            `Hi, Welcome to McDonalds. what can I get for you?`,
            `Top ten reasons to keep going. Nr 15: ${Blank()}.`,
            // `Maybe ${rC(pronouns.first)}'s born with it. Maybe it's ${Blank()}.`,
            `${Blank()} is what makes life worth living.`,

            `How would you sum up the internet in one sentence?`,
            `How would you hide a dead body?`,
            `Tonight, gentlemen, I will for the first time ${Blank()}.`,
            `Help!! My son is ${Blank()}!`,
            `Girl, I wanna invite you back to my place and show you ${Blank()}.`,
            // `Do NOT go here! I found ${Blank()} in my spaghetti bolognese!`,
            `What is ${name}'s guilty pleasure?`,
            `Soo... What's the matter with all the screams coming from the basement?`,
            // `www.${Blank()}.com, don't go there! It's a trap!`,
            `What's the best thing about being a ${Blank()}?`,
            `Since when is it illegal to ${Blank()}?`,

            `I have a dream that one day this nation will rise up and live out the true meaning of its creed: ${Blank()}.`,
            `I thought I'd never see ${Blank()} again, yet here we are.`,
            `How would you spend a Saturday night with ${name}?`,
            `${name} is a ${Blank()}.`,
            `Why is ${name} so ${Blank()}?`,
            `In one sentence, describe ${name}'s whole life.`,
            
            `If you could invent a new dish, what ingredients would it have?`,
            `If you could change one thing about ${name}, what would it be?`,
            
            `The cops are on to me, luckily I brought with me ${Blank()}.`,
            `Ugh, I hate ${name}'s ${Blank()}.`,
            `When I die, bury me in ${Blank()}.`,
            `Every time I see ${name} I feel like ${Blank()}.`,

            `I am clearly suffering from ${Blank()}.`,
            `I just realized that I'll never be able to ${Blank()} again.`,
        ];

        let multipleChoiceQuestions = [
            `Come on, I'm not a ${Blank()}, I'm a ${Blank()}!`,
        ]

        let matureQuestions = [
            `During sex, I like to think about ${Blank()}.`,
            `What will always get you laid?`,
            `Well, I was drunk last night, can you tell me how I lost my virginity?`,
            `I don't need drugs to get stoned, I'll just use ${Blank()}.`,
            `Spice up your sex life by bringing ${Blank()} into the bedroom.`,
            `Fun tip! When your man asks you to gown on him, try suprising him with ${Blank()} instead.`,
            `What the fuck is ${name} doing out here with all these ${Blank}?`,

            `Shit, I forgot that we have to pay for the ${Blank()}.`,
            `If I ever see ${name} again, I'm going to kill him with ${Blank()}.`,
            `I just had a massive ${Blank()}.`,
            `If you ever want your cock to grow back, you have to eat ${Blank()}.`,
            `What's the best way to get a blowjob?`,

            `Ass to mouth is the best part of a ${Blank()}.`,
            `If you could have a romantic relationship with ${name}, what would it be?`,
           
            `What's one thing that keeps getting me horny?`,
            `Oh you don't know what sex is? I can sum it up for you: ${Blank()}`,
            `What gets you in the mood?`,
            
            `THE FUCKING WORLD IS ENDING! "Not now mom I'm ${Blank()}"`,
        ]

        if (typeof questionType == "string"&&questionType=="mature"){
            defaultQuestions.push(matureQuestions)
        }else if(typeof questionType == "string"&&questionType=="mature-only"){
            defaultQuestions = matureQuestions
        }


        return r(defaultQuestions);
    }
}