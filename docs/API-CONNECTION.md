# Fix: "Cannot reach the API" or "Route not found"

- **"Cannot reach the API at …"** — The browser cannot connect to the API URL (backend not running or wrong `VITE_API_URL`).
- **"Route not found"** — The request reached a server but the path was not recognized. Common causes: wrong base URL (e.g. `VITE_API_URL` includes `/api` so the app requests `/api/api/projects`), or the request is hitting the frontend host instead of the backend.

The frontend calls the backend at **`VITE_API_URL`** (or `http://localhost:4000` if not set) and always adds `/api/…` (e.g. `/api/projects`). So `VITE_API_URL` must be the **origin only**, with no path: e.g. `https://your-backend.ondigitalocean.app`, not `https://your-backend.ondigitalocean.app/api`.

---

## Running locally

1. **Start the backend** (in a separate terminal):

   ```bash
   cd backend
   npm install
   npm start
   ```

   You should see: `ToDo API running on http://localhost:4000`

2. **Use the same API URL in the frontend**  
   - Default is `http://localhost:4000`, so no extra config is needed if you only run frontend + backend on the same machine.  
   - If your frontend runs elsewhere, create `frontend/.env` with:
     ```env
     VITE_API_URL=http://localhost:4000
     ```
   - Restart the frontend dev server after changing `.env`.

3. **Database**  
   Create the DB and schema if you haven’t:

   ```bash
   cd backend
   npm run db:init
   ```

   Ensure PostgreSQL is running and `backend/.env` has the correct `DATABASE_URL`.

---

## Deployed (e.g. DigitalOcean)

1. **Backend**  
   Your API service must be deployed and reachable at a public URL (e.g. `https://your-api-xxxx.ondigitalocean.app`).

2. **Frontend**  
   The frontend is built with Vite, so the API URL is baked in at **build time**:

   - In the **frontend** component (Static Site or Service), add an **environment variable**:
     - **Key:** `VITE_API_URL`
     - **Value:** your full API URL, e.g. `https://your-api-xxxx.ondigitalocean.app`  
     - No trailing slash.

   - Redeploy/rebuild the frontend after setting it so the new value is used in the build.

3. **CORS**  
   The backend must allow your frontend origin. Set `FRONTEND_URL` on the backend to your frontend URL (e.g. `https://your-app-xxxx.ondigitalocean.app`).

---

## Check what URL the app is using

The error message now includes the URL the frontend is trying to use, e.g.:

**"Cannot reach the API at http://localhost:4000. …"**

- If you see `http://localhost:4000` but the backend is not running locally, start it (see above).
- If you see `http://localhost:4000` in production, set `VITE_API_URL` on the frontend and rebuild.
- If the URL is correct but the request still fails, check firewall, CORS, and that the backend is healthy (e.g. open the API URL or `/health` in a browser).
