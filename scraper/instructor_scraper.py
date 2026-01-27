
import requests
from bs4 import BeautifulSoup
import sqlite3
import os
import re

# Configuration
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'prisma', 'dev.db')
COLLEGES = {
    # 'CAS': 'http://cas.uob.edu.bh',
    # 'Arts': 'http://arts.uob.edu.bh',
    # 'Business': 'http://cob.uob.edu.bh',
    # 'Engineering': 'http://engineering.uob.edu.bh',
    'IT': 'http://cit.uob.edu.bh',
    # 'Law': 'http://law.uob.edu.bh',
    # 'Science': 'http://science.uob.edu.bh'
}

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def scrape_college(name, base_url):
    print(f"--- Scraping {name} ({base_url}) ---")
    faculty_url = f"{base_url}/faculty/"
    
    try:
        response = requests.get(faculty_url, timeout=10)
        if response.status_code != 200:
            print(f"Failed to fetch {faculty_url} (Status: {response.status_code})")
            return

        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all profile links
        links = set()
        for a in soup.find_all('a', href=True):
            href = a['href']
            if 'faculty-profile' in href and 'faculty=' in href:
                if href.startswith('http'):
                    links.add(href)
                else:
                    if href.startswith('/'):
                         links.add(f"{base_url}{href}")
                    else:
                         links.add(f"{base_url}/{href}")
        
        print(f"Found {len(links)} profiles.")
        
        for link in links:
            scrape_profile(link, name)

    except Exception as e:
        print(f"Error scraping {name}: {e}")

def scrape_profile(url, college_name):
    print(f"Visiting {url}...")
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"  Failed (Status: {response.status_code})")
            return

        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 1. Target the correct row
        container = soup.find(class_='fusion-builder-row-3')
        if not container:
             container = soup.find(class_='fusion-builder-row-2')
        if not container:
             print("  Could not find info container")
             return

        # 2. Extract Photo (Col 1)
        photo_tag = container.find('img')
        photo_url = photo_tag['src'] if photo_tag else None

        # 3. Extract Text Info (Col 2)
        headings = container.find_all('h3')
        name = "Unknown"
        degree = None # Mapped from HTML Title
        role = "Instructor" # Hardcoded per user request example or logic
        email = None
        office = None
        phone = None
        
        if len(headings) >= 1:
            name = headings[0].get_text(strip=True)
            
        if len(headings) >= 2:
            degree = headings[1].get_text(strip=True) # "Assistant Professor" etc

        if len(headings) >= 3:
            contact_block = headings[2]
            text_content = contact_block.get_text(" ", strip=True)
            
            # Email
            mailto = contact_block.find('a', href=re.compile(r'^mailto:'))
            if mailto:
                email = mailto.get_text(strip=True)
            else:
                 email_match = re.search(r'[\w\.-]+@uob\.edu\.bh', text_content)
                 if email_match: email = email_match.group(0)

            # Office: S followed by digit, dash, digits
            office_match = re.search(r'\bS\d{1,3}-\d{1,4}\b', text_content, re.IGNORECASE)
            if office_match:
                office = office_match.group(0)

            # Phone: 8 digits
            # Regex: look for sequence of 8 digits, maybe spaced? User said "eight number only" ex: 17290293
            # HTML usually has +973 17...
            phone_match = re.search(r'(?:\+973\s?)?(\d{8})', text_content)
            if phone_match:
                phone = phone_match.group(1)

        print(f"  Found: {name} | {degree} | {role} | {email} | {office} | {phone}")
        
        upsert_instructor(name, email, photo_url, office, college_name, url, degree, role, phone)

    except Exception as e:
        print(f"  Error: {e}")

def upsert_instructor(name, email, photo_url, office, college_name, profile_url, degree, role, phone):
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Check by name
        c.execute("SELECT id FROM Instructor WHERE name = ?", (name,))
        result = c.fetchone()
        
        if result:
            inst_id = result['id']
            # Update
            c.execute("""
                UPDATE Instructor 
                SET email = ?, photoUrl = ?, office = ?, profileUrl = ?, college = ?, degree = ?, role = ?, phone = ?
                WHERE id = ?
            """, (email, photo_url, office, profile_url, college_name, degree, role, phone, inst_id))
        else:
            # Insert - ID is autoincrement now
            c.execute("""
                INSERT INTO Instructor (name, email, photoUrl, office, profileUrl, college, degree, role, phone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, email, photo_url, office, profile_url, college_name, degree, role, phone))
            print(f"  Inserted new record for {name}")
            
        conn.commit()
    except Exception as e:
        print(f"  DB Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        exit(1)
        
    for name, url in COLLEGES.items():
        scrape_college(name, url)
