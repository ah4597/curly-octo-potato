const express = require('express');
const path = require('path');
const fs = require('fs');
const url = require('url');
const axios = require('axios').default;
const JSSoup = require('jssoup').default;
const slugify = require('slugify');


const HOST = '0.0.0.0';
const PORT = 3000;

const app = express();

app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({extended:true}));
const logger = (req, res, next) => {
    /* console.log(req.method);
    console.log(req.path);
    console.log(req.query); */
    next();
}; 
app.use(logger);

let currentStudySet = "";
let currentStudySetName = "";
let studySets = JSON.parse(fs.readFileSync('./public/data/STUDY_SET_DATABASE.json'));

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

app.get('/', (req, res)=>{
    studySets = JSON.parse(fs.readFileSync('./public/data/STUDY_SET_DATABASE.json'));
    res.render('home', {
        body: "These are the currently available study sets.",
        studySets: studySets
    });
    
});

app.get('/addStudySet', (req, res)=> {
    res.render('addStudySet');
});

app.post('/addStudySet', (req, res) => {
    axios.get(req.body.url)
    .then( (response) => {
        let soup = new JSSoup(response.data);
        title = slugify(soup.find('h1').text);
        console.log(title);
        temp_list = soup.findAll('span');
        list = [];

        for (item of temp_list) {
            if (item.attrs.class == "TermText notranslate lang-en") {
                list.push(item.text);
            }
        }

        seen_terms = [];
        duplicates = [];

        data = [];

        for(let i = 0; i < list.length; i+=2) {
            if(list[i] in seen_terms) {
                duplicates.push(list[i]);
            } else {
                seen_terms.push(list[i]);
                data.push({
                    "term": list[i],
                    "definition": list[i + 1],
                    "checks": 0,
                    "alt_definitions": []
                });
            }
        }
        fs.writeFileSync("./public/data/" + title + '.json', JSON.stringify(data, null, 4), 'utf-8');
        
        const studySets = JSON.parse(fs.readFileSync("./public/data/" + 'STUDY_SET_DATABASE.json'));
        studySets.push({
            'name': req.body.name,
            'quizletURL': req.body.url,
            'filename': title
        });

        fs.writeFileSync("./public/data/STUDY_SET_DATABASE.json", JSON.stringify(studySets, null, 4), 'utf-8');

        res.redirect('/');
    })
    .catch((err) => {
        console.log(err);
        res.render('addStudySet', {body: "Something went wrong, please try again."});
    })
    .then(() => {
        console.log("Successfully added new study set.");
    });
});

app.get('/learn/:URL', (req, res) => {
    let answerMode = "sa";
    if(req.query.mode) {
        answerMode = req.query.mode;
    }
    let validURL = false;
    for(set of studySets) {
        if(req.params.URL == set.filename){
            validURL = true;
            currentStudySetName = set.name;
            currentStudySet = set.filename;
            break;
        }
    }

    if(validURL) {
        const studySet = JSON.parse(fs.readFileSync("./public/data/" + currentStudySet + ".json"));
        const termsToStudy = [];
        for(let i = 0; i < studySet.length; i++) {
            if (studySet[i].checks < 2) {
                termsToStudy.push(studySet[i]);
            }
        }

        const multipleChoices = [];

        for(let i = 0; i < 3; i++) {
            let index = 0;
            do {
                index = Math.floor(Math.random() * studySet.length);
            } while (studySet[index].term in multipleChoices);

            multipleChoices.push(studySet[index].term);
        }

        term = termsToStudy[Math.floor(Math.random() * termsToStudy.length)];
        multipleChoices.push(term.term);
        shuffle(multipleChoices);

        res.render('learn', {
            name: currentStudySetName,
            multipleChoices: multipleChoices,
            term: term,
            totalTerms: studySet.length,
            termsLearned: studySet.length - termsToStudy.length,
            answerMode: answerMode
        });
    } else {
        res.render('home', {
            status: "There was an error trying to reach that URL.",
            body: "These are the currently available study sets.",
            studySets: studySets
        });
    }
    
});

app.post('/learn/:URL', (req, res) => {
    if(req.body.answer.trim() == req.body.correctDefinition || req.body.answer.trim() == req.body.correctTerm) {
        const studySet = JSON.parse(fs.readFileSync("./public/data/" + currentStudySet + ".json"));
        for(let i = 0; i < studySet.length; i++) {
            if(studySet[i].term == req.body.correctTerm) {
                studySet[i].checks++;
                break;
            }
        }
        fs.writeFileSync("./public/data/" + currentStudySet + '.json', JSON.stringify(studySet, null, 4), 'utf-8');
        res.redirect(url.format({
            pathname: '/learn/' + req.params.URL,
            query: {
                'mode': req.body.answerMode
            }
        }));
    } else {
        res.redirect(url.format({
            pathname: '/learn/check/' + req.params.URL,
            query: {
                'answer': req.body.answer,
                'correctTerm': req.body.correctTerm,
                'correctDefinition': req.body.correctDefinition,
                'mode': req.body.answerMode
            }
        }));
    }
});

app.get('/learn/check/:URL', (req, res) => {
    res.render('learnCheck', {
        name: currentStudySetName,
        answer: req.query.answer,
        correctTerm: req.query.correctTerm,
        correctDefinition: req.query.correctDefinition,
        answerMode: req.query.mode
    });
});

app.post('/learn/check/:URL', (req, res) => {
    if(req.body.option == 'correct') {
        const studySet = JSON.parse(fs.readFileSync("./public/data/" + currentStudySet + '.json'));
        for(let i = 0; i < studySet.length; i++) {
            if(studySet[i].term == req.body.correctTerm) {
                studySet[i].checks++;
                break;
            }
        }
        fs.writeFileSync("./public/data/" + currentStudySet + '.json', JSON.stringify(studySet, null, 4), 'utf-8');
    }
    res.redirect(url.format({
            pathname: '/learn/' + req.params.URL,
            query: {
                mode: req.body.answerMode
            }
    }));
});


app.listen(PORT, HOST);
console.log("Server started; type CTRL+C to shut down.");

