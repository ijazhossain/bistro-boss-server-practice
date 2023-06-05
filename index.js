const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5001;
const app = express();

app.use(cors())
app.use(express.json())
const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: "unauthorized access" })

        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zrkqnje.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const menuCollection = client.db('restaurantDB').collection('menu')
        const usersCollection = client.db('restaurantDB').collection('user')
        const cartCollection = client.db('restaurantDB').collection('cart')
        // admin verify
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next();
        }
        // Get JWT token
        app.post('/jwt', (req, res) => {
            const user = req.body
            // console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
            res.send({ token })
        })

        // user related API

        app.get('/users', verifyJwt, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find({}).toArray();
            res.send(result);
        })
        /* admin check */
        app.get('/users/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                res.send({ admin: 'false' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result);
        })
        app.delete('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result);
        })
        // cart related API
        app.post('/cart', async (req, res) => {
            const selectedItem = req.body;
            // console.log(selectedItem);
            const result = await cartCollection.insertOne(selectedItem)
            res.send(result)
        })
        app.get('/cart', verifyJwt, async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'porviden access' })
            }

            const query = { email: email }
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })
        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result);
        })
        // user related API
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            // console.log(newUser)
            const query = { email: newUser.email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }
            const result = await usersCollection.insertOne(newUser)
            res.send(result)
        })

        // menu related api
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        })
        app.delete('/menu/:id', verifyJwt, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await menuCollection.deleteOne(query);
            res.send(result);
        })

        // app.get('/menu/:category', async (req, res) => {
        //     const category = req.params.category;
        //     const query = { category: category }
        //     if (category === "salad" ||
        //         category === "pizza" ||
        //         category === "soup" ||
        //         category === "dessert" ||
        //         category === "offered"
        //     ) {
        //         const result = await menuCollection.find(query).toArray()
        //         res.send(result)
        //     } else {
        //         const result = await menuCollection.find({}).limit(20).toArray()
        //         res.send(result)
        //     }
        // })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Bisrto Boss Is Running');
})
app.listen(port, () => {
    console.log("Listening to port", port);
})