// const fetch = require('node-fetch'); // Native fetch in Node 18+

const URL = "https://script.google.com/macros/s/AKfycbwK4kznBvjgn98YQGYH18JRsyxMJ-nvSAOFviwZcsurVtqbLteE6HN4gN0wCw8gUCFxbw/exec";

async function run() {
    console.log("Fetching listSalesPoints...");
    try {
        const res = await fetch(URL, {
            method: "POST",
            body: JSON.stringify({ action: "listSalesPoints" })
        });
        const text = await res.text();
        // console.log("Raw Text:", text.substring(0, 500) + "...");
        const json = JSON.parse(text);

        let points = [];
        if (json.points) points = json.points;
        else if (json.data && json.data.points) points = json.data.points;
        else if (Array.isArray(json)) points = json;

        console.log("Total Points:", points.length);
        const fs = require('fs');
        if (points.length > 0) {
            const keys = Object.keys(points[0]);
            console.log("Keys:", keys);
            fs.writeFileSync('debug-output.txt', JSON.stringify({
                keys: keys,
                sample: points[0]
            }, null, 2));
        } else {
            console.log("No points found.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
