const fs = require('fs');

const URL = "https://script.google.com/macros/s/AKfycbwK4kznBvjgn98YQGYH18JRsyxMJ-nvSAOFviwZcsurVtqbLteE6HN4gN0wCw8gUCFxbw/exec";

async function run() {
    console.log("Fetching listSalesPoints...");
    try {
        const res = await fetch(URL, {
            method: "POST",
            body: JSON.stringify({ action: "listSalesPoints" })
        });
        const json = await res.json();

        let points = [];
        if (json.points) points = json.points;
        else if (json.data && json.data.points) points = json.data.points;
        else if (Array.isArray(json)) points = json;

        console.log("Total Points:", points.length);

        const ar = points.find(p => JSON.stringify(p).includes("AR ELEKTRİK") || JSON.stringify(p).includes("Ar Elektrik"));
        const otp = points.find(p => JSON.stringify(p).includes("OTP") || JSON.stringify(p).includes("Otp"));

        const dump = {
            AR_ELEKTRIK: ar || "Not Found",
            OTP_PANO: otp || "Not Found",
            SAMPLE_HEAD: points.slice(0, 3)
        };

        console.log(JSON.stringify(dump, null, 2));
        fs.writeFileSync('debug-comparison.txt', JSON.stringify(dump, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
