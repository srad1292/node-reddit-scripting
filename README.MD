# Reddit Scripting

## Reddit-Side Setup

1. Follow reddit archive documentation to setup your application. https://github.com/reddit-archive/reddit/wiki/OAuth2. You will use this to get your client secret and client id. 
2. Understand rules of API if you want to change anything: https://github.com/reddit-archive/reddit/wiki/API 


## Extra resources

1. API Documentation: https://www.reddit.com/dev/api/oauth 
2. Example Responses: https://github.com/reddit-archive/reddit/wiki/JSON

## Scripting-Side Setup

1. Clone repository 
2. Run NPM Init 
3. In root directory, where you see SAMPLE.env, create a .env 
4. Replace values with your own data 

## Existing Functionality

1. Get Your Comment History
  A. Run node reddit-user-history.js

## Notes for Adding new functionality 

1. There is a rate limit of 60 requests per minute. The functionality I have pushed avoids crossing this using delayed requests for bulk data retrieval.  There are response headers you can use to be safer about it by checking if you're going to pass the rate limit and forcing your script to wait until the given period ends. 