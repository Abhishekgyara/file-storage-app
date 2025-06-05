require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { networkInterfaces } = require('os');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Schema
const fileSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimeType: String,
  size: Number,
  uploadDate: { type: Date, default: Date.now },
  url: String,
  isOffline: { type: Boolean, default: false }
});

const File = mongoose.model('File', fileSchema);

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = '/tmp/uploads';  // Use /tmp for Vercel
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Check MongoDB connection
let isMongoConnected = false;

mongoose.connection.on('connected', () => {
  isMongoConnected = true;
  console.log('Connected to MongoDB');
});

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
  console.log('Disconnected from MongoDB');
});

// Routes
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = new File({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      isOffline: !isMongoConnected
    });

    if (isMongoConnected) {
      await file.save();
    } else {
      // Store file info in a local JSON file when offline
      const offlineFilesPath = path.join(__dirname, 'offline-files.json');
      let offlineFiles = [];
      if (fs.existsSync(offlineFilesPath)) {
        offlineFiles = JSON.parse(fs.readFileSync(offlineFilesPath));
      }
      offlineFiles.push(file);
      fs.writeFileSync(offlineFilesPath, JSON.stringify(offlineFiles, null, 2));
    }

    res.json({ message: 'File uploaded successfully', file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/files', async (req, res) => {
  try {
    let files = [];
    
    if (isMongoConnected) {
      // Get files from MongoDB
      files = await File.find().sort({ uploadDate: -1 });
      
      // Check for offline files to sync
      const offlineFilesPath = path.join(__dirname, 'offline-files.json');
      if (fs.existsSync(offlineFilesPath)) {
        const offlineFiles = JSON.parse(fs.readFileSync(offlineFilesPath));
        for (const offlineFile of offlineFiles) {
          const file = new File(offlineFile);
          await file.save();
        }
        // Clear offline files after syncing
        fs.unlinkSync(offlineFilesPath);
      }
    } else {
      // Get files from local storage when offline
      const offlineFilesPath = path.join(__dirname, 'offline-files.json');
      if (fs.existsSync(offlineFilesPath)) {
        files = JSON.parse(fs.readFileSync(offlineFilesPath));
      }
    }
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Set appropriate headers
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(filePath);
});

// Connect to MongoDB with retry
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/file-storage';

// Add error handling for MongoDB connection
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  isMongoConnected = false;
});

function connectWithRetry() {
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
  })
    .then(() => {
      console.log('Connected to MongoDB');
      isMongoConnected = true;
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
      isMongoConnected = false;
      // Retry connection after 5 seconds
      setTimeout(connectWithRetry, 5000);
    });
}

connectWithRetry();

// Start server on all network interfaces
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('\nTo use the app:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. The app will work offline after first load');
    console.log('3. All files are stored in MongoDB Atlas');
    console.log(`4. Other devices can access the app at http://${getLocalIP()}:${port}`);
  });
}

// Export the Express API
module.exports = app;

// Function to get local IP address
function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
} 