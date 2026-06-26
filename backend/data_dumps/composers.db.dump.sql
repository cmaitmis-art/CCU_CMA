-- Dump generated from C:\Users\AROSHA\Downloads\CC_CMA\backend\data\composers.db
-- Generation time: 2026-06-12T08:52:55.714Z


PRAGMA foreign_keys = OFF;

-- Table: composers
CREATE TABLE composers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    era TEXT,
    work TEXT,
    description TEXT
  );

-- Data for: composers
INSERT INTO 'composers' ('id', 'name', 'era', 'work', 'description') VALUES (1, 'Ludwig van Beethoven', 'Classical', 'Symphony No.5', 'Famous composer');

