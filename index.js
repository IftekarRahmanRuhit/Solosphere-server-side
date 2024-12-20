const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 9000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iofbf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    const db = client.db("solo-db");
    const jobsCollection = db.collection("jobs");
    const bidsCollection = db.collection('bids')

    // saving a jobData in db
    app.post("/add-job", async (req, res) => {
      const jobData = req.body;
      const result = await jobsCollection.insertOne(jobData);
      // console.log(result);
      res.send(result);
    });

     // save a bid data in db
     app.post('/add-bid', async (req, res) => {
      const bidData = req.body
      // 1. if a user placed a bid already in this job
      const query = { email: bidData.email, jobId: bidData.jobId }
      const alreadyExist = await bidsCollection.findOne(query)
      console.log('If already exist-->', alreadyExist)
      if (alreadyExist)
        return res
          .status(400)
          .send('You have already placed a bid on this job!')

      // 2. Save data in bids collection
      const result = await bidsCollection.insertOne(bidData)

      // 3. Increase bid count in jobs collection
      const filter = { _id: new ObjectId(bidData.jobId) }
      const update = {
        $inc: { bid_count: 1 },
      }
      const updateBidCount = await jobsCollection.updateOne(filter, update)
      console.log(updateBidCount)
      res.send(result)
    })

    // get all bids for a specific user
    app.get('/bids/:email',  async (req, res) => {
      const isBuyer = req.query.buyer
      const email = req.params.email

      let query = {}
      if (isBuyer) {
        query.buyer = email
      } else {
        query.email = email
      }
      const result = await bidsCollection.find(query).toArray()
      res.send(result)
    })


        // update bid status
        app.patch('/bid-status-update/:id', async (req, res) => {
          const id = req.params.id
          const { status } = req.body
    
          const filter = { _id: new ObjectId(id) }
          const updated = {
            $set: { status },
          }
          const result = await bidsCollection.updateOne(filter, updated)
          res.send(result)
        })
    


    // getting all jobs data from db
    app.get("/jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });

    // getting all jobs posted by a specific user
    app.get("/jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "buyer.email": email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // deleting a job from db
    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    // getting a single job data by id from db
    app.get('/job/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query)
      res.send(result)
    })

        // saving a jobData in db
        app.put('/update-job/:id', async (req, res) => {
          const id = req.params.id
          const jobData = req.body
          const updated = {
            $set: jobData,
          }
          const query = { _id: new ObjectId(id) }
          const options = { upsert: true }
          const result = await jobsCollection.updateOne(query, updated, options)
          console.log(result)
          res.send(result)
        })





    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from SoloSphere Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
