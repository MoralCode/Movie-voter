
let user = { username: 'foo', password: 'secret' }

const stats = {votesmade: 0, moviesposted:0}

hoodie.account.signUp(user).catch((e) => {
    //do nothing. thisjust gaurantees the user exists 
    console.log(e)
})

hoodie.account.get('session').then(function (session) {
    if (!session) {
        // user is signed out
        hoodie.account.signIn(user)
        console.log("signing into hoodie as " + user.username)
    } else {
        console.log("signed into hoodie")
    }
})

function loadAndRenderItems() {
    hoodie.store.findAll().then(render)
}

generateLoginBox()
/* render items initially on page load */
loadAndRenderItems()

hoodie.store.on('change', loadAndRenderItems)
hoodie.store.on('clear', function () {
    render([])
})

function getUniqueUsername() {
    return localStorage.getItem('diy-username');
}

function setUniqueUsername(username) {
    localStorage.setItem('diy-username', username);
}


function generateLoginBox() {
    const loginPrompt = document.getElementById("login")
    const loginButton = document.getElementById("login-submit")
    const usn = getUniqueUsername()

    if (usn) {
        console.log("logged in as " + usn)
        const p = document.createElement("p")
        p.innerText = "Hello " + usn + "!"
        loginPrompt.innerHTML = '';
        loginPrompt.appendChild(p);
        
        // loginButton.innerText = "Log Out"
        loginButton.style.display = "none"
    } else {
        console.log("not logged in")
        const inp = document.createElement("input") 
        inp.type = "text"
        inp.placeholder = "Enter a username"
        loginPrompt.innerHTML = '';
        loginPrompt.appendChild(inp);

        loginButton.innerText = "Log In"
        loginButton.style.display = "initial"
        loginButton.onclick = () => {
            console.log("setting username to " + inp.value)
            setUniqueUsername(inp.value)
            // regen page on login
            generateLoginBox()
            loadAndRenderItems()
        }
    }
}


function newTableData(){
    const h = document.createElement("td")
    h.scope = "row"
    return h
}

// This function takes a movie listed in the database, and prints it's associated info onto the table.
function listMovies(movieSnapshot) {
    var name = movieSnapshot.name;
    var link = movieSnapshot.link;
    var votes = movieSnapshot.votes;
    var id = movieSnapshot._id;
    
    var disablevote = checkVoteStatus(movieSnapshot, getUniqueUsername()) != 0

    // We create a new row to append the information associated wth the current .
    var newRow = document.createElement("tr")


    // We place the necessary information into individual cells, and append each to the new row.
    var nameCell = newTableData()

    if (isValidUrl(link)) {    
        const linkelem = document.createElement("a")
        linkelem.href = link
        linkelem.innerText = name
        nameCell.appendChild(linkelem);
    } else {
        const spanelem = document.createElement("span")
        spanelem.innerText = name
        nameCell.appendChild(spanelem);
    }
    newRow.appendChild(nameCell);
    
    
    var votesCell = newTableData()
    votesCell.innerText = votes.length;
    newRow.appendChild(votesCell);
    
    var castCell = newTableData()
    var button = document.createElement("button")
    button.classList.add("btn", "btn-success", "vote-button")
    button.dataset.key = id
    if (disablevote) {
        button.disabled = true
    }
    button.innerText = "VOTE!"
    button.onclick = onvote
    castCell.appendChild(button)
    newRow.appendChild(castCell);

    // We append the new row to the table.   
    document.getElementById("movies-here").appendChild(newRow);
};

// This function is used to render the list of movies without making changes to firebase
function render(moviesObject) {
    // We must empty the table out since we will work through the entire database again.
    document.getElementById("movies-here").innerHTML = ""
    moviesObject.sort(function (a, b) {
        return b.votes.length-a.votes.length;
    });

    // We then iterate through the movies on the list and add each batch of information to the table
    for (key in moviesObject) {
        listMovies(moviesObject[key]);
    }
}


function trackNewVote() {
    stats.votesmade += 1
    _paq.push(['setCustomVariable', 1, "Votes", stats.votesmade, "page"]);
}

function trackNewSubmission() {
    stats.moviesposted += 1
    _paq.push(['setCustomVariable', 2, "Suggestions", stats.moviesposted, "page"]);
}
    
// This function calls the list movie function when a change is made to the database.
// When the page loads, this function is run once automatically, and filters through every single movie as though it was newly added. 
hoodie.on("child_added", function(snapshot) {
    listMovies(snapshot.val());
});

// This function is run when users want to add movie information to the list.
// It pushes the movie into the database, triggering the child added function which sprints them on the page.
document.getElementById("submit").onclick = function(event) {
    event.preventDefault();
    
    submit(false)
    
}

document.getElementById("submit-vote").onclick = function (event) {
    event.preventDefault();

    submit(true)

};


function submit(vote_for) {
    // Here we grab the user data from the forms on page and stores them as variables.
    var name = document.getElementById("name-input").value;
    var link = document.getElementById("link-input").value;

    // This if statement ensures that none of the forms were left empty.        
    if (name != "") {

        //If none of the forms were empty, the data is pushed to firebase.
        addMovie(name, link, vote_for)

        // $('.form-control').val('');
    };
}

function addMovie(name, link, vote_for){
    const username = getUniqueUsername()
    hoodie.store.add({
        name: name,
        link: link,
        votes: (vote_for && username)? [username]: [],
        id: Math.floor(Math.random()*100000)
    });
    trackNewSubmission();
}

function onvote(event) {
    event.preventDefault();

    var key = event.target.getAttribute("data-key")
    const usn = getUniqueUsername()
    hoodie.store.find(key).then((item)=> {
        switch (checkVoteStatus(item, usn)) {
            case -1:
                console.log("An error occurred. you are likely not logged in")
                break;
            case 0:
                item.votes.push(usn)
                hoodie.store.update(item)
                trackNewVote();
                break;
            case 1:
                console.log("you already voted for this")
                break;
            default:
                console.log("unknown state")
        }
        
    })
}

function checkVoteStatus(item, username) {
    if (!username) {
        return -1
    } else if (item.votes.includes(username)) {
        return 1
    } else {
        return 0
    }
}

const isValidUrl = (url) => {
    try {
        new URL(url);
    } catch (e) {
        console.error(e);
        return false;
    }
    return true;
};


setInterval(() => {
    hoodie.store.sync()
}, 60000)