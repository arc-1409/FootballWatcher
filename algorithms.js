import puppeteer from "puppeteer";
import { resultList } from "./lexicon.js";

/*
TODO
- add recent match opponent & fixture
- should recent-match return the most recent match, regardless of league, if there is no specified league?
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

    /*
    1. extract obj.team 
    2. get current year-month pair in this format: 2025-11
    3. add obj.team to this url: https://www.bbc.com/sport/football/teams/arsenal/scores-fixtures/2025-11?filter=results
    4. search for Premier League, La Liga, etc
    5. search 2025-10, then 2025-09, until there is a most recent match in these specified leagues
    6. find and output fixture, opponent, league, and match date
    */

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const urlmonth = `${year}-${month}`;
    const intelurl = "https://www.bbc.com/sport/football/teams/${obj.team}/scores-fixtures/${urlmonth}?filter=results";

    let found = false;

    if(obj.league === "Premier League") {
        await scrapeIntel(url, obj.league);
        await scrapeResult("https://www.bbc.com/sport/football/premier-league/table", obj.league);
    } else if (obj.league === "La Liga") {
                await scrapeIntel(url, obj.league);
        await scrapeIntel(url, obj.league);
        await scrapeResult("https://www.bbc.com/sport/football/spanish-la-liga/table", obj.league);
    } else if (obj.league === "German Bundesliga") {
        await scrapeIntel(url, obj.league);
        await scrapeResult("https://www.bbc.com/sport/football/german-bundesliga/table", obj.league);
    } else if (!obj.league) { 
        await scrapeIntel(url, "Premier League");
        await scrapeResult("https://www.bbc.com/sport/football/premier-league/table", "Premier League");
        
        if (found === false) {
            await timeout(500);        
            await scrapeIntel(url, "La Liga");
            await scrapeResult("https://www.bbc.com/sport/football/spanish-la-liga/table", "La Liga");
        }

        if (found === false) {
            await timeout(500);
            await scrapeIntel(url, "German Bundesliga");
            await scrapeResult("https://www.bbc.com/sport/football/german-bundesliga/table", "German Bundesliga");
        }

        if (found === false) {
            console.log(`${obj.team} isn't on Premier League, La Liga, or German Bundesliga.`);
        }
    } else {
        console.error("ERROR: unrecognized league name");
    }

    // scrape algorithm 1
    async function scrapeIntel(url, leagueResult) {
        await page.goto(url, {waitUntil: "networkidle2"});

        const intel = {
            date: inteldate,
            opponent: intelopp,
            fixture: intelfix
        };
    }

    // scrape algorithm 2
    async function scrapeResult(url, leagueResult) {
        await page.goto(url, { waitUntil: "networkidle2"});
        const teams = await page.$$eval("tr[class*='CellsRow']", rows => {
            return rows.map(row => {
                const resultArray = [];
                row.querySelectorAll("div.e1ey8v0w0 > span").forEach((el) => {
                    resultArray.push(el.textContent);
                });

                let result = "win";
                if(resultArray[5] === "Result Loss") {
                    result = 'loss';
                } else if (resultArray[5] === "Result Draw") {
                    result = 'draw';
                }
                

                let name = row.querySelector("span.visually-hidden")?.innerText.trim(); 
                if (!name) {
                    name = row.querySelector("span[aria-hidden='true'][data-600]")?.getAttribute("data-600")?.trim();
                }
                return { result, name };
            });
        });
        
        const targetTeam = teams.find(t => t.name?.toLowerCase() === obj.team.toLowerCase());

        if(targetTeam) {
            console.log(`${obj.team}'s most recent game at ${leagueResult} was a ${targetTeam.result}.`);
            if (targetTeam.result === 'win') {
                console.log("congratulations!");
            }
            found = true;
        } 
    }

    async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export {searchStanding, recentMatch};
