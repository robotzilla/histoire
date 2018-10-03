// FIXME! This always appends at the end. If we're loading multiple chunks, we
// want them inserted in order.
function addItems(rawText, user, start, end) {
    const list = document.getElementById("thelist");

    const addItem = (line, link) => {
        const item = document.createElement("li");
        const text = document.createTextNode(line);
        if (link) {
            const ahref = document.createElement("a");
            ahref.setAttribute("href", link);
            ahref.appendChild(text);
            item.appendChild(ahref);
        } else {
            item.appendChild(text);
        }
        list.appendChild(item);
    };

    for (const line of rawText.split("\n")) {
        if (line == "")
            continue;
        const [_, when, channel, message] = line.match(/^(\S+) (\S+) (.*)/);
        if (when < start || when > end)
            continue;
        const info = (new Date(when * 1000)).toLocaleString() + " - " + message;
        if (channel.startsWith("#"))
            addItem(info, `http://logs.glob.uno/?a=link_to&c=${channel}&n=${user}&t=${when}`);
        else
            addItem(info);
    }
}

function dataLoaded(xhr, user, start, end, info) {
    info.sofar++;

    console.log("fetched, status = " + xhr.status);

    // 404 is ok; there might not be any entries for that time range.
    if (xhr.status != 404) {
        info.found++;
        addItems(xhr.responseText, user, start, end);
    }

    if (info.sofar < info.total)
        return;

    // All attempted data is loaded.

    var header = document.getElementById("header");

    if (info.found == 0) {
        var header = document.getElementById("header");
        header.textContent = "No updates found!";
        return;
    }

    const start_str = (new Date(start)).toLocaleString();
    const end_str = (new Date(end)).toLocaleString();
    header.textContent = `Updates for ${user} from ${start_str} to ${end_str}`;
}

function loadNotes(user, when, start, end, info) {
    // index.html and index.js are loaded through rawgit.com, which routes them
    // through a CDN that caches aggressively. That doesn't work for the data
    // files, which are expected to be updated frequently. So we go through
    // github directly for those -- but note, not the /raw/ URL, since that
    // does not allow CORS, but the raw.githubusercontent.com link.

    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', ev => dataLoaded(xhr, user, start, end, info));
    xhr.open("GET", `https://raw.githubusercontent.com/mrgiggles/histoire/master/users/${user}/${user}.${when}.txt`);
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
    let total = 0;
    for (let t = computeEra(start); t <= computeEra(end); t += eraSeconds)
        total++;

    const info = {
        total,
        'sofar': 0,
        'found': 0
    };
    for (let t = computeEra(start); t <= computeEra(end); t += eraSeconds)
        loadNotes(user, t, start, end, info);
}

var params = new URL(document.location).searchParams;
var user = params.get("user");
loadUserNotes(user, params.get("start"), params.get("end"));
