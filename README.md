# File Storage App

A web application that allows users to upload and store images and PDFs using MongoDB. The application provides a modern UI for file management and generates URLs for uploaded files.

## Features

- Upload images and PDFs
- Preview uploaded files
- Generate shareable URLs
- Modern and responsive UI
- File size and upload date tracking
- Works offline with local MongoDB
- Access from any device on the same network

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (for production)
- npm or yarn package manager

## Local Development Setup

1. Clone the repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   MONGODB_URI=mongodb://localhost:27017/file-storage
   PORT=3000
   ```

4. Start the application:
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Deployment Instructions

### 1. MongoDB Atlas Setup
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Create a database user
4. Get your connection string
5. Add your IP address to the IP whitelist

### 2. Deploy to Render.com
1. Create a free account on [Render.com](https://render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the deployment:
   - Name: file-storage-app
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Add environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `PORT`: 10000 (Render will override this)

### 3. Deploy to Heroku
1. Create a free account on [Heroku](https://heroku.com)
2. Install Heroku CLI
3. Run these commands:
   ```bash
   heroku login
   heroku create your-app-name
   heroku config:set MONGODB_URI=your_mongodb_uri
   git push heroku main
   ```

## Security Considerations

- The application currently accepts only images and PDFs
- File size limits are not implemented by default
- Consider implementing user authentication for production use
- Use environment variables for sensitive information
- Enable HTTPS in production

## License

MIT

## Network Access

The application can be accessed from any device on your local network:

1. Make sure all devices are connected to the same network (same WiFi or LAN)
2. Start the application on your computer
3. Look for the "Network" URL in the console output
4. Other devices can access the app using this URL
5. All uploaded files will be stored on the host computer and accessible to all devices

## Usage

1. Click the "Choose File" button to select an image or PDF
2. Click "Upload" to upload the file
3. The uploaded file will appear in the list below
4. Click "View File" to open the file in a new tab
5. Use the generated URL to share the file

## File Storage

Files are stored in the `uploads` directory on the server, and their metadata is stored in the local MongoDB database. The application generates unique filenames to prevent conflicts. 