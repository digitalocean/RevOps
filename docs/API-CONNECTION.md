# Fix: "Cannot reach the API"

The frontend calls the backend at the URL from **`VITE_API_URL`** (or `http://localhost:4000` if not set). If you see **"Cannot reach the API at …"**, the browser cannot connect to that URL.

---

## Running locally

1. **Start the backend** (in a separate terminal):

   ```bash
   cd backend
   npm install
   npm start
   ```

   You should see: `AgileOps API running on http://localhost:4000`

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
