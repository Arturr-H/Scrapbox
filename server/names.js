const capitalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
const get_random_id = () => {
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return id;
}

const adjectives = [
    "slimy", "round", "big", "cute", "holy", "fine", "nice", "red", "angry",
    "happy", "sad", "tired", "hungry", "lazy", "giant", "tiny", "old", "quick",
    "slow", "fast", "smart", "dumb", "beautiful", "ugly", "scary", "funny", "lucky",
    "unlucky",
]

const nouns = [
    "cat", "dog", "bird", "fish", "pig", "cow", "horse", "sheep", "mouse",
    "man", "grandma", "guy", "kid", "hamburger", "hotdog", "cactus", "moose",
    "gamer", "player", "taco", "salsa", "mustard", "ketchup", "master"
]

module.exports = {
    generate_name: () => {
        return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${capitalize(nouns[Math.floor(Math.random() * nouns.length)])}`
    },
    generate_pfp: (len) => {
        return Math.floor(Math.random() * len)
    },
    generate_uid: () => {
        return get_random_id()
    }
}