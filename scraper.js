const axios = require('axios').default;
const JSSoup = require('jssoup').default;
const fs = require('fs'); 
const slugify = require('slugify');


const url = "https://quizlet.com/422971006/test-2-us-history-sc-standard-14-17-flash-cards/";

axios.get(url)
    .then( (res) => {
        let soup = new JSSoup(res.data);
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
        nam = 'testing';
        studySets.push({
            'name': nam,
            'quizletURL': url,
            'filename': title
        });

        fs.writeFileSync("./public/data/STUDY_SET_DATABASE.json", JSON.stringify(studySets, null, 4), 'utf-8');
    });
