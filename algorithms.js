import puppeteer from "puppeteer";
import { resultList } from "./lexicon.js";

/*
TODO
- fix match finding in recent-match
- 
*/

// algorithm 1
async function searchStanding(page, obj) {
    if(!("team" in obj)) {
        console.error("ERROR: undefined teamName");
    }

    let found = false;

    // filter leagues
    if(obj.league === "Premier League") {
        await scrape("https://www.bbc.com/sport/football/premier-league/table", obj.league);
    } else if (obj.league === "La Liga") {
        await scrape("https://www.bbc.com/sport/football/spanish-la-liga/table", obj.league);
    } else if (obj.league === "German Bundesliga") {
        await scrape("https://www.bbc.com/sport/football/german-bundesliga/table", obj.league);
    } else if (!obj.league) {  // for when league isn't specified, including undefined/""/doesn't exist. works better than !("league" in obj).
        await scrape("https://www.bbc.com/sport/football/premier-league/table", "Premier League");
        
        // divide each goto into one per if statement to avoid clashing
        if (found === false) {
            await timeout(500);        
            await scrape("https://www.bbc.com/sport/football/spanish-la-liga/table", "La Liga");
        }

        if (found === false) {
            await timeout(500);
            await scrape("https://www.bbc.com/sport/football/german-bundesliga/table", "German Bundesliga");
        }

        if (found === false) {
            console.log(`${obj.team} isn't on Premier League, La Liga, or German Bundesliga.`);
        }
    } else {
        console.error("ERROR: unrecognized league name");
    }

    async function scrape(url, leagueResult) {
        await page.goto(url, { waitUntil: "networkidle2"});
        const teams = await page.$$eval("tr[class*='CellsRow']", rows => {
            return rows.map(row => {
                const rank = row.querySelector("span.ssrcss-4fgj5b-Rank")?.textContent.trim();

                // Try aria-hidden first, fallback to visually-hidden
                // fix 2: try visually-hidden, fallback to aria-hidden
                let name = row.querySelector("span.visually-hidden")?.innerText.trim(); 
                if (!name) {
                    name = row.querySelector("span[aria-hidden='true'][data-600]")?.getAttribute("data-600")?.trim();
                }
                return { rank, name };
            });
        });

        const targetTeam = teams.find(t => t.name?.toLowerCase() === obj.team.toLowerCase());

        if(targetTeam) {
            console.log(`${obj.team} is currently in position ${targetTeam.rank} on ${leagueResult}.`);
            found = true;
        }  // no need to close page; index.js does it already
    }

    async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// algorithm 2
async function recentMatch(page, obj) {
    if(!("team" in obj)) {
        console.error("ERROR: undefined teamName");
    }

    let found = false;

    if (found === false) {
            await timeout(500);        
            await scrape("https://www.bbc.com/sport/football/spanish-la-liga/table", "La Liga");
    }

    if (found === false) {
        await timeout(500);
        await scrape("https://www.bbc.com/sport/football/german-bundesliga/table", "German Bundesliga");
    }

    if (found === false) {
        console.log(`${obj.team} isn't on Premier League, La Liga, or German Bundesliga.`);
    }

    async function scrape(url, leagueResult) {
        await page.goto(url, { waitUntil: "networkidle2"});
        const teams = await page.$$eval("tr[class*='CellsRow']", rows => {
            return rows.map(row => {
                // select all <li> items per team; three possible class names
                // https://github.com/puppeteer/puppeteer/issues/489 
                // documentation: https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll 
                const matches = row.querySelectorAll("div.ssrcss-86dwvw-LetterContainer, div.ssrcss-1xnub2-LetterContainer, div.ssrcss-1d0kmun-letterContainer")?.textContent.trim();
                const raw = matches[5];
                const result = resultList[raw];

                // Try aria-hidden first, fallback to visually-hidden
                // fix 2: try visually-hidden, fallback to aria-hidden
                let name = row.querySelector("span.visually-hidden")?.innerText.trim(); 
                if (!name) {
                    name = row.querySelector("span[aria-hidden='true'][data-600]")?.getAttribute("data-600")?.trim();
                }
                return { result, name };
            });
        });

        const targetTeam = teams.find(t => t.name?.toLowerCase() === obj.team.toLowerCase());

        if(targetTeam) {
            console.log(`${obj.team}'s most recent game at ${leagueResult} with /team/ was a ${targetTeam.result}.`);
            if (result === 'W') {
                console.log("congratulations!");
            }
            found = true;
        }  // no need to close page; index.js does it already
    }

    async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export {searchStanding, recentMatch};
