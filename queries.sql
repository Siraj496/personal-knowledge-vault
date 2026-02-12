-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notes table
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tags table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

--Create note_tags table (Many-to-Many)
CREATE TABLE note_tags (
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

INSERT INTO users (email, password)
VALUES ('testuser@example.com', 'testpassword'); -- for testing only; later use hashed password

-- Insert some sample notes for the test user
INSERT INTO notes (user_id, title, content)
VALUES 
(1, 'Learn Node.js', 'Study Express, EJS, and routing in Node.js.'),
(1, 'Study PostgreSQL', 'Practice tables, joins, and queries in Postgres.'),
(1, 'Build Knowledge Vault', 'Plan and implement the personal knowledge vault project.');

-- Insert some sample tags
INSERT INTO tags (name)
VALUES 
('nodejs'),
('postgres'),
('learning'),
('project');

-- Link notes to tags (note_tags)
-- Note 1: Learn Node.js → nodejs, learning
INSERT INTO note_tags (note_id, tag_id) VALUES (1, 1), (1, 3);

-- Note 2: Study PostgreSQL → postgres, learning
INSERT INTO note_tags (note_id, tag_id) VALUES (2, 2), (2, 3);

-- Note 3: Build Knowledge Vault → project, learning
INSERT INTO note_tags (note_id, tag_id) VALUES (3, 4), (3, 3);