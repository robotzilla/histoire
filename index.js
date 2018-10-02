// FIXME! This always appends at the end. If we're loading multiple chunks, we
// want them inserted in order.
function addItems(rawText, start, end) {
    const list = document.getElementById("thelist");

    const addItem = line => {
        const item = document.createElement("li");
        const text = document.createTextNode(line);
        item.appendChild(text);
        list.appendChild(item);
    };

    for (const line of rawText.split("\n")) {
        if (line == "")
            continue;
        const [when, message] = line.split(" ", 1);
        if (when < start || when > end)
            continue;
        addItem((new Date(when * 1000)).toLocaleString() + " - " + line);
    }
}

function dataLoaded(xhr, start, end, info) {
    info.sofar++;

    // 404 is ok; there might not be any entries for that time range.
    if (xhr.status != 404) {
        info.found++;
        addItems(xhr.responseText, start, end);
    }

    if (info.sofar < info.total)
        return;

    // All attempted data is loaded.

    var header = document.getElementById("header");

    if (info.found == 0) {
        var header = document.getElementById("header");
        header.textContent = "No updates found!";
    } else {
        header.textContent = "Updates for " + user;
    }
}

function loadNotes(user, when, start, end, info) {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', ev => dataLoaded(xhr, start, end, info));
    //xhr.open("GET", `users/${user}/${user}.${when}.txt`);
    xhr.open("GET", `https://cors.io/?u=https://github.com/mrgiggles/histoire/blob/master/users/${user}/${user}.${when}.txt`);
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
    let count = 0;
    for (let t = computeEra(start); t <= computeEra(end); t += eraSeconds)
        count++;

    const info = {
        'total': count,
        'sofar': 0,
        'found': 0
    };
    for (let t = computeEra(start); t <= computeEra(end); t += eraSeconds)
        loadNotes(user, t, start, end, info);
}

var params = new URL(document.location).searchParams;
var user = params.get("user");
loadUserNotes(user, params.get("start"), params.get("end"));
