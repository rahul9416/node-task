const mongoose = require('mongoose');
const { Schema } = require('mongoose')

const teamSchema = new Schema({
    uid: {
        type: String,
        required: true,
        min:3,
        unique: true
    },
    teamName: {
        type: String,
        required: true,
        min:3,
    },
    playersList: {
        type: [String],
        required: true,
    },
    captain: {
        type: String,
        required: true,
    },
    viceCaptain: {
        type: String,
        required: true,
    },
    totalPoints: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("players", teamSchema);