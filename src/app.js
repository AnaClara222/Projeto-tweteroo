import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import joi from "joi";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());

dotenv.config();

//Inicia a conexão com o Mongo
const mongoClient = new MongoClient(process.env.DataBase_URL);
let db;

async function connectMongo() {
    try {
        await mongoClient.connect();
        db = mongoClient.db()
        console.log("Conectadoo ao MongoDB!");
    } catch (err) {
        console.error("Erro ao conectar ao MongoDB!", err.message);
    }
}
connectMongo();

const userSchema = joi.object({
    username: joi.string().min(3).required(),
    avatar: joi.string().uri().required(),
})

const tweetSchema = joi.object({
    username: joi.string().required(),
    tweet: joi.string().required(),
})

// 1º POST (/sign-up)
app.post("/sign-up", async (req, res) => {
    const { username, avatar } = req.body;

    const validation = userSchema.validate(
        { username, avatar },
        { abortEarly: false }
    )

    if (validation.error) {
        const erros = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(erros);
    }

    try {
        const existingUser = await db.collection("users").findOne({ username });
        if (!existingUser) {
            await db.collection("users").insertOne({ username, avatar });
            return res.status(201).send("Usuário cadastrado com sucesso!");
        }
        res.status(201).send("Bem-vindo de volta!");
    } catch (err) {
        res.status(500).send("Erro ao salvar usuário!");
        console.error(err);
    }
});

// 2º GET (/tweets)
app.get("/tweets", async (req, res) => {
    try {
        const tweets = await db.collection("tweets").find().sort({ _id: -1 }).toArray()

        const tweetsComAvatar = [];

        for (let i = 0; i < tweets.length; i++) {
            const tweet = tweets[i];
            const user = await db.collection("users").findOne({ username: tweet.username })

            tweetsComAvatar.push({
                _id: tweet._id,
                username: tweet.username,
                tweet: tweet.tweet,
                avatar: user ? user.avatar : null
            })
        }

        res.json(tweetsComAvatar)
    } catch (err) {
        res.status(500).send(err.message);
    }
})

// 3º POST (/tweets)
app.post("/tweets", async (req, res) => {
    const { tweet, username } = req.body;

    const validation = tweetSchema.validate(
        { username, tweet },
        { abortEarly: false }
    )

    if (validation.error) {
        const erros = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(erros);
    }

    try {
        const tweets = await db.collection("tweets").insertOne({ username, tweet })
        res.status(201).send("Tweet postado com sucesso!")
    } catch (err) {
        res.status(500).send("Erro ao postar Tweet!")
    }
})

// 4º PUT (/tweets/:id)
app.put("/tweets/:id", async (req, res) => {
    const { id } = req.params;
    const { username, tweet } = req.body;

    const validation = tweetSchema.validate(
        { username, tweet },
        { abortEarly: false }
    )

    if (validation.error) {
        const erros = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(erros);
    }

    try {
        const resultado = await db.collection("tweets").updateOne(
            { _id: new ObjectId(id) },
            { $set: { tweet, username } }
        )
        if (resultado.matchedCount === 0) {
            return res.status(404).send("Tweet não enontrado")
        }
        res.status(200).send("Tweet atualizado com sucesso!")
    } catch (err) {
        res.status(500).send("Erro ao atualizar tweet")
        console.error(err)
    }
})

// 5º DELETE (/tweets/:id)
app.delete("/tweets/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const resultado = await db.collection("tweets").deleteOne({ _id: new ObjectId(id) })
        if (resultado.deleteCount === 0) {
            return res.status(404).send("Tweet não enontrado")
        }
        res.status(200).send("Tweet deletado com sucesso")
    } catch (err) {
        res.status(500).send("Erro ao deletar tweet")
        console.error(err)
    }
})

app.listen(process.env.PORT || 5000, () => {
    console.log(`Rodando na porta ${process.env.PORT || 5000}`);
})
