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
            `Why did ${r(pronouns.first)} leave you?`,
            `What did you do after the ${r(places)} last night?`,
            `What did you do to ${r(pronouns.second)}?`,
            `${rC(pronouns.first)} is really mad at you, what happened?`,
            `${rC(pronouns.third)} ${r(people)} went missing last night, and many people suspect it's you. What do you have to say?`,
            `What's that smell?`,
            `I think I have a plan to solve politics. It'll begin with ${Blank()}`,
            `${r(pronouns.first)} said to me: "What the fuck is going on?" I answered: ${Blank()}`,
            `I have a plan: Step one: ${Blank()}, Step two: Profit.`,
            `${name} has had trouble getting good grades. If you were to help, what would you do?`,
            `I think ${r(pronouns.first)} is in love with ${name}. What are you going to to about it?`,
            `Why were you fired from you last job?`,
            `What is something you are really good at?`,
            `White people be like: ${Blank()}.`,
            `Black peoeple be like: ${Blank()}.`,
            `What's a girl's best friend?`,
            `Why am I sticky?`,
            `What ended my last relationship?`,
            `Hey Reddit! I'm ${Blank()}. Ask me anything.`,
            `Just saw this upsetting video! Please retweet!! #stop${Blank()}`,
            `I got alot of problems, but ${Blank()} ain't one.`,
            `I'm no doctor, but I'm pretty sure what you're suffering from is called "${Blank()}".`,
            `What gives me uncontrollable gas?`,
            `Click here for free ${Blank()}!!!`,
            `I drink to forget ${Blank()}.`,
            `Hi, Welcome to McDonalds. what can I get for you?`,
            `Top ten reasons to keep going. Nr 15: ${Blank()}.`,
            `Maybe ${rC(pronouns.first)}'s born with it. Maybe it's ${Blank()}.`,
            `${Blank()} is what makes life worth living.`,


            `Why did no one tell me that it's not normal to ${Blank()}?`,
            `What's one thing you can tell your girlfriend and your son`,
            `In 40 years, what will people be nostalgic for?`,
            `How do you feel about people putting pineapple on pizza?`,
            `How would you sum up the internet in one sentence?`,
            `I heard that ${name} has some good tips on what red flags to watch out for. Do you have any?`,
            `What’s wrong but sounds right?`,
            `What’s right but sounds wrong?`,
            `How would you hide a dead body?`,
            `What do you think about when you’re alone in bed?`,
            `What never fails to liven up the party?`,
            `Why can't I sleep at night?`,
            `Tonight, gentlemen, I have a date with ${Blank()}.`,
            `Help!! My son is ${Blank()}!`,
            `Daddy, why is mommy crying?`,
            `What gets better with age?`,
            `What are my parents hiding from me?`,
            `Girl, I wanna invite you back to my place and show you ${Blank()}.`,
            `What are some inappropriate places to use a VR headset?`,
            `Describe the usage of ${r(item)}`,
            `It's a pity that kids these days are all getting involved with ${Blank()}.`,
            `Do NOT go here! Found ${Blank()} in my spaghetti bolognese!`,
            `Life for American Indians was forever changed when the White Man introduced them to ${Blank()}.`,
            `What is ${name}'s guilty pleasure?`
        ];

        let matureQuestions = [
            `During sex, I like to think about ${Blank()}.`,
            `What will always get you laid?`,
            `How did I lose my virginity?`,
            `I don't need drugs to get stoned, I'll just use ${Blank()}.`,
            `Spice up your sex life by bringing ${Blank()} into the bedroom.`,
            `Fun tip! When your man asks you to gown on him, try suprising him with ${Blank()} instead.`,
        ]

        if (typeof questionType == "string"&&questionType=="mature"){
            defaultQuestions.push(matureQuestions)
        }else if(typeof questionType == "string"&&questionType=="mature-only"){
            defaultQuestions = matureQuestions
        }


        return r(defaultQuestions);
    }
}