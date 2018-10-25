// How long ago to look for log messages.
var LOOKBACK_SECONDS = 60 * 60 * 24 * 7 * 4; // 4 weeks

var ERA_SECONDS = 1000000;

var DOM = {
    create(tag, attrs = {}) {
        const node = document.createElement(tag);
        for (const [name, value] of Object.entries(attrs)) {
            node.setAttribute(name, value);
        }
        return node;
    },
    createText(...args) {
        return document.createTextNode(...args);
    },
    byId(id) {
        return document.getElementById(id);
    },
    clearChildren(node) {
        var n;
        while (n = node.lastChild) {
            node.removeChild(n);
        }
    }
};

var $HEADER = DOM.byId('header');
var $LIST = DOM.byId('thelist');

var urls = {
    logbot(channel, when, user) {
        return `http://mozilla.logbot.info/${channel}/link/${when}/${user}`;
    },
    edit(user, era) {
        return `https://github.com/mrgiggles/histoire/edit/master/users/${user}/${user}.${era}.txt`;
    },
    data(user, era) {
        return `https://raw.githubusercontent.com/mrgiggles/histoire/master/users/${user}/${user}.${era}.txt`;
    },
    bug(bugNumber) {
        return `https://bugzilla.mozilla.org/show_bug.cgi?id=${bugNumber}`;
    }
}

function addItems(rawText, era, user, start, end) {
    const eraNode = DOM.byId("era" + era);

    const addItem = (when, message, channel) => {
        const when_str = (new Date(when * 1000)).toLocaleString();

        const item = DOM.create("li");
        if (channel.startsWith("#")) {
            let link = urls.logbot(channel.substr(1), when, user);
            const ahref = DOM.create("a", {href: link});
            ahref.textContent = when_str;
            item.appendChild(ahref);
        } else {
            const text = DOM.createText(`${when_str}`);
            item.appendChild(text);
        }

        // Let's try to find bug numbers.
        let matchBugNumber = message.match(/bug (\d+)/);
        if (matchBugNumber !== null) {
            let [matched, bugNumber] = matchBugNumber;
            let beforeText = message.substr(0, message.indexOf(matched));
            let afterText = message.substr(message.indexOf(matched) + matched.length, message.length);

            item.appendChild(DOM.createText(` - ${beforeText}`));

            let link = DOM.create("a", {href: urls.bug(bugNumber)});
            link.textContent = matched;
            item.appendChild(link);

            item.appendChild(DOM.createText(` ${afterText}`));
        } else {
            const text = DOM.createText(` - ${message}`);
            item.appendChild(text);
        }

        item.appendChild(DOM.createText(" "));
        const edit = DOM.create("a", {href: urls.edit(user, era), target: "_blank"});
        edit.appendChild(DOM.create("img", {src: "icons/edit.png", height: 10}));
        item.appendChild(edit);

        eraNode.appendChild(item);
    };

    for (const line of rawText.split("\n")) {
        if (line == "") {
            continue;
        }
        const [_, when, channel, message] = line.match(/^(\S+) (\S+) (.*)/);
        if (when < start || when > end) {
            continue;
        }
        addItem(when, message, channel);
    }
}

function dataLoaded(xhr, era, user, start, end, info) {
    info.sofar++;

    // 404 is ok; there might not be any entries for that time range.
    if (xhr.status != 404) {
        info.found++;
        addItems(xhr.responseText, era, user, start, end);
    }

    if (info.sofar < info.total) {
        return;
    }

    // All attempted data is loaded.

    if (info.found == 0) {
        $HEADER.textContent = "No updates found!";
        return;
    }

    const start_str = (new Date(start * 1000)).toLocaleString();
    const end_str = (new Date(end * 1000)).toLocaleString();
    $HEADER.textContent = `Updates for ${user} from ${start_str} to ${end_str}`;
}

function loadNotes(user, era, start, end, info) {
    // index.html and index.js are loaded through rawgit.com, which routes them
    // through a CDN that caches aggressively. That doesn't work for the data
    // files, which are expected to be updated frequently. So we go through
    // github directly for those -- but note, not the /raw/ URL, since that
    // does not allow CORS, but the raw.githubusercontent.com link.

    const xhr = new XMLHttpRequest();
    xhr.responseType = 'text';
    xhr.addEventListener('load', ev => dataLoaded(xhr, era, user, start, end, info));
    xhr.open("GET", urls.data(user, era));

    return xhr;
}

function computeEra(time_sec) {
    return time_sec - (time_sec % ERA_SECONDS);
}

function loadUserNotes(user, start, end) {
    if (!user) {
        $HEADER.textContent = "No user specified!";
        return;
    }

    if (!end) {
        end = Date.now() / 1000; // ms -> sec
    }
    if (!start) {
        start = end - LOOKBACK_SECONDS;
    }

    let total = 0;
    for (let t = computeEra(start); t <= computeEra(end); t += ERA_SECONDS) {
        total++;
    }

    const info = {
        total,
        sofar: 0,
        found: 0
    };

    DOM.clearChildren($LIST);

    for (let era = computeEra(end); era >= computeEra(start); era -= ERA_SECONDS) {
        $LIST.appendChild(DOM.create("span", {id: "era" + era}));
        loadNotes(user, era, start, end, info).send();
    }
}

var params = new URL(document.location).searchParams;
var user = params.get("user");
loadUserNotes(user, params.get("start"), params.get("end"));
