import puppeteer from "puppeteer";
import { resultList } from "./lexicon.js";

/*
TODO:
- debug undefined fixture and opponent 
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

    const date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let formatted = `${year}-${month}`;
    const team = obj.team;
    const teamurl = team.replace(" ", "-").toLowerCase();
    let intelurl = `https://www.bbc.com/sport/football/teams/${teamurl}/scores-fixtures/${formatted}?filter=results`;

    let time = {
        year: year,
        month: month,
        formatted: formatted,
        intelurl: intelurl,
    };

    let intel = {
        date: "",
        opponent: "",
        fixture: ""
    };

    let found = false;

    if(obj.league === "Premier League") {           
        await scrapeResult("https://www.bbc.com/sport/football/premier-league/table", time, intel, obj.league, scrapeIntel);
    } else if (obj.league === "La Liga") {
        await scrapeResult("https://www.bbc.com/sport/football/spanish-la-liga/table", time, intel, obj.league, scrapeIntel);
    } else if (obj.league === "German Bundesliga") {
        await scrapeResult("https://www.bbc.com/sport/football/german-bundesliga/table", time, intel, obj.league, scrapeIntel);
    } else if (!obj.league) { 
        await scrapeResult("https://www.bbc.com/sport/football/premier-league/table", time, intel, "Premier League", scrapeIntel);
        
        if (found === false) {
            await timeout(500);        
            await scrapeResult("https://www.bbc.com/sport/football/spanish-la-liga/table", time, intel, "La Liga", scrapeIntel);
        }

        if (found === false) {
            await timeout(500);
            await scrapeResult("https://www.bbc.com/sport/football/german-bundesliga/table", time, intel, "German Bundesliga", scrapeIntel);
        }

        if (found === false) {
            console.log(`${obj.team} isn't on Premier League, La Liga, or German Bundesliga.`);
        }
    } else {
        console.error("ERROR: unrecognized league name");
    }

    // mutual recursion 
    async function updateUrl(time) {
        time.month -= 1;
        if (time.month === 0) {
            time.year -= 1;
            time.month = 12;
        }

        time.formatted = `${time.year}-${time.month}`;
        const team = obj.team;
        const teamurl = team.replace(" ", "-").toLowerCase();                             
        time.intelurl = `https://www.bbc.com/sport/football/teams/${teamurl}/scores-fixtures/${time.formatted}`;

        scrapeIntel(time, leagueResult);
    }

    // scrape algorithm 1
    async function scrapeIntel(time, intel, leagueResult) {
        await page.goto(time.intelurl, {waitUntil: "networkidle2"});
        await page.$$eval("div.ssrcss-7k0bq5-HeaderWrapper", rows => {      // debug: pinpointed issue. type error: cannot read properties of null (reading 'queryselector')
            return rows.map(row => {                                        // research: how is it a map?  
                const league = row.querySelector("h3.ssrcss-137b0q4-SecondaryHeading")?.textContent.trim();     
                if (league != leagueResult) {
                    updateUrl(time);
                }
            });
        });

        let find = false;

        const intelsearch = await page.$$eval("div.ssrcss-1bjtunb-GridContainer", rows => {
            return rows.map(row => { 
                let inteldate = row.querySelector("h2.ssrcss-12l0oeb-GroupHeader")?.textContent.trim().toLowerCase();

                if (inteldate) {                // test 1 (nov 13)
                    find = true;
                } else {
                    inteldate = "what";
                }

                var home = row.querySelector("div.ssrcss-bon2fo-WithInLineFallBack-TeamHome");
                const hometeam = home.querySelector("span.ssrcss-1p14tic-DesktopValue")?.textContent.trim();
                var away = row.querySelector("div.ssrcss-nvj22c-WithInLineFallBack-TeamAway");
                const awayteam = away.querySelector("span.ssrcss-1p14tic-DesktopValue")?.textContent.trim();

                const homescore = row.querySelector("div.ssrcss-qsbptj-HomeScore")?.textContent.trim();
                const awayscore = row.querySelector("div.ssrcss-fri5a2-AwayScore")?.textContent.trim();
                
                let intelfixture = "${homescore} to ${awayscore}";
                let intelopp = hometeam;
                if(hometeam === obj.team) {
                    intelfixture = "${awayscore} to ${homescore}";
                    intelopp = awayteam;
                }

                console.log(inteldate);

                return {inteldate, intelopp, intelfixture, find};
            })
        })

        intel.date = intelsearch.inteldate;             // debug: both intelsearch.inteldate and intel.date are undefined?
        intel.opponent = intelsearch.intelopp;
        intel.fixture = intelsearch.intelfixture;
        intel.date = "helooo";                          // test 2 result: scrapeIntel successfully passes intel values to the end, but scrape is unsuccessful
        
        console.log(find);                              // test 1 (nov 13)

        return {intel};
    };

    // scrape algorithm 2
    async function scrapeResult(url, time, intel, leagueResult, scrapeIntel) {
        await scrapeIntel(time, intel, leagueResult);
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
        
        let status = "won";
        if(targetTeam.result === "draw") {
            status = "tied";
        } else if(targetTeam.result === "loss") {
            status = "lost";
        }

        if(targetTeam) {
            console.log(`${obj.team}'s most recent game (${intel.date}) at ${leagueResult} was a ${targetTeam.result}.`);
            console.log(`They ${status} ${intel.fixture} against ${intel.opponent}.`);                                               // debug: undefined fixture and opp
            if (targetTeam.result === 'win') {
                console.log("congratulations!");
            }
            found = true;
        } 
    }

    async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

export {searchStanding, recentMatch};
