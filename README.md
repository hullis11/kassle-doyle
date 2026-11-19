# Steps for KASSLE startup on local browser using AWS DynamoDB for data storage.


## Prerequisites: 
    - git
    - node
    - npm
    - AWS CLI 

## Setting up AWS profile
    
    ```in terminal:
aws configure --profile harrison-kassle
    ```
    It will ask for access keys which are provided in signal

## Start up the backend
```in separate BACKEND terminal:

# Set backend file path, install dependencies
cd backend
npm ci

# Seed the DynamoDB with sample data then start the backend
node seed.js
npm.cmd start
```
    "Server is running on http://localhost:42001" should come up in the terminal

## Startup the frontend
```in a 2nd FRONTEND terminal
cd frontend
npm ci
ng serve --open
```

The browser should open the game at http://localhost:4200


    