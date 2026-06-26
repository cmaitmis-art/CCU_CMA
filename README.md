# CMA CC Full Stack Project

This project includes a Node.js backend with Express and SQLite, plus a React frontend built with Vite.

## Backend

1. Open the `backend` folder.
2. Run `npm install`.
3. Run `npm start`.

The backend runs on `http://localhost:3001` by default and exposes:
- `GET /api/composers`
- `GET /api/composers/:id`
- `POST /api/composers`
- `PUT /api/composers/:id`
- `DELETE /api/composers/:id`

## Frontend

1. Open the `frontend` folder.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the Vite URL shown in the terminal.

## Notes

- The SQLite database is created automatically in `backend/data/composers.db`.
- The frontend uses `frontend/.env` to point to the backend API.
