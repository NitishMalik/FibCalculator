const keys = require("./keys");

//Express set up
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors);
app.use(bodyParser.json());

//Postgres Client Setup
const { Pool } = require("pg");
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on("connect", () => {
  //Datatable creation
  pgClient
    .query("CREATE TABLE IF NOT EXISTS QUERIES (number INT)")
    .catch((err) => console.log(err));
});

//Redis client set up
const redis = require("redis");
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});

const redisPublisher = redisClient.duplicate();

// Express route handler
app.get("/", (req, res) => res.send("Woroking fine.."));

app.get("values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * FROM QUERIES");
  res.send(values.rows);
});

app.get("values/current", async (req, res) => {
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});

app.post("/values", async (req, res) => {
  const index = req.body.index;
  if (parseInt(index) > 20) {
    return res.status(422).send("Index is too high");
  }

  redisClient.hset("values", index, "Nothing yet!");
  redisPublisher.publish("insert", index);
  pgClient.query("INSERT INTO QUERIES(number) VALUES($1)", [index]);

  res.send({ working: true });
});

app.listen(5000, () => console.log("Server listening at 5000.."));
