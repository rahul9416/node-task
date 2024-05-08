const express = require('express');
const app = express();
const port = 3000;
require("dotenv").config();
const { validateTeam, processResults, teamResults } = require("./helpers/helper")
const uuid = require("uuid")
const mongoose = require("mongoose");
const Teams = require("./models/matchModel")

// Database Details
const DB_USER = process.env.DB_USER;
const DB_PWD = process.env.DB_PWD;
const DB_URL = process.env.DB_URL;
const DB_NAME = "task-jeff";
const DB_COLLECTION_NAME = "players";

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://" + DB_USER + ":" + DB_PWD + "@" + DB_URL + "/" + DB_NAME + "?retryWrites=true&w=majority";

app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

async function run() {
  try {
    await mongoose.connect(uri)
    console.log("You successfully connected to MongoDB!");

  } finally {
  }
}


// Sample create document
async function sampleCreate() {
  const demo_doc = {
    "demo": "doc demo",
    "hello": "world"
  };
  const demo_create = await db.collection(DB_COLLECTION_NAME).insertOne(demo_doc);

  console.log("Added!")
  console.log(demo_create.insertedId);
}


// Endpoints

app.get('/', async (req, res) => {
  res.send('Hello World!');
});

app.get('/demo', async (req, res) => {
  await sampleCreate();
  res.send({ status: 1, message: "demo" });
});

app.post('/add-team', async (req, res) => {
  try {
    const teamDetails = req.body;
    const validation = validateTeam(teamDetails)
    if (validation.status === "success") {
      const id = uuid.v4()
      const postData = {
        uid: id,
        ...teamDetails
      }
      await Teams.create(postData)
      return res.json({ status: "success", message: "Team Added Successfully" })
    }
    return res.json(validation)
  } catch (error) {
    return res.json(error.toString())
  }
})

app.get('/process-result', async (req, res) => {
  try {
    const allTeams = await Teams.find({}).select([ "_id", "uid", "teamName", "playersList", "captain", "viceCaptain"])
    const result = processResults(allTeams)
    Object.keys(result).forEach(async (uids) => {
      const prev = allTeams.find((team) => team.uid === uids)
      prev["totalPoints"] = result[uids]
      await Teams.findByIdAndUpdate(prev._id, {$set: prev}, {new: true})
    })
    return res.json({status: "success", message: "Results are processed"})
  } catch (error) {
    return res.json(error.toString())
  }
})

app.get('/team-result', async (req, res) => {
  try {
    const allTeams = await Teams.find({}).select([ "uid", "teamName", "totalPoints"])
    const result = teamResults(allTeams)
    return res.json({winningTeams: result})
  } catch (error) {
    return res.json(error.toString())
  }
})


app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

run();