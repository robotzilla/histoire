// FIXME! This always appends at the end. If we're loading multiple chunks, we
// want them inserted in order.
function dataLoaded(xhr, start, end) {
    const list = document.getElementById("thelist");

    const addItem = line => {
        const item = document.createElement("li");
        const text = document.createTextNode(line);
        item.appendChild(text);
        list.appendChild(item);
    };

    if (xhr.status == 404) {
        // Not found. That's fine; there might not be any entries for that time range.
        return;
    }

    for (const line of xhr.responseText.split("\n")) {
        if (line == "")
            continue;
        const [when, message] = line.split(" ", 1);
        if (when < start || when > end)
            continue;
        addItem((new Date(when * 1000)).toLocaleString() + " - " + line);
    }
}

function loadNotes(user, when, start, end) {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', ev => dataLoaded(xhr, start, end));
    xhr.open("GET", `users/${user}/${user}.${when}.txt`);
    xhr.send();
}

var eraSeconds = 1000000;

function computeEra(time_sec) {
    return time_sec - (time_sec % eraSeconds);
}

function loadUserNotes(user, start, end) {
    if (!end)
        end = Date.now() / 1000; // ms -> sec
    if (!start)
        start = end - 60 * 60 * 24 * 7;

    // Look back 1 week
    for (let t = computeEra(start); t <= computeEra(end); t += eraSeconds)
        loadNotes(user, t, start, end);
}

var params = new URL(document.location).searchParams;
loadUserNotes(params.get("user"), params.get("start"), params.get("end"));
