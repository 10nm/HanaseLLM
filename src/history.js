const DefaultHistory = []
//    { role: "user", parts: [{ text: "[System] 今からあなたは一人の人間として、ユーザーと会話をします。ユーザーの発言に対しては日本語で、簡潔かつ自然に応答してください。" }] },
// { role: "model", parts: [{ text: "わかった。" }] }

let History = [];
function push_history(message) {
    if (History.length > 0) {
        History.push(message);
    } else {
        History = DefaultHistory;
    }
}

function init_history() {
    History = DefaultHistory;
}

function get_history() {
    return History;
}

export { push_history, get_history, init_history };