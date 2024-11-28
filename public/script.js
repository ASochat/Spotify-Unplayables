
console.log("LOAD")


/////// TO DO ////////////
/////// - For the access token, just refer one big function to generate a token,
///////   and have an await function to continue the rest (this avoids repeating the functions after)
/////// - Create a refresh token, and make sure it works with another account (clemence : clemesteves@gmail.com, Hermes12!)
/////// - Load on an external website (ideally, follow the github repo, but...)
/////// - What are the news on spotify API github? When is the last commit?

/////// IDEAS ////////////
/////// - Select your playlist (just display first)
/////// - Compose your own wrapped (try out the 'all time' filter and filter music from each year, if enough music in top tracks, ideally it's just a rank)
/////// - Explicit music pie: you're a cow-boy!
/////// - International music pie: you're a globe-trotter!
/////// - Generation music pie: you're an oldie!



// Set basic variables
const appClientId = "e61711cbd130408abf2d471288b77e87";
const redirectUri = 'http://localhost:4000/'; // IMPORTANT: IT HAS TO BE A REDIRECT URI ON THE APP SETTINGS ONLINE

////// THE PROCESS WAS ABOUT CHECKING THE CODE BUT IT OUTDATES RIGHT AWAY NO USING DIRECTLY ACCESS TOKEN //////
// const params = new URLSearchParams(window.location.search);
// const userCode = params.get("code");
const accessToken = localStorage.getItem("access_token");
var postAuthorization = localStorage.getItem("post_authorization")
console.log("postAuthorization: " + postAuthorization)
console.log("accessToken: " + accessToken)

///// NORMAL CODE TO RUN - Fails because the code needs to refresh everytime, but not the access Token /////
if ((!accessToken || accessToken === 'undefined') && (!postAuthorization || postAuthorization === 'no')) {
    console.log("Auth flow");
    localStorage.setItem('post_authorization', 'yes')
    redirectToAuthCodeFlow(appClientId);
} else if (postAuthorization === 'yes') {
    console.log("Post Auth flow");
    const params = new URLSearchParams(window.location.search);
    const userCode = params.get("code");
    const accessToken = await getAccessToken(appClientId, userCode);
    localStorage.setItem('access_token', accessToken); // Store the access token
    console.log("accessToken is saved to "+accessToken)
    let postAuthorization = 'no';
    localStorage.setItem('post_authorization', "no"); // Can now connect directly with the access token
    const profile = await fetchProfile(accessToken);
    populateUI(profile);
    const tracks = await fetchTopTracks(accessToken);
    populateTracks(tracks);
    const songs = await fetchAllSongs(accessToken);
    const unplayables = filterUnplayables(await songs);
    populateUnplayables(unplayables);
} else {
    console.log("Post Access Token");
    const profile = await fetchProfile(accessToken);
    populateUI(profile);
    const tracks = await fetchTopTracks(accessToken);
    populateTracks(tracks);
    const songs = await fetchAllSongs(accessToken);
    const unplayables = filterUnplayables(await songs);
    populateUnplayables(unplayables);
}


export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:4000/");
    params.append("scope", "user-read-private user-read-email user-top-read user-library-read"); // IMPORTANT TO HAVE THE SCOPE OF WHAT WE WANT
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:4000/"); // IDEALLY, THIS SHOULD BE A VARIABLE
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded"},
        body: params,
    });

    const { access_token } = await result.json();
    return access_token;
}

const getRefreshToken = async () => {
    // refresh token that has been previously stored
    const refreshToken = localStorage.getItem('refresh_token');
    const url = "https://accounts.spotify.com/api/token";

    const payload = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId
        }),
    }
    const body = await fetch(url, payload);
    const response = await body.json();

    localStorage.setItem('access_token', response.accessToken);
    if (response.refreshToken) {
        localStorage.setItem('refresh_token', response.refreshToken);
    }
}

async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", 
        headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

async function fetchTopTracks(token) {
    const result = await fetch("https://api.spotify.com/v1/me/top/tracks", {
        method: "GET", 
        headers: { 
            'Authorization': `Bearer ${token}`,
        }
    });

    const { items } = await result.json()

    const tracks = items.slice(0, 10).map((track) => ({
        artist: track.artists.map((_artist) => _artist.name).join(', '),
        songUrl: track.external_urls.spotify,
        title: track.name,
      }))

    return tracks;
}

async function fetchAllSongs(token) {

    let offset = 1800;
    let batchSize = 50; 
    var tracks = [];
    var newTracks = [];  // Holds new batch of tracks

    while (batchSize == 50) {
        var result = await fetch("https://api.spotify.com/v1/me/tracks?market=NO&limit=50&offset="+offset, {
            method: "GET", 
            headers: { 
                'Authorization': `Bearer ${token}`,
            }
        })

        let { items } = await result.json()

        console.log(items);

        newTracks = items.slice(0, 50).map((item) => ({
            artist: item.track.artists.map((_artist) => _artist.name).join(', '),
            title: item.track.name,
            added_at: item.added_at,
            is_playable: item.track.is_playable,
          }))

        console.log(offset);

        tracks = tracks.concat(await newTracks);

        batchSize = items.length;
        offset += batchSize;
    }

    return tracks;
}

function filterUnplayables(tracks) { 
    
    let unplayables = [];

    for (var i in tracks) {
        if (!tracks[i].is_playable) {
            tracks[i].number = parseInt(i) + 1;
            unplayables.push(tracks[i]);
            // Use Object.assign(itemJSON, json) to add the number in the list
        }
    }

    return unplayables;
}
  

function populateUI(profile) {
    document.getElementById("displayName").innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar").appendChild(profileImage);
        document.getElementById("imgUrl").innerText = profile.images[0].url;
    }
    document.getElementById("id").innerText = profile.id;
    document.getElementById("email").innerText = profile.email;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url").innerText = profile.href;
    document.getElementById("url").setAttribute("href", profile.href);
    document.getElementById("imgUrl").innerText = profile.images[0]?.url ?? '(no profile image)';
}

function populateTracks(tracks) {  

    for (var i in tracks) {
        document.getElementById("track"+i+"_title").innerText = tracks[i].title;
        document.getElementById("track"+i+"_artist").innerText = tracks[i].artist;
    }

}

function populateUnplayables(tracks) {  

    // unplayablesTitles

    let output = document.getElementById("unplayablesTitles");
    let html = '';

    tracks.forEach((track, index) =>{
        console.log(track)
        html += `
            <tr>
                <td>${track.number}</td>
                <td>${track.artist}</td>
                <td>${track.title}</td>
                <td>${track.added_at}</td>
            </tr>
        `;
    })

    output.innerHTML = html;

}
  