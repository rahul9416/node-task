const players = require("../data/players.json")
const match = require("../data/match.json")

// Function to validate if selected Team is according to the defined rules
module.exports.validateTeam = (teamData) => {
    try {
        if (teamData.teamName === '') return { status: "error", message: "Team Name can not be empty" }
        if (teamData.captain === '') return { status: "error", message: "Please select your captain" }
        if (teamData.viceCaptain === '') return { status: "error", message: "Please select your vice captain" }
        if (teamData.playersList.length !== 11) return { status: "error", message: "You have to select 11 players in a team" }

        const teamFormation = {
            totalBatsman: 0,
            totalBowlers: 0,
            totalAllrounders: 0,
            totalWicketKeepers: 0,
            totalPlayersFromCSK: 0,
            totalPlayersFromRR: 0
        }

        teamData.playersList.forEach((player) => {
            const info = players.find((pla) => pla.Player === player)

            if (!info) throw Error(`${player} Player Not found`)

            if (info.Team === "Chennai Super Kings") teamFormation.totalPlayersFromCSK++;
            else teamFormation.totalPlayersFromRR++;

            if (info.Role === "BATTER") teamFormation.totalBatsman++;
            else if (info.Role === "ALL-ROUNDER") teamFormation.totalAllrounders++;
            else if (info.Role === "BOWLER") teamFormation.totalBowlers++;
            else teamFormation.totalWicketKeepers++;
        });

        if (teamFormation.totalPlayersFromCSK > 10 || teamFormation.totalPlayersFromRR > 10) return { status: "error", message: "You cannot select more than 10 players from a single team" }
        if (teamFormation.totalBatsman < 1) return { status: "error", message: "You have to select atleast 1 Batsman" }
        if (teamFormation.totalBatsman > 8) return { status: "error", message: "You can select maximum 8 Batsman" }
        if (teamFormation.totalBowlers < 1) return { status: "error", message: "You have to select atleast 1 Bowlers" }
        if (teamFormation.totalBowlers > 8) return { status: "error", message: "You can select maximum 8 Bowlers" }
        if (teamFormation.totalAllrounders < 1) return { status: "error", message: "You have to select atleast 1 All-Rounders" }
        if (teamFormation.totalAllrounders > 8) return { status: "error", message: "You can select maximum 8 All-Rounders" }
        if (teamFormation.totalWicketKeepers < 1) return { status: "error", message: "You have to select atleast 1 Wicker-Keepers" }
        if (teamFormation.totalWicketKeepers > 8) return { status: "error", message: "You can select maximum 8 Wicker-Keepers" }

        return { status: "success" }

    } catch (error) {
        console.log(error)
        return { status: "error", message: error.toString() }
    }
}

