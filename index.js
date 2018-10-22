// How long ago to look for log messages.
var LOOKBACK_SECONDS = 60 * 60 * 24 * 7 * 4; // 4 weeks

// FIXME! This always appends at the end. If we're loading multiple chunks, we
// want them inserted in order.
function addItems(rawText, era, user, start, end) {
    const eraNode = document.getElementById("era" + era);

    const addItem = (when, message, link) => {
        const item = document.createElement("li");
        if (link) {
            const ahref = document.createElement("a");
            ahref.setAttribute("href", link);
            ahref.textContent = when;
            item.appendChild(ahref);
            const text = document.createTextNode(` - ${message}`);
            item.appendChild(text);
        } else {
            const text = document.createTextNode(`${when} - ${message}`);
            item.appendChild(text);
        }
        eraNode.appendChild(item);
    };

    for (const line of rawText.split("\n")) {
        if (line == "")
            continue;
        const [_, when, channel, message] = line.match(/^(\S+) (\S+) (.*)/);
        if (when < start || when > end)
            continue;
        const when_str = (new Date(when * 1000)).toLocaleString();
        if (channel.startsWith("#"))
            addItem(when_str, message, `http://mozilla.logbot.info/${channel.substr(1)}/link/${when}/${user}`);
        else
            addItem(when_str, message);
    }
}

function dataLoaded(xhr, when, user, start, end, info) {
    info.sofar++;

    // 404 is ok; there might not be any entries for that time range.
    if (xhr.status != 404) {
        info.found++;
        addItems(xhr.responseText, when, user, start, end);
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

    const start_str = (new Date(start * 1000)).toLocaleString();
    const end_str = (new Date(end * 1000)).toLocaleString();
    header.textContent = `Updates for ${user} from ${start_str} to ${end_str}`;
}

function clearNode(node) {
    var n;
    while (n = node.lastChild)
        node.removeChild(n);
}

function loadNotes(user, when, start, end, info) {
    // index.html and index.js are loaded through rawgit.com, which routes them
    // through a CDN that caches aggressively. That doesn't work for the data
    // files, which are expected to be updated frequently. So we go through
    // github directly for those -- but note, not the /raw/ URL, since that
    // does not allow CORS, but the raw.githubusercontent.com link.

    const xhr = new XMLHttpRequest();
    xhr.responseType = 'text';
    xhr.addEventListener('load', ev => dataLoaded(xhr, when, user, start, end, info));
    xhr.open("GET", `https://raw.githubusercontent.com/mrgiggles/histoire/master/users/${user}/${user}.${when}.txt`);

    return xhr;
}

var eraSeconds = 1000000;

function computeEra(time_sec) {
    return time_sec - (time_sec % eraSeconds);
}

function loadUserNotes(user, start, end) {
    if (!end)
        end = Date.now() / 1000; // ms -> sec
    if (!start)
        start = end - LOOKBACK_SECONDS;

    let total = 0;
    for (let t = computeEra(start); t <= computeEra(end); t += eraSeconds)
        total++;

    const info = {
        total,
        'sofar': 0,
        'found': 0
    };

    const list = document.getElementById("thelist");
    clearNode(list);
    const queries = [];
    for (let t = computeEra(start); t <= computeEra(end); t += eraSeconds) {
        const span = document.createElement("span");
        span.id = "era" + t;
        list.appendChild(span);
        queries.push(loadNotes(user, t, start, end, info));
    }
    for (const xhr of queries)
        xhr.send();
}


var params = new URL(document.location).searchParams;
var user = params.get("user");
loadUserNotes(user, params.get("start"), params.get("end"));
