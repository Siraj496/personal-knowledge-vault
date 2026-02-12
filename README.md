🧠 Personal Knowledge Vault

A secure, personal knowledge vault to store, organize, and manage your notes. This project features user authentication (including Google OAuth), note CRUD operations, tagging, and a clean, responsive UI.

💡 Features

User registration & login (local + Google OAuth)

Add, edit, and delete personal notes

Tag notes for easy organization

Responsive and modern design

Secure password storage with bcrypt

PostgreSQL database backend

🛠️ Tech Stack

Backend: Node.js, Express.js

Database: PostgreSQL

Authentication: Passport.js (Local & Google OAuth)

Frontend: EJS templates, HTML5, CSS3

Other: bcrypt, express-session, dotenv

📂 Project Structure
personal-knowledge-vault/
│
├─ public/
│  └─ css/           # Stylesheets
├─ views/
│  ├─ partials/      # Header & Footer templates
│  ├─ dashboard.ejs
│  ├─ login.ejs
│  ├─ register.ejs
│  └─ add-note.ejs
├─ .env.example       # Environment variables example
├─ .gitignore
├─ package.json
├─ package-lock.json
├─ app.js             # Main server file
└─ queries.sql        # Database setup queries

⚡ Getting Started
1. Clone the repository
git clone https://github.com/Siraj496/personal-knowledge-vault.git
cd personal-knowledge-vault

2. Install dependencies
npm install

3. Create .env file

Copy .env.example to .env and add your credentials:

PORT=3000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=knowledge_vault
SESSION_SECRET=your_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

4. Set up the database

Open PostgreSQL and run the queries.sql file to create tables.

5. Start the server

npm start
Visit: http://localhost:3000

🚀 Usage

Register or login using email/password or Google account

Add new notes with optional tags

Edit or delete existing notes

View all notes in your dashboard

🔒 Security Notes

Passwords are hashed using bcrypt

Sensitive credentials are stored in .env

.env and node_modules/ are ignored in GitHub

📄 License

This project is open-source and available under the MIT License
.
