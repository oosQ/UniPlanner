
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



        headings = container.find_all('h3')
        
        # Filter out headings that are just images (empty text)
        valid_headings = [h for h in headings if len(h.get_text(strip=True)) > 1]

        name = "Unknown"
        degree = None 
        role = "Instructor" 
        email = None
        office = None
        phone = None
        department = None
        biography = None
        
        if len(valid_headings) >= 1:
            name = valid_headings[0].get_text(strip=True)
            
        if len(valid_headings) >= 2:
            degree = valid_headings[1].get_text(strip=True)

        if len(valid_headings) >= 3:
            dept_heading = valid_headings[2]
            # Department is usually the first text component before <small> tags
            # Use stripped_strings to get separate text nodes
            text_parts = list(dept_heading.stripped_strings)
            if text_parts:
                potential_dept = text_parts[0]
                # Validate it's not a phone number or email (unlikely if it's the first part)
                if "@" not in potential_dept and not re.search(r'\d{5}', potential_dept):
                     department = potential_dept

            # Extract Contact Info (Email, Phone, Office) from the whole text of this heading
            text_content = dept_heading.get_text(" ", strip=True)
            
            # Email
            mailto = dept_heading.find('a', href=re.compile(r'^mailto:'))
            if mailto:
                email = mailto.get_text(strip=True)
            else:
                 email_match = re.search(r'[\w\.-]+@uob\.edu\.bh', text_content)
                 if email_match: email = email_match.group(0)

            # Office
            office_match = re.search(r'\bS\d{1,3}-\d{1,4}\b', text_content, re.IGNORECASE)
            if office_match:
                office = office_match.group(0)

            # Phone
            phone_match = re.search(r'(?:\+973\s?)?(\d{8})', text_content)
            if phone_match:
                phone = phone_match.group(1)
        
        # Biography extraction
        
        # Biography extraction
        # Try to find paragraphs after the headings
        # Or look for text containers
        # Strategy: Get all text from container, remove known parts? Hard.
        # Strategy: Look for specific class or just long paragraphs?
        
        # Try to find a long paragraph in the whole soup matching the container context
        # Actually often description is in fusion-builder-row-3 column 2 text
        # Let's iterate over siblings of the last h3?
        
        # Better: Search for any paragraph with > 100 chars
        paragraphs = soup.find_all('p')
        for p in paragraphs:
            text = p.get_text(strip=True)
            if len(text) > 50 and "@" not in text and "Copyright" not in text:
                 # Check if it contains known info to skip
                 if name in text and len(text) < len(name)+20: continue
                 
                 # Append to bio? or just take the longest one?
                 # Often the bio is the longest paragraph
                 if biography is None or len(text) > len(biography):
                      biography = text

        print(f"  Found: {name} | {degree} | {department} | {email}")
        
        upsert_instructor(name, email, photo_url, office, college_name, url, degree, role, phone, department, biography)

    except Exception as e:
        print(f"  Error: {e}")

def upsert_instructor(name, email, photo_url, office, college_name, profile_url, degree, role, phone, department, biography):
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
                SET email = ?, photoUrl = ?, office = ?, profileUrl = ?, college = ?, degree = ?, role = ?, phone = ?, department = ?, biography = ?
                WHERE id = ?
            """, (email, photo_url, office, profile_url, college_name, degree, role, phone, department, biography, inst_id))
        else:
            # Insert - ID is autoincrement now
            c.execute("""
                INSERT INTO Instructor (name, email, photoUrl, office, profileUrl, college, degree, role, phone, department, biography)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, email, photo_url, office, profile_url, college_name, degree, role, phone, department, biography))
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