// Function to process the match results on selected teams
module.exports.processResults = (allTeams) => {
    try {
        const teamTotals = {}
        allTeams.forEach((team) => {
            const playersList = team.playersList
            const processedList = {}
            playersList.forEach((playerName) => {
                processedList[playerName] = {
                    batting: {totalPoints: 0, totalScore: 0},
                    bowling: {totalPoints: 0, totalWickets: 0},
                    fielding: {totalPoints: 0, totalCatches: 0}
                }
            })

            const maidenDetails = {}

            // Process the match and update points accordingly
            match.forEach((liveFeed) => {
                // Calculating points for a batsman
                if (playersList.includes(liveFeed.batter)) {
                    let scoreToBeAdded = 0
                    processedList[liveFeed.batter].batting.totalScore += liveFeed.batsman_run
                    if (liveFeed.batsman_run > 0) {
                        scoreToBeAdded += 1
                        if (liveFeed.batsman_run === 4) scoreToBeAdded += 1
                        else if (liveFeed.batsman_run === 6) scoreToBeAdded += 2
                    } 
                    processedList[liveFeed.batter].batting.totalPoints += scoreToBeAdded
                }
                if (liveFeed.isWicketDelivery > 0) {
                    // Calculating points for a bowler
                    if (playersList.includes(liveFeed.bowler)) {
                        let scoreToBeAdded = 0
                        processedList[liveFeed.bowler].bowling.totalWickets += 1
                        if (liveFeed.kind !== "run out") scoreToBeAdded += 25
                        else if (["lbw", "bowled"].includes(liveFeed.kind)) scoreToBeAdded += 8
                        else if (liveFeed.kind === "caught and bowled") { 
                            processedList[liveFeed.bowler].fielding.totalPoints += 8
                            processedList[liveFeed.bowler].fielding.totalCatches += 1
                        }
                        processedList[liveFeed.bowler].bowling.totalPoints += scoreToBeAdded
                    }
                    // Calculating points for a fielder
                    if (playersList.includes(liveFeed.fielders_involved)) {
                        const playerInfo = players.find((player) => player.Player === liveFeed.fielders_involved)
                        if (liveFeed.kind === "caught") {
                            processedList[liveFeed.fielders_involved].fielding.totalCatches += 1
                            processedList[liveFeed.fielders_involved].fielding.totalPoints += 8
                            if (playerInfo.Role === "WICKETKEEPER") processedList[liveFeed.fielders_involved].fielding.totalPoints += 4
                        } 
                        if (liveFeed.kind === "run out") {
                            processedList[liveFeed.fielders_involved].fielding.totalPoints += 6
                        }
                    }
                } 

                // If player gets out on a duck
                if (playersList.includes(liveFeed.player_out) && processedList[liveFeed.player_out].batting.totalScore === 0) {
                    const playerInfo = players.find((player) => player.Player === liveFeed.fielders_involved)
                    if (["Batter", "Wicket-Keeper", "All-Rounder"].includes(playerInfo.Role))
                    processedList[liveFeed.player_out].batting.totalPoints -= 2
                }

                // Check for a maiden over
                if (liveFeed.ballnumber === 1) maidenDetails[liveFeed.bowler] = 0
                if (liveFeed.total_run === 0) maidenDetails[liveFeed.bowler] += 1
                if (liveFeed.ballnumber === 6) {
                if (maidenDetails[liveFeed.bowler] === 6) { processedList[liveFeed.bowler].bowling.totalPoints += 12}
                    maidenDetails[liveFeed.bowler] = 0
                }
            })

            const pointedTeamList = {}
            
            // Calculating bonus points
            Object.keys(processedList).forEach((player) => {
                if (processedList[player].batting.totalScore >= 100) processedList[player].batting.totalPoints += 16
                else if (processedList[player].batting.totalScore >= 50) processedList[player].batting.totalPoints += 8
                else if (processedList[player].batting.totalScore >= 30) processedList[player].batting.totalPoints += 4 
                if (processedList[player].bowling.totalWickets >= 5) processedList[player].bowling.totalPoints += 16 
                else if (processedList[player].bowling.totalWickets === 4) processedList[player].bowling.totalWickets += 8
                else if (processedList[player].bowling.totalWickets === 3) processedList[player].bowling.totalPoints += 4 
                if (processedList[player].fielding.totalCatches >= 3) processedList[player].fielding.totalPoints += 4
                pointedTeamList[player] = processedList[player].batting.totalPoints + processedList[player].bowling.totalPoints + processedList[player].fielding.totalPoints
            })

            // Calculating 2x and 1.5x for captain and vice-captain respectively
            pointedTeamList[team.captain] *= 2
            pointedTeamList[team.viceCaptain] *= 1.5
            
            // Calculating total teams aggregated points
            let totalAggregatedPoints = 0
            Object.values(pointedTeamList).forEach((points) => {
                totalAggregatedPoints += points
            })

            teamTotals[team.uid] = totalAggregatedPoints
            
        })
        
        return teamTotals
    } catch (error) {
        return { status: "error", "message": error }
    }
}

// Function to process winning team results
module.exports.teamResults = (allTeams) => {
    try {
        allTeams.sort((teamA, teamB) => teamB.totalPoints - teamA.totalPoints)
        const winningScore = allTeams[0].totalPoints
        const winningTeams = allTeams.filter((team) => team.totalPoints === winningScore )
        return winningTeams
    } catch (error) {
        return { status: "error", "message": error }
    }
}