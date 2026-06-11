export interface FallbackElective {
    code: string
    title: string
    credits: number
    type: "ME" | "GSE"
    prerequisites: string
    isMajorGpa: boolean
    electiveListType: string
}

export const FALLBACK_ELECTIVES: FallbackElective[] = [
    // List 1: ITIS Concentration Major Elective
    { code: "ITIS 467", title: "Information Security II", credits: 3, type: "ME", prerequisites: "ITIS 360", isMajorGpa: true, electiveListType: "List 1: ITIS Concentration Major Elective" },
    { code: "ITIS 468", title: "Cyber Security", credits: 3, type: "ME", prerequisites: "ITIS 360", isMajorGpa: true, electiveListType: "List 1: ITIS Concentration Major Elective" },
    { code: "ITIS 454", title: "Cloud Computing II", credits: 3, type: "ME", prerequisites: "ITIS 455", isMajorGpa: false, electiveListType: "List 1: ITIS Concentration Major Elective" },
    { code: "ITIS 455", title: "Cloud Solution Architecture", credits: 3, type: "ME", prerequisites: "ITIS 414", isMajorGpa: false, electiveListType: "List 1: ITIS Concentration Major Elective" },
    { code: "ITIS 414", title: "Business Intelligence", credits: 3, type: "ME", prerequisites: "ITIS 310", isMajorGpa: true, electiveListType: "List 1: ITIS Concentration Major Elective" },
    { code: "ITIS 415", title: "Big Data Applications and Analytics", credits: 3, type: "ME", prerequisites: "ITIS 310", isMajorGpa: true, electiveListType: "List 1: ITIS Concentration Major Elective" },

    // List 2: ITIS General Major Elective
    { code: "ITIS 417", title: "Knowledge Management", credits: 3, type: "ME", prerequisites: "ITIS 310", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 418", title: "AI Applications in Business", credits: 3, type: "ME", prerequisites: "ITIS 310", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 420", title: "Multimedia Technology and Design", credits: 3, type: "ME", prerequisites: "ITIS 333", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 422", title: "Educational Technology and e-Learning", credits: 3, type: "ME", prerequisites: "ITIS 222", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 427", title: "e-Government Concepts and Implementation", credits: 3, type: "ME", prerequisites: "ITIS 222 & ITIS 345", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 428", title: "Social Media Networks and the Society", credits: 3, type: "ME", prerequisites: "ITIS 345", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 434", title: "Computer Supported Cooperative Work", credits: 3, type: "ME", prerequisites: "ITIS 335 & ITIS 345", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 437", title: "Business Process Modelling and Analysis", credits: 3, type: "ME", prerequisites: "ITIS 451", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 440", title: "e-Marketing Strategy and Applications", credits: 3, type: "ME", prerequisites: "MKT 261 & ITIS 222", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 447", title: "Mobile Computing and Development", credits: 3, type: "ME", prerequisites: "ITIS 243", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 448", title: "IT Business Applications", credits: 3, type: "ME", prerequisites: "MKT 261 & ITIS 222", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 449", title: "Health Informatics", credits: 3, type: "ME", prerequisites: "ITIS 416", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 465", title: "IT Project Management II", credits: 3, type: "ME", prerequisites: "ITIS 265", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 469", title: "Information Systems Ethics and Cyber Laws", credits: 3, type: "ME", prerequisites: "ITIS 222", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 470", title: "Selected Topics in IT Issues", credits: 3, type: "ME", prerequisites: "ITIS 310", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },
    { code: "ITIS 496", title: "Research Methodology", credits: 3, type: "ME", prerequisites: "STAT 273 & ENGL 219", isMajorGpa: true, electiveListType: "List 2: ITIS General Major Elective" },

    // List 3: Business Elective Courses
    { code: "ACC 113", title: "Financial Accounting II", credits: 3, type: "ME", prerequisites: "ACC 112", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "ECON 140", title: "Microeconomics", credits: 3, type: "ME", prerequisites: "-----", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MGT 233", title: "Organizational Behavior", credits: 3, type: "ME", prerequisites: "MGT 230", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MGT 236", title: "Production Management", credits: 3, type: "ME", prerequisites: "MGT 230", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MGT 340", title: "Supply Chain Management", credits: 3, type: "ME", prerequisites: "MGT 230", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MGT 430", title: "Human Resources and Personal Management", credits: 3, type: "ME", prerequisites: "MGT 230", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MGT 436", title: "Management of Change", credits: 3, type: "ME", prerequisites: "MGT 230", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MGT 448", title: "Organization Theory and Design", credits: 3, type: "ME", prerequisites: "MGT 230", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MKT 263", title: "Promotion Management", credits: 3, type: "ME", prerequisites: "MKT 261", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MKT 264", title: "Intermediate Marketing", credits: 3, type: "ME", prerequisites: "MKT 261", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MKT 268", title: "Personal Selling", credits: 3, type: "ME", prerequisites: "MKT 261", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MKT 364", title: "Advertising Management", credits: 3, type: "ME", prerequisites: "MKT 261", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MKT 367", title: "Marketing Channels", credits: 3, type: "ME", prerequisites: "MKT 261", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MKT 370", title: "Customer Relationship Marketing", credits: 3, type: "ME", prerequisites: "MKT 261", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MKT 461", title: "Consumer Behavior", credits: 3, type: "ME", prerequisites: "MKT 261", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MKT 463", title: "International Marketing", credits: 3, type: "ME", prerequisites: "MKT 261", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MKT 465", title: "Services Marketing", credits: 3, type: "ME", prerequisites: "MKT 261", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },
    { code: "MKT 468", title: "Pricing Strategies", credits: 3, type: "ME", prerequisites: "MKT 261", isMajorGpa: false, electiveListType: "List 3: Business Elective Courses" },

    // General Studies Elective Courses List (GSE)
    { code: "ARAB 141", title: "Modern Arabic Literature", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "ARAB 242", title: "Arabic Poetry In The Renaissance Period", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "ART 133", title: "Fundamentals of Music and Its Appreciation", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "ART 141", title: "Drawing and Painting", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "ART 221", title: "Traditional Music of Bahrain", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "CHL 101", title: "Introduction to Chinese Language", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "EDAR 126", title: "Playing on Piano and Org 1", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "EDPS 144", title: "Psychology of Learning and Memory", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "EDTC 100", title: "Teaching and Learning Technology", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "ENGL 130", title: "Introduction to Literature", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "FREN 141", title: "French I", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "GERM 101", title: "Introduction to German", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "HISTO 212", title: "Contemporary History of The Arab World", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "HISTO 281", title: "Landmarks of Islamic Civilisation", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "ISLM 114", title: "Quranic Sciences", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "ISLM 136", title: "Biography of The Prophet", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "ISLM 141", title: "Introduction to Shari'a", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "ISLM 252", title: "Islamic Doctrine", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "JAPN 101", title: "Japanese Level I", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "KL 101", title: "Korean Language", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "TL 101", title: "Turkish Language", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "LAW 101", title: "Introduction to Legal Studies", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "LAW 102", title: "History of Law", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "LAW 106", title: "Constitutional Law I", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "PSYC 103", title: "Introduction to Psychology", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "PSYC 120", title: "Psychology of Marriage", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "PSYC 211", title: "Educational Psychology", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "SOCIO 161", title: "Introduction to Sociology", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "SOCIO 181", title: "Introduction to Anthropology", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "SOCIO 191", title: "Citizenship, Identity and Globalization", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
    { code: "SOCIO 226", title: "Sociology of Arabian Gulf", credits: 3, type: "GSE", prerequisites: "None", isMajorGpa: false, electiveListType: "General Studies Elective Courses List" },
]
