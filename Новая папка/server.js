const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/celestial_store', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  balance: { type: Number, default: 0 },
});

const productSchema = new mongoose.Schema({
  title: String,
  desc: String,
  price: Number,
  fileUrl: String,
  fileContent: String,
});

const reviewSchema = new mongoose.Schema({
  username: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Review = mongoose.model('Review', reviewSchema);

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ error: 'User already exists' });
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();
  res.json({ message: 'Registered successfully' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });
  res.json({ message: 'Logged in', balance: user.balance });
});

app.post('/api/topup', async (req, res) => {
  const { username, amount } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.balance += amount;
  await user.save();
  res.json({ balance: user.balance });
});

app.get('/api/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.post('/api/purchase', async (req, res) => {
  const { username, productId } = req.body;
  const user = await User.findOne({ username });
  const product = await Product.findById(productId);
  if (!user || !product) return res.status(404).json({ error: 'Not found' });
  if (user.balance < product.price) return res.status(400).json({ error: 'Insufficient funds' });
  user.balance -= product.price;
  await user.save();
  res.json({ message: 'Purchase successful', fileUrl: product.fileUrl || null, fileContent: product.fileContent || '', balance: user.balance });
});

app.post('/api/review', async (req, res) => {
  const { username, text } = req.body;
  const review = new Review({ username, text });
  await review.save();
  res.json({ message: 'Review submitted' });
});

app.get('/api/reviews', async (req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 });
  res.json(reviews);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
