import fetch from 'node-fetch';
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const PAGE_SIZE = 90;
const WRITE_FILE_PATH = './output/my-comments.json'


let clientSecret = "";
let clientId = "";
let redirectUrl = "";
let redditUsername = "";
let redditPassword = "";
let userAgent = "";

async function main() {
    try {
        setup();
        let isValid = validateEnvData();
        if(!isValid) { return; }

        const bearerToken = await requestBearerToken();
        if(!bearerToken) { return; }

        const completeCommentList = await getMyComments(bearerToken);

        if(completeCommentList.length > 0) {
            writeCompletedToFile(completeCommentList);
        } else {
            console.log("No comments to save");
        }

        console.log("Script Completed.");
        

    } catch(e) {
        console.log("Script failed!");
        console.log(e);
    }
}

main();

function setup() {
    console.log("Getting env data");
    clientSecret = process.env.CLIENT_SECRET;
    clientId = process.env.CLIENT_ID;
    redirectUrl = process.env.REDIRECT_URL;
    redditUsername = process.env.REDDIT_USERNAME;
    redditPassword = process.env.REDDIT_PASSWORD;
    userAgent = process.env.USER_AGENT;
    console.log("SUCCESS: Getting env data");
}

function validateEnvData() {
    console.log("Validating env data");
    let isValid = !!clientSecret && !!clientId &&
        !!redirectUrl && !!redditUsername && !!redditPassword && !!userAgent;
    if(!clientSecret) { console.log("Warning: CLIENT_SECRET is invalid"); }
    if(!clientId) { console.log("Warning: CLIENT_ID is invalid"); }
    if(!redirectUrl) { console.log("Warning: REDIRECT_URL is invalid"); }
    if(!redditUsername) { console.log("Warning: REDDIT_USERNAME is invalid"); }
    if(!redditPassword) { console.log("Warning: REDDIT_PASSWORD is invalid"); }
    if(!userAgent) { console.log("Warning: USER_AGENT is invalid"); }
    console.log(`${isValid ? 'SUCCESS' : 'FAILED'}: Validating env data`);
    return isValid;
}

async function requestBearerToken() {
    console.log("Requesting Bearer Token");
    const body = {
        "grant_type": "password", 
        "username": redditUsername, 
        "password": redditPassword,
        "redirect_url": redirectUrl,
    };

    const formBody = new URLSearchParams(Object.entries(body)).toString();

    const header = {
        "User-Agent": userAgent,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": `${formBody.length}`,
        'Authorization': 'Basic ' + Buffer.from(clientId + ":" + clientSecret).toString("base64")
    }

    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: 'post',
        body: formBody, 
        headers: header
    });
    console.log("Bearer token response code: " + response.status);
    if(response.status === 200) {
        const data = await response.json();
        const token = data['access_token'];
        console.log("SUCCESS: requestBearerToken");
        return token;
    } else {
        console.log("FAILED: requestBearerToken. Got response code: " + response.status);
        return null;
    }
}

async function getMyComments(bearerToken) {
    console.log("Getting my comments");
    let getPage = true;
    let limitRequests = false;
    let page = 0;
    let after = '';
    let completeCommentList = [];
    while(getPage && (limitRequests === false || page < 3)) {
        console.log("Getting page number: " + page);
        page++;
        let commentsResponse = await delayedGetPageOfComments(bearerToken, after);
        if(commentsResponse === null) { 
            getPage = false; 
            break;
        }

        after = getAfterString(commentsResponse);
        let pageOfComments = getCommentsJson(commentsResponse);
        if(pageOfComments.length > 0) {
            completeCommentList = completeCommentList.concat(pageOfComments);
        }
        
        getPage = pageOfComments.length === PAGE_SIZE;
    }

    console.log("Success: Got comment history. Retrieved " + completeCommentList.length + " total comments");
    return completeCommentList;
}

function getAfterString(commentsResponse) {
    if(!!commentsResponse && !!commentsResponse['data'] && !!commentsResponse['data'].after) {
        return commentsResponse['data'].after;
    } 
    return '';
}

function getCommentsJson(commentsResponse) {
    let retrieved = [];
    if(!!commentsResponse && !!commentsResponse['data'] && !!commentsResponse['data'].children && commentsResponse['data'].children.length > 0) {
        commentsResponse['data'].children.forEach(comment => {
            let commentData = comment.data;
            let reducedComment = {
                commentId: commentData.id,
                subredditId: commentData.subreddit_id,
                subredditName: commentData.subreddit,
                postTitle: commentData.link_title,
                postUrl: commentData.link_permalink,
                author: commentData.author,
                score: commentData.score,
                commentDate: commentData.created_utc,
                body: commentData.body,
            };
            retrieved.push(reducedComment);
        });    
    }
    return retrieved;
}

async function delayedGetPageOfComments(bearerToken, after) {
    const header = {
        "User-Agent": userAgent,
        'Authorization': `bearer ${bearerToken}`
    }; 

    return new Promise(function(resolve, reject) {
        setTimeout(async function() {
            const queryParams = {
                limit: `${PAGE_SIZE}`
            };
        
            if(after !== '') {
                queryParams.after = after;
            }
    
            const queryString = objToQueryString(queryParams);
    
            const response = await fetch(`https://oauth.reddit.com/user/${redditUsername}/comments?${queryString}`, {
                method: 'get',
                headers: header,
            });
            console.log("Got response code: " + response.status);
            let data = null;
            if(response.status === 200) {
                data = await response.json();
            }
            
            if(!data || !data['data'] || !data['data'].children) {
                resolve(null);
            } else {
                resolve(data);
            }
                
        }, 2400);
    });
    
}

function objToQueryString(obj) {
    const keyValuePairs = [];
    for (const key in obj) {
      keyValuePairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
    }
    return keyValuePairs.join('&');
}


async function writeCompletedToFile(myComments) {
    console.log("Writing Comments to file: ")
    const stringData = JSON.stringify(myComments);

    fs.writeFile(WRITE_FILE_PATH, stringData, (error) => {
        if(error) {
            console.log('ERROR: writeCompletedToFile');
            console.log({error});
        }
    });
    console.log("SUCCESS: Writing comments to file");
}
