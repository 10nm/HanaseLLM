import fs from 'fs';

const DefaultHistory = []

let History = [];
function push_history(message) {
    History.push(message);
    fs.writeFileSync('./src/temp/history.json', JSON.stringify(History));
}

function init_history() {
    try {
        const data = fs.readFileSync('./src/temp/history.json', 'utf8');
        History = JSON.parse(data);
    } catch (err) {
        History = DefaultHistory;
        console.log("Starting new history");
    }
}

function get_history() {
    return History;
}

export { push_history, get_history, init_history };
