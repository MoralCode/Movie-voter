
let user = { username: 'foo', password: 'secret' }

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

document.getElementById("online-search").onclick = () => {
    movieDBSearch(document.getElementById("name-input").value)
}

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

// This function takes a movie listed in the database, and prints it's associated info onto the table.
function listMovies(movieSnapshot) {
    var name = movieSnapshot.name;
    var link = movieSnapshot.link;
    var votes = movieSnapshot.votes;
    var id = movieSnapshot._id;
    
    var disablevote = checkVoteStatus(movieSnapshot, getUniqueUsername()) != 0

    // We create a new row to append the information associated wth the current .
    var newRow = $('<tr>')

    // We place the necessary information into individual cells, and append each to the new row.
    var nameCell = $('<td scope="row">')
    const linkelem = document.createElement("a")
    linkelem.href = link
    linkelem.innerText = name
    nameCell.append(linkelem);
    newRow.append(nameCell);
    
    
    var votesCell = $('<td scope="row">')
    votesCell.text(votes.length);
    newRow.append(votesCell);
    
    var castCell = $('<td scope="row">')
    var button = $(`<button class="btn btn-success vote-button" data-key=${id} ${disablevote? "disabled": ""}>`)
    button.text("VOTE!")
    castCell.append(button)
    newRow.append(castCell);

    // We append the new row to the table.   
    $('#movies-here').append(newRow);
};

// This function is used to render the list of movies without making changes to firebase
function render(moviesObject) {
    // We must empty the table out since we will work through the entire database again.
    $('#movies-here').empty();
    moviesObject.sort(function (a, b) {
        return b.votes.length-a.votes.length;
    });

    // We then iterate through the movies on the list and add each batch of information to the table
    for (key in moviesObject) {
        listMovies(moviesObject[key]);
    }
}

    
// This function calls the list movie function when a change is made to the database.
// When the page loads, this function is run once automatically, and filters through every single movie as though it was newly added. 
hoodie.on("child_added", function(snapshot) {
    listMovies(snapshot.val());
});

// This function is run when users want to add movie information to the list.
// It pushes the movie into the database, triggering the child added function which sprints them on the page.
$("#submit").on("click", function(event) {
    event.preventDefault();
    
    submit(false)
    
});

function submit(vote_for) {
    // Here we grab the user data from the forms on page and stores them as variables.
    var name = $('#name-input').val();
    var link = $('#link-input').val();

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
}

$(document).on("click", ".vote-button", function(event) { 
    event.preventDefault();

    var key = $(this).data("key")
    const usn = getUniqueUsername()
    hoodie.store.find(key).then((item)=> {
        switch (checkVoteStatus(item, usn)) {
            case -1:
                console.log("An error occurred. you are likely not logged in")
                break;
            case 0:
                item.votes.push(usn)
                hoodie.store.update(item)
                break;
            case 1:
                console.log("you already voted for this")
                break;
            default:
                console.log("unknown state")
        }
        
    })
})

function movieDBSearch(term) {
    window.open("https://www.themoviedb.org/search?query=" + encodeURIComponent(term), '_blank');
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

setInterval(() => {
    hoodie.store.sync()
}, 60000)