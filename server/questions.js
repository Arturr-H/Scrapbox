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
    try {
        return array[Math.floor(Math.random() * array.length)];
    } catch {
        return " ";
    }
}

//Få en random string från en array FAST KAPITALISERAD;;
const rC = (array) => {
    try {
        const word = array[Math.floor(Math.random() * array.length)];
        return word.charAt(0).toUpperCase() + word.slice(1);
    } catch {
        return " ";
    }
}

const random_int = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
        } else {
            Names = ContestorNames
        }
        //Ett random namn av alla de som spelar i spelet...
        const name = rC(Names);


        let defaultQuestions = [
            {
                question:`What did you do after the ${r(places)} last night?`,
                additional_snippets: ["i", "went", "to"]
            },
            {
                question:`What did you do to ${r(pronouns.second)}?`,
                additional_snippets: null
            },
            {
                question:`${rC(pronouns.third)} ${r(people)} went missing last night, and many people suspect it's you. What do you have to say?`,
                additional_snippets: ["it's", "not", "me", "because"]
            },
            {
                question:`I think I have a plan to solve world hunger. It'll begin with ${Blank()}`,
                additional_snippets: ["feeding", "food"]
            },
            {
                question:`Buisness 101: Step one: ${Blank()}, Step two: Profit.`,
                additional_snippets: null
            },
            {
                question:`Why were you fired from you last job?`,
                additional_snippets: ["boss"]
            },
            {
                question:`White people be like: ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`What ended my last relationship?`,
                additional_snippets: null
            },
            {
                question:`Trending on Twitter: #stop${Blank()}`,
                additional_snippets: null
            },
            {
                question:`Trending on Twitter: #${Blank()}`,
                additional_snippets: ["stop", "cancel"]
            },
            {
                question:`Hi, Welcome to McDonalds. what can I get for you?`,
                additional_snippets: ["McDonalds", "burger", "with", "fries", "soda"]
            },
            {
                question:`Top ten reasons to keep going. Nr 15: ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`${Blank()} is what makes life worth living.`,
                additional_snippets: null
            },

            {
                question:`How would you hide a dead body?`,
                additional_snippets: null
            },
            {
                question:`Tonight, gentlemen, I will for the first time ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`Help!! My son is ${Blank()}!`,
                additional_snippets: null
            },
            {
                question:`Girl, I wanna invite you back to my place and show you ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`Soo... What's the matter with all the screams coming from the basement?`,
                additional_snippets: null
            },
            {
                question:`What's the best thing about being a ${Blank()}?`,
                additional_snippets: null
            },
            {
                question:`Since when was it illegal to ${Blank()}?`,
                additional_snippets: null
            },
            {
                question:`I have a dream that one day this nation will rise up and live out the true meaning of its creed: ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`I thought I'd never see ${Blank()} again, yet here we are.`,
                additional_snippets: null
            },
            {
                question:`How would you spend a Saturday night with ${name}?`,
                additional_snippets: null
            },
            {
                question:`${name} is a ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`In one sentence, describe ${name}'s whole life.`,
                additional_snippets: null
            },
            {
                question:`If you could invent a new dish, what ingredients would it have?`,
                additional_snippets: null
            },
            {
                question:`If you could change one thing about ${name}, what would it be?`,
                additional_snippets: null
            },

            {
                question:`The cops are on to me, luckily I brought with me ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`Ugh, I hate ${name}'s ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`When I die, bury me in ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`Every time I see ${name} I ${Blank()}.`,
                additional_snippets: ["feel", "good", "horrible", "like"]
            },
            {
                question: `I've watched ${name} ${Blank()} several times. It's unbelievable.`,
                additional_snippets: null
            },
            {
                question:`I am clearly suffering from ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`I just realized that I'll never be able to ${Blank()} again.`,
                additional_snippets: null
            },
            {
                question:`THE FUCKING WORLD IS ENDING! "Not now mom I'm ${Blank()}"`,
                additional_snippets: ["playing", "trying", "to"]
            },
            {
                question:`I just bought a new router! Could you get me a solid Wi-Fi name?`,
                additional_snippets: null
            },
            {
                question:`Insult ${name}`,
                additional_snippets: ["He", "She", "They", "is"]
            },
            {
                question:`If you were to be arrested but innocent, what would your friends think that you've done?`,
                additional_snippets: null
            },

            {
                question:`If you got to live as a five year old for a day, what would you do first?`,
                additional_snippets: null
            },
            {
                question:`What would you engrave on your tombstone?`,
                additional_snippets: ["a", "big", "text", "saying", "an", "image", "of"]
            },
            {
                question:`${Blank()}, underrated and should be celebrated.`,
                additional_snippets: null
            },
            {
                question:`Why are you ${Blank()} right now? -"Uhh it's for scientifical purposes"`,
                additional_snippets: ["doing", "making", "trying", "to"]
            },
            {
                question:`${Blank()} is the best thing since sliced bread.`,
                additional_snippets: null
            },
            {
                question:`${name}, our hero. Please ${Blank()} immediately.`,
                additional_snippets: ["stop", "cancel"]
            },
            {
                question:`If you were to host an e-sport competition, what would the prize be?`,
                additional_snippets: ["a", "bunch", "of", "some"]
            },
            {
                question:`Selling crack is illegal, but if you could sell crack, what would you do?`,
                additional_snippets: ["sell", "a", "bunch", "of", "crack"]
            },
            {
                question:`What continues to make me constipated?`,
                additional_snippets: ["food", "culture"]
            },
            {
                question:`${name} consists of pure ${Blank()}.`,
                additional_snippets: null
            },
            {
                question:`Breaking news! ${name} has been arrested for ${Blank()}.`,
                additional_snippets: ["being", "doing", "trying", "to"]
            },
            {
                question:`Omg, Toys R Us has started selling ${Blank()} to children!`,
                additional_snippets: ["a", "bunch", "some", "of", "toys"]
            },
            {
                question:`Coca Cola X ${Blank()}, the crossover we didn't know we needed.`,
                additional_snippets: ["soda"]
            },
            {
                question:`McDonalds X ${Blank()}, the crossover we didn't know we needed`,
                additional_snippets: null
            },
        ];

        let matureQuestions = [
            {
                question: `During sex, I like to think about ${Blank()}.`,
                additional_snippets: ["when", "I", "was", "that"]
            },
            {
                question: `What will always get you laid?`,
                additional_snippets: ["using"]
            },
            {
                question: `Well, I was drunk last night, can you tell me how I lost my virginity?`,
                additional_snippets: null
            },
            {
                question: `I don't need drugs to get stoned, I'll just use ${Blank()}.`,
                additional_snippets: ["some", `${random_int(0,4)}-${random_int(5,10)}`, "pieces", "of"]
            },
            {
                question: `Spice up your sex life by bringing ${Blank()} into the bedroom.`,
                additional_snippets: null
            },
            {
                question: `What the fuck is ${name} doing out here with all these ${Blank()}?`,
                additional_snippets: null
            },
            {
                question: `Shit, I forgot that we have to pay for the ${Blank()}.`,
                additional_snippets: ["bill", "subscription"]
            },
            {
                question: `If I ever see ${name} again, I'm going to kill him with ${Blank()}.`,
                additional_snippets: ["army", "containing"]
            },
            {
                question: `I just had a massive ${Blank()}.`,
                additional_snippets: null
            },
            {
                question: `If you ever want your cock to grow back, you have to eat ${Blank()}.`,
                additional_snippets: ["a", "lot", "of"]
            },
            {
                question: `What's one thing that keeps getting me horny?`,
                additional_snippets: null
            },
            {
                question: `Oh you don't know what sex is? I can sum it up for you: ${Blank()}`,
                additional_snippets: null
            }
        ]

        if (typeof questionType == "string" && questionType == "mature") {
            defaultQuestions.push(matureQuestions)
        } else if (typeof questionType == "string" && questionType == "mature-only") {
            defaultQuestions = matureQuestions
        }


        return r(defaultQuestions);
    }
}