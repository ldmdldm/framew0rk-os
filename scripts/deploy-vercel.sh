#!/bin/bash

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the project
echo "Building the project..."
npm run build

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

# Check deployment status
if [ $? -eq 0 ]; then
    echo "Deployment successful!"
    echo "Your app is now live on Vercel!"
else
    echo "Deployment failed. Please check the error messages above."
    exit 1
fi 