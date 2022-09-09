# This program will scrape a quizlet URL and get all the terms and definitions from the url inputted.

from urllib.request import urlopen, Request
from bs4 import BeautifulSoup
from slugify import slugify
import json


url = str(input("Enter quizlet URL: "))
name = str(input("What to name this study set? "))
req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    request_page = urlopen(req)
    page_html = request_page.read()
    request_page.close()
except Exception as e:
    print(url)
    print(e)
    exit()

soup = BeautifulSoup(page_html, 'html.parser')
# May need to update this to be more thorough? But from the couple of pages I visited, it seems like only 1 <h1> exists, and it's the title.
title = slugify(soup.find('h1').text)

temp_list = [tag.text for tag in soup.find_all('span', class_="TermText notranslate lang-en")]

seen_terms = []
duplicates = []

# If there are duplicate entries, this will only keep the "first" one.
data = []
for i in range(0, len(temp_list), 2):
    if temp_list[i] in seen_terms:
        duplicates.append(temp_list[i])
    else:
        seen_terms.append(temp_list[i])
        data.append({
            "term" : temp_list[i],
            "definition": temp_list[i + 1],
            "checks" : 0,
            "alt_definitions": []
        })

#terms = {temp_list[i]: temp_list[i + 1] for i in range(0, len(temp_list), 2)}

with open(f'./public/data/{title}.json', 'w', encoding='utf-8') as f:
    f.write(json.dumps(data, indent=4)) 
    print(f"\nSuccessfully extracted {len(data)} terms.")
    print("Duplicates found for term(s): ")
    for i in range(0, len(duplicates)):
        print(duplicates[i])

data = []

with open('./public/data/STUDY_SET_DATABASE.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    data.append({
        'name': name,
        'quizletURL': url,
        'filename': title
    })

with open('./public/data/STUDY_SET_DATABASE.json', 'w', encoding='utf-8') as f:
    f.write(json.dumps(data, indent=4))

